// src/services/telegramBot.service.ts
import TelegramBot from "node-telegram-bot-api";
import { CandidateService } from "../services/candidate.service";
import { QuestionSetService } from "../services/questionSet.service";
import { ResumeService } from "./resume.service";
import { Candidate, CandidateDocument } from "../models/candidate.model";
import { JobDescription } from "../models";
import { IQuestion, IQuestionSet } from "../types";
import { ValidationHelper } from "../utils/validation";
import mongoose, { SortOrder } from "mongoose";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface BotConfig {
  token: string;
  uploadsDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export class TelegramHiringBotService {
  private bot: TelegramBot;
  private config: BotConfig;

  constructor() {
    this.config = {
      token: process.env.TELEGRAM_BOT_TOKEN || "8309639217:AAEQwAu_3zsjwzOK2GIQUNV3_GONfc8-GsI",
      uploadsDir: 'uploads/resumes/',
      maxFileSize: 20 * 1024 * 1024, // 20MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: ['.pdf', '.doc', '.docx']
    };

    this.bot = new TelegramBot(this.config.token, { polling: true });
    this.init();
  }

  private init() {
    this.ensureUploadDir();
    this.setupHandlers();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.config.uploadsDir)) {
      fs.mkdirSync(this.config.uploadsDir, { recursive: true });
    }
  }

  private setupHandlers() {
    const handlers: [RegExp, (msg: TelegramBot.Message, match: RegExpExecArray | null) => void][] = [
      [/\/start(?:\s+(.+))?/, this.handleStart.bind(this)],
      [/\/restart/, this.handleRestart.bind(this)],
      [/\/status/, this.handleStatus.bind(this)],
      [/\/jobs/, this.handleListJobs.bind(this)],
      [/\/upload/, this.handleUploadCommand.bind(this)],
      [/\/applications/, this.handleMyApplications.bind(this)]
    ];

    handlers.forEach(([pattern, handler]) => {
      this.bot.onText(pattern, handler);
    });

    this.bot.on("document", this.handleDocument.bind(this));
    this.bot.on("callback_query", this.handleCallbackQuery.bind(this));
    this.bot.on("message", this.handleMessage.bind(this));
  }

  private async safeExecute<T>(
    operation: () => Promise<T>,
    chatId: number,
    errorMessage = '❌ An error occurred. Please try again.'
  ): Promise<T | void> {
    try {
      return await operation();
    } catch (error) {
      console.error('Bot operation error:', error);
      this.bot.sendMessage(chatId, errorMessage);
    }
  }

  private async getActiveCandidate(telegramId: string, prioritizeIncomplete = true) {
    const sortOrder: { [key: string]: SortOrder } = prioritizeIncomplete
      ? { isCompleted: 1, updatedAt: -1 }
      : { updatedAt: -1 };

    return Candidate.findOne({
      telegramId,
      $or: [{ isCompleted: false }, { isCompleted: true }]
    }).sort(sortOrder);
  }

  private async handleMyApplications(msg: TelegramBot.Message) {
    await this.safeExecute(async () => {
      const telegramId = msg.from?.id.toString() || "";
      const applications = await Candidate.find({ telegramId })
        .populate({ path: 'questionSetId', populate: { path: 'jobId', model: 'JobDescription' }})
        .sort({ createdAt: -1 });

      if (!applications?.length) {
        return this.bot.sendMessage(msg.chat.id, 
          "📋 You haven't applied for any jobs yet.\n\nUse /jobs to see available positions!");
      }

      const message = this.buildApplicationsMessage(applications);
      await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
    }, msg.chat.id, '❌ Error fetching applications.');
  }

  private buildApplicationsMessage(applications: any[]): string {
    let message = "📋 *Your Job Applications*\n\n";
    
    applications.forEach((app, i) => {
      const questionSet = app.questionSetId as any;
      const job = questionSet?.jobId;
      const status = app.isCompleted 
        ? "✅ Completed" 
        : `⏳ In Progress (${app.currentStep}/${questionSet?.questions.length || 0})`;
      
      const jobTitle = job ? `${job.title} at ${job.company}` : questionSet?.title || "Unknown Job";
      const appliedDate = app.createdAt.toLocaleDateString();
      
      message += `${i + 1}. **${jobTitle}**\n`;
      message += `   Status: ${status}\n`;
      message += `   Applied: ${appliedDate}\n\n`;
    });
    
    return message + "💡 Use /status to continue an incomplete application\n📄 Use /jobs to apply for more positions";
  }

  private async triggerResumeProcessing(candidate: CandidateDocument, questionSet: IQuestionSet): Promise<boolean> {
    try {
      const { resumeFilePath, resumeFileName } = candidate.responses;
      if (!resumeFilePath || !resumeFileName) return false;

      const job = await JobDescription.findById(questionSet.jobId);
      if (!job?.hrEmail) return false;

      const resumeService = new ResumeService();
      await resumeService.scanResume(
        resumeFilePath,
        resumeFileName,
        { jobId: questionSet.jobId.toString() },
        candidate._id.toString()
      );
      
      console.log(`[Resume Processing] Email sent to ${job.hrEmail} for candidate ${candidate.telegramId}`);
      return true;
    } catch (error) {
      console.error('[Resume Processing Error]:', error);
      return false;
    }
  }

  private async handleUploadCommand(msg: TelegramBot.Message) {
    await this.safeExecute(async () => {
      const candidate = await this.getActiveCandidate(msg.from?.id.toString() || "");
      
      if (!candidate) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ Please apply for a job first using /jobs to begin your application.");
      }

      const uploadMessage = 
        "📄 *Resume Upload*\n\n" +
        "Please send your resume as a document. Accepted formats:\n" +
        "• PDF (.pdf)\n• Microsoft Word (.doc, .docx)\n\n" +
        "📁 Maximum file size: 20MB\n\n" +
        "💡 Just drag and drop your file or use the attachment button!\n\n" +
        "📋 This resume will be associated with your most recent application.";

      await this.bot.sendMessage(msg.chat.id, uploadMessage, { parse_mode: "Markdown" });
    }, msg.chat.id);
  }

  private validateFile(document: TelegramBot.Document): { isValid: boolean; error?: string } {
    const fileExtension = path.extname(document.file_name || '').toLowerCase();
    
    if (!this.config.allowedMimeTypes.includes(document.mime_type || '') && 
        !this.config.allowedExtensions.includes(fileExtension)) {
      return { isValid: false, error: "❌ Invalid file format. Please upload PDF, DOC, or DOCX files only." };
    }

    if (document.file_size && document.file_size > this.config.maxFileSize) {
      return { isValid: false, error: "❌ File too large. Please upload a file smaller than 20MB." };
    }

    return { isValid: true };
  }

  private async handleDocument(msg: TelegramBot.Message) {
    await this.safeExecute(async () => {
      const document = msg.document;
      if (!document) return;

      const candidate = await this.getActiveCandidate(msg.from?.id.toString() || "");
      if (!candidate) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ Please apply for a job first using /jobs to begin your application.");
      }

      const validation = this.validateFile(document);
      if (!validation.isValid) {
        return this.bot.sendMessage(msg.chat.id, validation.error!);
      }

      const processingMsg = await this.bot.sendMessage(msg.chat.id, "⏳ Processing your resume...");
      
      try {
        await this.processFileUpload(document, candidate, msg.chat.id);
        await this.bot.deleteMessage(msg.chat.id, processingMsg.message_id);
      } catch (error) {
        await this.bot.deleteMessage(msg.chat.id, processingMsg.message_id);
        throw error;
      }
    }, msg.chat.id, '❌ Error processing resume. Please try again.');
  }

  private async processFileUpload(document: TelegramBot.Document, candidate: CandidateDocument, chatId: number) {
    const fileLink = await this.bot.getFileLink(document.file_id);
    const response = await fetch(fileLink);
    
    if (!response.ok) throw new Error('Failed to download file');

    const fileExtension = path.extname(document.file_name || '').toLowerCase();
    const uniqueFilename = `${uuidv4()}-${Date.now()}${fileExtension}`;
    const filePath = path.join(this.config.uploadsDir, uniqueFilename);

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    // Update candidate
    Object.assign(candidate.responses, {
      resumeFileName: document.file_name || uniqueFilename,
      resumeFilePath: filePath,
      resumeUploadedAt: new Date().toISOString()
    });
    candidate.updatedAt = new Date();
    await candidate.save();

    await this.sendUploadSuccessMessage(document, candidate, chatId);
  }

  private async sendUploadSuccessMessage(document: TelegramBot.Document, candidate: CandidateDocument, chatId: number) {
    const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
    const job = questionSet ? await JobDescription.findById(questionSet.jobId) : null;
    const jobTitle = job ? `${job.title} at ${job.company}` : questionSet?.title || "Unknown Job";

    let message = 
      "✅ *Resume Uploaded Successfully!*\n\n" +
      `📋 Application: ${jobTitle}\n` +
      `📄 File: ${document.file_name}\n` +
      `📏 Size: ${this.formatFileSize(document.file_size || 0)}\n` +
      `📅 Uploaded: ${new Date().toLocaleDateString()}\n\n`;

    if (candidate.isCompleted && questionSet) {
      const emailSent = await this.triggerResumeProcessing(candidate, questionSet);
      message += emailSent 
        ? "📧 Your resume has been sent to our HR team for review!\n\n"
        : "⚠️ Resume saved but email could not be sent. Please contact support.\n\n";
    } else {
      message += "Your resume has been saved and will be reviewed along with your application.\n\n";
    }

    message += "Use /applications to see all your applications.";
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

    // Continue application if incomplete
    if (questionSet && !candidate.isCompleted && candidate.currentStep < questionSet.questions.length) {
      setTimeout(() => {
        this.bot.sendMessage(chatId, 
          `📝 Don't forget to continue with your application questions!\n\n` +
          `Progress: ${candidate.currentStep}/${questionSet.questions.length} completed`);
        this.askNextQuestion(chatId, candidate, questionSet);
      }, 2000);
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async handleStatus(msg: TelegramBot.Message) {
    await this.safeExecute(async () => {
      const candidate = await this.getActiveCandidate(msg.from?.id.toString() || "");
      
      if (!candidate) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ No applications found. Use /jobs to see available positions and apply!");
      }

      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
      if (!questionSet) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ Question set not found. Please restart your application.");
      }
      
      const job = await JobDescription.findById(questionSet.jobId);

      const message = candidate.isCompleted 
        ? this.buildCompletedStatusMessage(candidate, questionSet, job)
        : this.buildInProgressStatusMessage(candidate, questionSet, job);

      await this.bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
    }, msg.chat.id, '❌ Error fetching status.');
  }

  private buildCompletedStatusMessage(candidate: CandidateDocument, questionSet: IQuestionSet, job: any): string {
    const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title || "Unknown Job";
    
    let message = `📊 *Application Status*\n✅ Completed\n\n📋 *Job*: ${jobTitle}\n\n`;

    // Responses summary
    const responses = Object.entries(candidate.responses)
      .filter(([field, value]) => !field.startsWith('resume') && value && typeof value === 'string')
      .slice(0, 8);

    if (responses.length > 0) {
      message += "*Your Responses:*\n";
      responses.forEach(([field, value]) => {
        const question = questionSet.questions.find(q => q.field === field);
        const label = question ? field.charAt(0).toUpperCase() + field.slice(1) : field;
        const truncatedValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
        message += `• *${label}*: ${truncatedValue}\n`;
      });
      
      if (Object.keys(candidate.responses).length > 8) {
        message += "• ... (and more)\n";
      }
    }

    message += `\n📅 *Submitted*: ${candidate.createdAt.toLocaleDateString()}\n`;
    message += "\n💡 Use /applications to see all your applications";
    message += "\n📋 Use /jobs to apply for more positions";

    return message;
  }

  private buildInProgressStatusMessage(candidate: CandidateDocument, questionSet: IQuestionSet, job: any): string {
    const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title || "Unknown Job";
    const totalQuestions = questionSet.questions.length;
    const progress = `${candidate.currentStep}/${totalQuestions}`;
    const percentage = Math.round((candidate.currentStep / totalQuestions) * 100);
    
    let message = `⏳ *Application Status*\n📋 *Job*: ${jobTitle}\n📊 Progress: ${progress} (${percentage}%)\n`;
    
    message += candidate.responses.resumeFileName 
      ? `📄 *Resume*: ✅ ${candidate.responses.resumeFileName}\n`
      : "📄 *Resume*: ❌ Not uploaded (use /upload)\n";
    
    message += `🕐 Started: ${candidate.createdAt.toLocaleDateString()}\n\n`;
    message += "📝 Continue your application by answering the next question.\n";
    message += "💡 You can upload your resume anytime using /upload\n";
    message += "📋 Use /applications to see all your applications";

    return message;
  }

  private async handleStart(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    await this.safeExecute(async () => {
      const telegramId = msg.from?.id.toString() || "";
      const questionSetId = match?.[1];

      if (!questionSetId) {
        return this.handleListJobs(msg);
      }

      if (!mongoose.Types.ObjectId.isValid(questionSetId)) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ Invalid question set ID format. Use /jobs to see available positions.");
      }

      const questionSet = await QuestionSetService.getById(questionSetId);
      if (!questionSet) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ Invalid question set ID. Use /jobs to see available positions.");
      }

      const existingApplication = await Candidate.findOne({ telegramId, questionSetId: questionSet._id });
      
      if (existingApplication) {
        return this.handleExistingApplication(existingApplication, questionSet, msg.chat.id);
      }

      // Create new application
      const candidate = await CandidateService.createOrGet(telegramId, {
        telegramId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        currentStep: 0,
        questionSetId: questionSet._id,
        jobId: questionSet.jobId,
      } as any);

      await this.sendWelcomeMessage(questionSet, msg.chat.id);
      setTimeout(() => this.askNextQuestion(msg.chat.id, candidate, questionSet), 1000);
    }, msg.chat.id);
  }

  private async handleExistingApplication(candidate: CandidateDocument, questionSet: IQuestionSet, chatId: number) {
    const job = await JobDescription.findById(questionSet.jobId);
    const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title;
    
    if (candidate.isCompleted) {
      const message = 
        "📋 *Application Already Submitted*\n\n" +
        `You have already completed your application for:\n**${jobTitle}**\n\n` +
        `📅 Submitted: ${candidate.createdAt.toLocaleDateString()}\n` +
        "📊 Status: ✅ Completed\n\n" +
        "💡 Use /applications to see all your applications\n" +
        "📋 Use /jobs to apply for other positions";
      
      return this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    }

    // Continue incomplete application
    const message = 
      "📋 *Continue Your Application*\n\n" +
      `You have an incomplete application for:\n**${jobTitle}**\n\n` +
      `📊 Progress: ${candidate.currentStep}/${questionSet.questions.length}\n` +
      `🕐 Started: ${candidate.createdAt.toLocaleDateString()}\n\n` +
      "📝 Let's continue where you left off...";
    
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    setTimeout(() => this.askNextQuestion(chatId, candidate, questionSet), 1000);
  }

  private async sendWelcomeMessage(questionSet: IQuestionSet, chatId: number) {
    const job = await JobDescription.findById(questionSet.jobId);
    const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title;

    const message = 
      `🎯 *${jobTitle}*\n\n` +
      (questionSet.description ? `${questionSet.description}\n\n` : "") +
      `📝 This application has ${questionSet.questions.length} questions.\n` +
      `⏱️ It should take about ${Math.ceil(questionSet.questions.length / 2)} minutes to complete.\n` +
      "📄 You can also upload your resume using /upload\n\n" +
      "💡 *Available Commands:*\n" +
      "• /upload - Upload your resume\n" +
      "• /status - Check current application status\n" +
      "• /applications - View all your applications\n" +
      "• /jobs - Apply for other positions\n\n" +
      "Let's get started! 🚀";

    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }

  private async handleListJobs(msg: TelegramBot.Message) {
    await this.safeExecute(async () => {
      const telegramId = msg.from?.id.toString() || "";
      const jobs = await JobDescription.find({}).populate('createdBy', 'name email');

      if (!jobs?.length) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ No open positions available at the moment. Please check back later.");
      }

      const userApplications = await Candidate.find({ telegramId });
      const appliedJobIds = new Set(userApplications.map(app => app.questionSetId.toString()));

      const inlineKeyboard = await Promise.all(
        jobs.map(async (job) => {
          const questionSet = await QuestionSetService.getByJobId(job._id.toString());
          const hasApplied = questionSet && appliedJobIds.has(questionSet._id.toString());
          
          let buttonText = `${job.title} at ${job.company}`;
          if (hasApplied) {
            const application = userApplications.find(app => 
              app.questionSetId.toString() === questionSet!._id.toString());
            buttonText += application?.isCompleted ? " ✅" : " ⏳";
          }
          
          return [{ text: buttonText, callback_data: `apply_${job._id}` }];
        })
      );

      inlineKeyboard.push([{ text: "📋 My Applications", callback_data: "my_applications" }]);

      await this.bot.sendMessage(msg.chat.id, "📄 *Available Job Positions*\n\nSelect a position to apply:\n", {
        reply_markup: { inline_keyboard: inlineKeyboard },
        parse_mode: "Markdown"
      });
    }, msg.chat.id, '❌ Error fetching jobs.');
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery) {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    this.bot.answerCallbackQuery(query.id);

    if (query.data === "my_applications") {
      const fakeMsg = { ...query.message, from: query.from } as TelegramBot.Message;
      return this.handleMyApplications(fakeMsg);
    }

    if (query.data?.startsWith('apply_')) {
      const jobId = query.data.split('_')[1];
      const questionSet = await QuestionSetService.getByJobId(jobId);

      if (!questionSet) {
        return this.bot.sendMessage(chatId, 
          "❌ Application for this job is not available at the moment.");
      }

      const fakeMsg = { ...query.message, from: query.from } as TelegramBot.Message;
      const fakeMatch = [questionSet._id.toString(), questionSet._id.toString()] as unknown as RegExpExecArray;
      this.handleStart(fakeMsg, fakeMatch);
    }
  }

  private async handleRestart(msg: TelegramBot.Message) {
    await this.safeExecute(async () => {
      const telegramId = msg.from?.id.toString() || "";
      const candidates = await Candidate.find({ telegramId });
      
      if (!candidates.length) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ No applications found to restart. Use /jobs to begin applying!");
      }

      // Clean up resume files
      for (const candidate of candidates) {
        const filePath = candidate.responses.resumeFilePath;
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error('Error deleting resume file:', error);
          }
        }
      }
      
      await Candidate.deleteMany({ telegramId });
      this.bot.sendMessage(msg.chat.id, 
        "🔄 All your applications have been deleted! Use /jobs to begin applying again.");
    }, msg.chat.id, '❌ Error restarting applications.');
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!msg.text || msg.text.startsWith("/")) return;
    
    await this.safeExecute(async () => {
      const telegramId = msg.from?.id.toString() || "";
      const candidate = await Candidate.findOne({ telegramId, isCompleted: false })
        .sort({ updatedAt: -1 });
      
      if (!candidate) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ No active application found. Use /jobs to start applying for positions.");
      }

      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
      if (!questionSet) {
        return this.bot.sendMessage(msg.chat.id, 
          "❌ Question set not found. Please use /jobs to start a new application.");
      }
      
      await this.processResponse(msg.chat.id, candidate, questionSet, msg.text!);
    }, msg.chat.id, '❌ Error processing message.');
  }

  private async processResponse(chatId: number, candidate: CandidateDocument, questionSet: IQuestionSet, response: string) {
    const currentQuestion = questionSet.questions.find(q => q.step === candidate.currentStep + 1);
    if (!currentQuestion) return;

    const validation = ValidationHelper.validateResponse(currentQuestion, response);
    if (!validation.isValid) {
      const helpMessage = ValidationHelper.getValidationMessage(currentQuestion);
      return this.bot.sendMessage(chatId, `❌ ${validation.message}\n\n💡 ${helpMessage}`);
    }

    // Save response and update progress
    candidate.responses[currentQuestion.field] = response.trim();
    candidate.currentStep++;
    candidate.updatedAt = new Date();

    if (candidate.currentStep >= questionSet.questions.length) {
      await this.completeApplication(chatId, candidate, questionSet);
    } else {
      await candidate.save();
      setTimeout(() => this.askNextQuestion(chatId, candidate, questionSet), 500);
    }
  }

  private async completeApplication(chatId: number, candidate: CandidateDocument, questionSet: IQuestionSet) {
    candidate.isCompleted = true;
    await candidate.save();

    const job = await JobDescription.findById(questionSet.jobId);
    const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title;

    let message = 
      "🎉 *Application Submitted Successfully!*\n\n" +
      `📋 Position: ${jobTitle}\n\n` +
      "Thank you for completing your application. Our team will review it and get back to you soon.\n\n";

    const hasResume = candidate.responses.resumeFileName;
    if (!hasResume) {
      message += "💡 Don't forget to upload your resume using /upload to complete your profile!\n\n";
    } else {
      const emailSent = await this.triggerResumeProcessing(candidate, questionSet);
      message += emailSent 
        ? "📧 Your resume has been sent to our HR team for review.\n\n"
        : "⚠️ Resume uploaded but email could not be sent. Please contact support.\n\n";
    }

    message += 
      "🎯 *What's Next?*\n" +
      "• Use /applications to view all your applications\n" +
      "• Use /jobs to apply for other positions\n" +
      "• Use /upload to add/update your resume";
    
    this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }

  private askNextQuestion(chatId: number, candidate: CandidateDocument, questionSet: IQuestionSet) {
    const nextQuestion = questionSet.questions.find(q => q.step === candidate.currentStep + 1);
    if (!nextQuestion) return;

    const progress = `[${candidate.currentStep + 1}/${questionSet.questions.length}] `;
    const validationHint = ValidationHelper.getValidationMessage(nextQuestion);
    const message = validationHint 
      ? `${progress}${nextQuestion.question}\n\n💡 ${validationHint}`
      : `${progress}${nextQuestion.question}`;
    
    this.bot.sendMessage(chatId, message);
  }

  public stopBot() {
    try {
      this.bot.stopPolling();
      console.log('Telegram bot stopped');
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  }
}
