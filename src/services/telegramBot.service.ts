// src/services/telegramBot.service.ts
import TelegramBot from "node-telegram-bot-api";
import { CandidateService } from "../services/candidate.service";
import { QuestionSetService } from "../services/questionSet.service";
import { Candidate, CandidateDocument } from "../models/candidate.model";
import { IQuestion, IQuestionSet } from "../types";
import { ValidationHelper } from "../utils/validation";
import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ResumeService } from "./resume.service";
import { JobDescription } from "../models";

export class TelegramHiringBotService {
  private bot: TelegramBot;
  private readonly token: string = process.env.TELEGRAM_BOT_TOKEN || "8309639217:AAEQwAu_3zsjwzOK2GIQUNV3_GONfc8-GsI";
  private readonly uploadsDir: string = 'uploads/resumes/';

  constructor() {
    this.bot = new TelegramBot(this.token, { polling: true });
    this.ensureUploadDir();
    this.setupHandlers();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private setupHandlers() {
    this.bot.onText(/\/start(?:\s+(.+))?/, (msg: any, match: any) => this.handleStart(msg, match));
    this.bot.onText(/\/restart/, (msg: any) => this.handleRestart(msg));
    this.bot.onText(/\/status/, (msg: any) => this.handleStatus(msg));
    this.bot.onText(/\/jobs/, (msg: any) => this.handleListJobs(msg));
    this.bot.onText(/\/upload/, (msg: any) => this.handleUploadCommand(msg));
    this.bot.onText(/\/applications/, (msg: any) => this.handleMyApplications(msg));
    
    // Handle document uploads
    this.bot.on("document", (msg: any) => this.handleDocument(msg));
    
    this.bot.on("callback_query", (query: TelegramBot.CallbackQuery) => this.handleCallbackQuery(query));
    this.bot.on("message", (msg: any) => this.handleMessage(msg));
  }

  // New method to show all user's applications
  private async handleMyApplications(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      const applications = await Candidate.find({ telegramId })
        .populate({
          path: 'questionSetId',
          populate: {
            path: 'jobId',
            model: 'JobDescription'
          }
        })
        .sort({ createdAt: -1 });
      
      if (!applications || applications.length === 0) {
        this.bot.sendMessage(chatId, "📋 You haven't applied for any jobs yet.\n\nUse /jobs to see available positions!");
        return;
      }

      let message = "📋 *Your Job Applications*\n\n";
      
      for (let i = 0; i < applications.length; i++) {
        const app = applications[i];
        const questionSet = app.questionSetId as any;
        const job = questionSet?.jobId;
        
        const status = app.isCompleted ? "✅ Completed" : `⏳ In Progress (${app.currentStep}/${questionSet?.questions.length || 0})`;
        const jobTitle = job ? `${job.title} at ${job.company}` : questionSet?.title || "Unknown Job";
        const appliedDate = app.createdAt.toLocaleDateString();
        
        message += `${i + 1}. **${jobTitle}**\n`;
        message += `   Status: ${status}\n`;
        message += `   Applied: ${appliedDate}\n`;
        
        message += `\n`;
      }
      
      message += `💡 Use /status to continue an incomplete application\n`;
      message += `📄 Use /jobs to apply for more positions`;

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error('Error in handleMyApplications:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while fetching your applications.');
    }
  }

  // New helper method for triggering resume scan and email
  private async triggerResumeProcessing(candidate: CandidateDocument, questionSet: IQuestionSet): Promise<boolean> {
    console.log(questionSet._id,"triggerResumeProcessing")
    try {
      console.log(`[triggerResumeProcessing] Starting resume processing for candidate: ${candidate.telegramId}`);
      
      if (!candidate.responses['resumeFilePath'] || !candidate.responses['resumeFileName']) {
        console.log(`[triggerResumeProcessing] Resume not found, skipping email processing`);
        return false;
      }

      const resumeService = new ResumeService();
      const job = await JobDescription.findById(questionSet.jobId);
      console.log(`[triggerResumeProcessing] Job fetched:`, job ? job._id : null);

      if (job && job.hrEmail) {
        console.log(`[triggerResumeProcessing] Sending resume scan to HR Email: ${job.hrEmail}`);
        await resumeService.scanResume(
          candidate.responses['resumeFilePath'],
          candidate.responses['resumeFileName'],
          { jobId: questionSet.jobId.toString() },
          candidate._id.toString()
        );
        console.log(`[triggerResumeProcessing] Resume scan and email triggered successfully.`);
        return true;
      } else {
        console.warn(`[triggerResumeProcessing] Job or hrEmail not found, skipping resume scan.`);
        return false;
      }
    } catch (error) {
      console.error('[triggerResumeProcessing] Error during resume processing:', error);
      return false;
    }
  }

  private async handleUploadCommand(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      // Get the most recent incomplete application or any application
      const candidate = await Candidate.findOne({ 
        telegramId,
        $or: [{ isCompleted: false }, { isCompleted: true }]
      }).sort({ updatedAt: -1 });
      
      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ Please apply for a job first using /jobs to begin your application.");
        return;
      }

      const uploadMessage = `📄 *Resume Upload*\n\n` +
        `Please send your resume as a document. Accepted formats:\n` +
        `• PDF (.pdf)\n` +
        `• Microsoft Word (.doc, .docx)\n\n` +
        `📁 Maximum file size: 20MB\n\n` +
        `💡 Just drag and drop your file or use the attachment button!\n\n` +
        `📋 This resume will be associated with your most recent application.`;

      await this.bot.sendMessage(chatId, uploadMessage, { parse_mode: "Markdown" });
    } catch (error) {
      console.error('Error in handleUploadCommand:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
  }

  private async handleDocument(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      const document = msg.document;

      if (!document) return;

      // Get the most recent application (prioritize incomplete ones)
      const candidate = await Candidate.findOne({ 
        telegramId,
        $or: [{ isCompleted: false }, { isCompleted: true }]
      }).sort({ isCompleted: 1, updatedAt: -1 }); // incomplete first, then by most recent

      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ Please apply for a job first using /jobs to begin your application.");
        return;
      }

      // Validate file type
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      const allowedExtensions = ['.pdf', '.doc', '.docx'];
      const fileExtension = path.extname(document.file_name || '').toLowerCase();

      if (!allowedMimeTypes.includes(document.mime_type || '') && 
          !allowedExtensions.includes(fileExtension)) {
        this.bot.sendMessage(chatId, 
          "❌ Invalid file format. Please upload PDF, DOC, or DOCX files only.");
        return;
      }

      // Check file size (Telegram limit is 20MB for bots)
      if (document.file_size && document.file_size > 20 * 1024 * 1024) {
        this.bot.sendMessage(chatId, 
          "❌ File too large. Please upload a file smaller than 20MB.");
        return;
      }

      // Show processing message
      const processingMsg = await this.bot.sendMessage(chatId, "⏳ Processing your resume...");

      try {
        // Download the file
        const fileLink = await this.bot.getFileLink(document.file_id);
        const response = await fetch(fileLink);
        
        if (!response.ok) {
          throw new Error('Failed to download file');
        }

        // Generate unique filename
        const uniqueFilename = `${uuidv4()}-${Date.now()}${fileExtension}`;
        const filePath = path.join(this.uploadsDir, uniqueFilename);

        // Save file
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        // Update candidate record with resume info
        candidate.responses['resumeFileName'] = document.file_name || uniqueFilename;
        candidate.responses['resumeFilePath'] = filePath;
        candidate.responses['resumeUploadedAt'] = new Date().toISOString();
        candidate.updatedAt = new Date();
        
        await candidate.save();

        // Delete processing message
        await this.bot.deleteMessage(chatId, processingMsg.message_id);

        // Get job info for the message
        const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
        const job = questionSet ? await JobDescription.findById(questionSet.jobId) : null;
        const jobTitle = job ? `${job.title} at ${job.company}` : questionSet?.title || "Unknown Job";

        // Send success message
        let successMessage = `✅ *Resume Uploaded Successfully!*\n\n` +
          `📋 Application: ${jobTitle}\n` +
          `📄 File: ${document.file_name}\n` +
          `📏 Size: ${this.formatFileSize(document.file_size || 0)}\n` +
          `📅 Uploaded: ${new Date().toLocaleDateString()}\n\n`;

        // CRITICAL FIX: Check if application is completed and trigger email
        if (candidate.isCompleted && questionSet) {
          console.log(`[handleDocument] Application already completed, triggering resume processing...`);
          const emailSent = await this.triggerResumeProcessing(candidate, questionSet);
          if (emailSent) {
            successMessage += "📧 Your resume has been sent to our HR team for review!\n\n";
          } else {
            successMessage += "⚠️ Resume saved but email could not be sent. Please contact support.\n\n";
          }
        } else {
          successMessage += "Your resume has been saved and will be reviewed along with your application.\n\n";
        }

        successMessage += "Use /applications to see all your applications.";

        await this.bot.sendMessage(chatId, successMessage, { parse_mode: "Markdown" });

        // If there are still questions to answer, remind the user
        if (questionSet && !candidate.isCompleted && candidate.currentStep < questionSet.questions.length) {
          setTimeout(() => {
            this.bot.sendMessage(chatId, 
              `📝 Don't forget to continue with your application questions!\n\n` +
              `Progress: ${candidate.currentStep}/${questionSet.questions.length} completed`);
            
            // Ask next question
            this.askNextQuestion(chatId, candidate, questionSet);
          }, 2000);
        }

      } catch (downloadError) {
        console.error('Error downloading file:', downloadError);
        await this.bot.deleteMessage(chatId, processingMsg.message_id);
        this.bot.sendMessage(chatId, 
          "❌ Failed to download your resume. Please try uploading again.");
      }

    } catch (error) {
      console.error('Error in handleDocument:', error);
      this.bot.sendMessage(msg.chat.id, 
        '❌ An error occurred while processing your resume. Please try again.');
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Enhanced status method to show current/most recent application
  private async handleStatus(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      // Get the most recent incomplete application, or most recent completed one
      const candidate = await Candidate.findOne({ 
        telegramId,
        $or: [{ isCompleted: false }, { isCompleted: true }]
      }).sort({ isCompleted: 1, updatedAt: -1 }); // incomplete first, then by most recent
      
      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ No applications found. Use /jobs to see available positions and apply!");
        return;
      }

      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
      const job = questionSet ? await JobDescription.findById(questionSet.jobId) : null;
      const jobTitle = job ? `${job.title} at ${job.company}` : questionSet?.title || "Unknown Job";

      if (!questionSet) {
        this.bot.sendMessage(chatId, "❌ Question set not found. Please restart your application.");
        return;
      }

      if (candidate.isCompleted) {
        let message = "📊 *Application Status*\n✅ Completed\n\n";
        message += `📋 *Job*: ${jobTitle}\n\n`;
        
        // Show resume info
        if (candidate.responses['resumeFileName']) {
          message += `📄 *Resume*: ${candidate.responses['resumeFileName']}\n`;
          if (candidate.responses['resumeUploadedAt']) {
            const uploadDate = new Date(candidate.responses['resumeUploadedAt']);
            message += `📅 *Uploaded*: ${uploadDate.toLocaleDateString()}\n\n`;
          }
        } else {
          message += `📄 *Resume*: Not uploaded\n`;
          message += `💡 Use /upload to add your resume\n\n`;
        }
        
        // Show responses (existing logic)
        const responses = Object.entries(candidate.responses);
        if (responses.length > 0) {
          message += "*Your Responses:*\n";
          let responseCount = 0;
          for (const [field, value] of responses) {
            // Skip resume-related fields in the summary
            if (field.startsWith('resume')) continue;
            
            if (value && typeof value === 'string') {
              const question = questionSet.questions.find((q: { field: string; }) => q.field === field);
              const label = question ? question.field.charAt(0).toUpperCase() + question.field.slice(1) : field;
              const truncatedValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
              message += `• *${label}*: ${truncatedValue}\n`;
              responseCount++;
              
              if (responseCount >= 8) {
                message += "• ... (and more)\n";
                break;
              }
            }
          }
        }

        if (candidate.createdAt) {
          message += `\n📅 *Submitted*: ${candidate.createdAt.toLocaleDateString()}\n`;
        }

        message += `\n💡 Use /applications to see all your applications`;
        message += `\n📋 Use /jobs to apply for more positions`;

        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } else {
        const totalQuestions = questionSet.questions.length;
        const progress = `${candidate.currentStep}/${totalQuestions}`;
        const percentage = Math.round((candidate.currentStep / totalQuestions) * 100);
        
        let message = `⏳ *Application Status*\n`;
        message += `📋 *Job*: ${jobTitle}\n`;
        message += `📊 Progress: ${progress} (${percentage}%)\n`;
        
        // Show resume status
        if (candidate.responses['resumeFileName']) {
          message += `📄 *Resume*: ✅ ${candidate.responses['resumeFileName']}\n`;
        } else {
          message += `📄 *Resume*: ❌ Not uploaded (use /upload)\n`;
        }
        
        if (candidate.createdAt) {
          message += `🕐 Started: ${candidate.createdAt.toLocaleDateString()}\n`;
        }
        
        message += `\n📝 Continue your application by answering the next question.`;
        message += `\n💡 You can upload your resume anytime using /upload`;
        message += `\n📋 Use /applications to see all your applications`;

        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error('Error in handleStatus:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while fetching your status. Please try again.');
    }
  }

  // Enhanced start method with multiple job application support
  private async handleStart(msg: TelegramBot.Message, match: any) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      const questionSetId = match && match[1] ? match[1] : null;

      if (!questionSetId) {
        // No specific question set, show available jobs
        await this.handleListJobs(msg);
        return;
      }

      let questionSet: IQuestionSet | null = null;

      if (mongoose.Types.ObjectId.isValid(questionSetId)) {
        questionSet = await QuestionSetService.getById(questionSetId);
        if (!questionSet) {
          this.bot.sendMessage(chatId, "❌ Invalid question set ID. Use /jobs to see available positions.");
          return;
        }
      } else {
        this.bot.sendMessage(chatId, "❌ Invalid question set ID format. Use /jobs to see available positions.");
        return;
      }

      // Check if user already applied for this specific job
      const existingApplication = await Candidate.findOne({
        telegramId,
        questionSetId: questionSet._id
      });

      if (existingApplication) {
        const job = await JobDescription.findById(questionSet.jobId);
        const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title;
        
        if (existingApplication.isCompleted) {
          let message = `📋 *Application Already Submitted*\n\n`;
          message += `You have already completed your application for:\n`;
          message += `**${jobTitle}**\n\n`;
          message += `📅 Submitted: ${existingApplication.createdAt.toLocaleDateString()}\n`;
          message += `📊 Status: ✅ Completed\n\n`;
          message += `💡 Use /applications to see all your applications\n`;
          message += `📋 Use /jobs to apply for other positions`;
          
          this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
          return;
        } else {
          // Continue existing incomplete application
          let message = `📋 *Continue Your Application*\n\n`;
          message += `You have an incomplete application for:\n`;
          message += `**${jobTitle}**\n\n`;
          message += `📊 Progress: ${existingApplication.currentStep}/${questionSet.questions.length}\n`;
          message += `🕐 Started: ${existingApplication.createdAt.toLocaleDateString()}\n\n`;
          message += `📝 Let's continue where you left off...`;
          
          await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
          
          setTimeout(() => {
            this.askNextQuestion(chatId, existingApplication, questionSet!);
          }, 1000);
          return;
        }
      }

      // Create new application for this job
      const candidate = await CandidateService.createOrGet(telegramId, {
        telegramId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        currentStep: 0,
        questionSetId: questionSet._id,
      });

      // Get job details for welcome message
      const job = await JobDescription.findById(questionSet.jobId);
      const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title;

      // Enhanced welcome message
      let welcomeMessage = `🎯 *${jobTitle}*\n\n`;
      if (questionSet.description) {
        welcomeMessage += `${questionSet.description}\n\n`;
      }
      welcomeMessage += `📝 This application has ${questionSet.questions.length} questions.\n`;
      welcomeMessage += `⏱️ It should take about ${Math.ceil(questionSet.questions.length / 2)} minutes to complete.\n`;
      welcomeMessage += `📄 You can also upload your resume using /upload\n\n`;
      welcomeMessage += `💡 *Available Commands:*\n`;
      welcomeMessage += `• /upload - Upload your resume\n`;
      welcomeMessage += `• /status - Check current application status\n`;
      welcomeMessage += `• /applications - View all your applications\n`;
      welcomeMessage += `• /jobs - Apply for other positions\n\n`;
      welcomeMessage += `Let's get started! 🚀`;

      await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
      
      setTimeout(() => {
        this.askNextQuestion(chatId, candidate, questionSet!);
      }, 1000);
    } catch (error) {
      console.error('Error in handleStart:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
  }

  private async handleListJobs(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      const jobs = await JobDescription.find({}).populate('createdBy', 'name email');

      if (!jobs || jobs.length === 0) {
        this.bot.sendMessage(chatId, "❌ No open positions available at the moment. Please check back later.");
        return;
      }

      // Get user's existing applications to show status
      const userApplications = await Candidate.find({ telegramId });
      const appliedJobIds = new Set(userApplications.map(app => app.questionSetId.toString()));

      let message = "📄 *Available Job Positions*\n\n";
      message += "Select a position to apply:\n\n";

      const inlineKeyboard = [];
      
      for (const job of jobs) {
        // Check if user already applied for this job
        const questionSet = await QuestionSetService.getByJobId(job._id.toString());
        const hasApplied = questionSet && appliedJobIds.has(questionSet._id.toString());
        
        let buttonText = `${job.title} at ${job.company}`;
        if (hasApplied) {
          const application = userApplications.find(app => app.questionSetId.toString() === questionSet!._id.toString());
          buttonText += application?.isCompleted ? " ✅" : " ⏳";
        }
        
        inlineKeyboard.push([
          { text: buttonText, callback_data: `apply_${job._id}` }
        ]);
      }

      // Add additional options
      inlineKeyboard.push([
        { text: "📋 My Applications", callback_data: "my_applications" }
      ]);

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard
        },
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.error('Error in handleListJobs:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while fetching jobs.');
    }
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery) {
    try {
        const chatId = query.message?.chat.id;
        const telegramId = query.from.id.toString();
        const data = query.data;

        if (!chatId || !data) return;

        // Acknowledge the button press instantly
        this.bot.answerCallbackQuery(query.id);

        if (data === "my_applications") {
          // Create a fake message object to pass to handleMyApplications
          const fakeMsg = {
            ...query.message,
            from: query.from,
          } as TelegramBot.Message;
          
          await this.handleMyApplications(fakeMsg);
          return;
        }

        if (data.startsWith('apply_')) {
            const jobId = data.split('_')[1];
            
            const questionSet = await QuestionSetService.getByJobId(jobId);

            if (!questionSet) {
                this.bot.sendMessage(chatId, "❌ Application for this job is not available at the moment.");
                return;
            }

            // Create a fake message object to pass to handleStart
            const fakeMsg = {
                ...query.message,
                from: query.from,
            } as TelegramBot.Message;

            this.handleStart(fakeMsg, { "1": questionSet._id.toString() });
        }
    } catch (error) {
        console.error('Error in handleCallbackQuery:', error);
        this.bot.sendMessage(query.message?.chat.id || '', '❌ An error occurred. Please try again.');
    }
  }

  private async handleRestart(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      // Get all applications for this user
      const candidates = await Candidate.find({ telegramId });
      
      if (candidates.length === 0) {
        this.bot.sendMessage(chatId, "❌ No applications found to restart. Use /jobs to begin applying!");
        return;
      }

      // Delete resume files and applications
      for (const candidate of candidates) {
        if (candidate.responses['resumeFilePath']) {
          try {
            const filePath = candidate.responses['resumeFilePath'];
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (fileError) {
            console.error('Error deleting resume file:', fileError);
          }
        }
      }
      
      await Candidate.deleteMany({ telegramId });
      
      this.bot.sendMessage(chatId, "🔄 All your applications have been deleted! Use /jobs to begin applying again.");
    } catch (error) {
      console.error('Error in handleRestart:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while restarting. Please try again.');
    }
  }

  private async handleMessage(msg: TelegramBot.Message) {
    try {
      if (!msg.text || msg.text.startsWith("/")) return;
      
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      // Get the most recent incomplete application
      const candidate = await Candidate.findOne({ 
        telegramId, 
        isCompleted: false 
      }).sort({ updatedAt: -1 });
      
      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ No active application found. Use /jobs to start applying for positions.");
        return;
      }

      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
      
      if (!questionSet) {
        this.bot.sendMessage(chatId, "❌ Question set not found. Please use /jobs to start a new application.");
        return;
      }
      
      await this.processResponse(chatId, candidate, questionSet, msg.text);
    } catch (error) {
      console.error('Error in handleMessage:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred processing your message. Please try again.');
    }
  }

  private async processResponse(
    chatId: number, 
    candidate: CandidateDocument, 
    questionSet: IQuestionSet,
    response: string
  ) {
    try {
      console.log(`\n[processResponse] ChatID: ${chatId}, CandidateID: ${candidate.telegramId}`);
      console.log(`Current Step: ${candidate.currentStep}, Response Received: "${response}"`);

      const currentQuestion = questionSet.questions.find(q => q.step === candidate.currentStep + 1);
      if (!currentQuestion) {
        console.warn(`[processResponse] No question found for step ${candidate.currentStep + 1}`);
        return;
      }
      console.log(`[processResponse] Current Question: ${currentQuestion.field}`);

      const validation = ValidationHelper.validateResponse(currentQuestion, response);
      console.log(`[processResponse] Validation result:`, validation);

      if (!validation.isValid) {
        const helpMessage = ValidationHelper.getValidationMessage(currentQuestion);
        console.log(`[processResponse] Validation failed: ${validation.message}`);
        this.bot.sendMessage(chatId, `❌ ${validation.message}\n\n💡 ${helpMessage}`);
        return;
      }

      // Save candidate response
      candidate.responses[currentQuestion.field] = response.trim();
      candidate.currentStep++;
      candidate.updatedAt = new Date();
      console.log(`[processResponse] Response saved. Current Step now: ${candidate.currentStep}`);

      if (candidate.currentStep >= questionSet.questions.length) {
        candidate.isCompleted = true;
        await candidate.save();
        console.log(`[processResponse] Application completed for candidate: ${candidate.telegramId}`);

        // Get job details for completion message
        const job = await JobDescription.findById(questionSet.jobId);
        const jobTitle = job ? `${job.title} at ${job.company}` : questionSet.title;

        let completionMessage = `🎉 *Application Submitted Successfully!*\n\n`;
        completionMessage += `📋 Position: ${jobTitle}\n\n`;
        completionMessage += "Thank you for completing your application. ";
        completionMessage += "Our team will review it and get back to you soon.\n\n";

        // Check if resume is uploaded and process it
        const hasResume = candidate.responses['resumeFileName'];
        if (!hasResume) {
          console.log(`[processResponse] Candidate has not uploaded resume.`);
          completionMessage += "💡 Don't forget to upload your resume using /upload to complete your profile!\n\n";
        } else {
          console.log(`[processResponse] Candidate has uploaded resume. Triggering scan...`);
          const emailSent = await this.triggerResumeProcessing(candidate, questionSet);
          if (emailSent) {
            completionMessage += "📧 Your resume has been sent to our HR team for review.\n\n";
          } else {
            completionMessage += "⚠️ Resume uploaded but email could not be sent. Please contact support.\n\n";
          }
        }

        completionMessage += "🎯 *What's Next?*\n";
        completionMessage += "• Use /applications to view all your applications\n";
        completionMessage += "• Use /jobs to apply for other positions\n";
        completionMessage += "• Use /upload to add/update your resume";
        
        this.bot.sendMessage(chatId, completionMessage, { parse_mode: "Markdown" });

      } else {
        await candidate.save();
        console.log(`[processResponse] Saved candidate progress. Asking next question in 500ms...`);

        setTimeout(() => {
          console.log(`[processResponse] Calling askNextQuestion for step ${candidate.currentStep + 1}`);
          this.askNextQuestion(chatId, candidate, questionSet);
        }, 500);
      }

    } catch (error) {
      console.error('[processResponse] Error:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred saving your response. Please try again.');
    }
  }

  private askNextQuestion(chatId: number, candidate: CandidateDocument, questionSet: IQuestionSet) {
    try {
      const nextQuestion = questionSet.questions.find(q => q.step === candidate.currentStep + 1);
      if (nextQuestion) {
        const progress = `[${candidate.currentStep + 1}/${questionSet.questions.length}] `;
        const questionText = progress + nextQuestion.question;
        
        const validationHint = ValidationHelper.getValidationMessage(nextQuestion);
        const fullMessage = validationHint ? `${questionText}\n\n💡 ${validationHint}` : questionText;
        
        this.bot.sendMessage(chatId, fullMessage);
      }
    } catch (error) {
      console.error('Error in askNextQuestion:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred. Please try /jobs to begin again.');
    }
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
