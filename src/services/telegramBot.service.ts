// src/services/telegramBot.service.ts
import TelegramBot from "node-telegram-bot-api";
import { CandidateService } from "../services/candidate.service";
import { QuestionSetService } from "../services/questionSet.service";
import { CandidateDocument } from "../models/candidate.model";
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
    this.bot.onText(/\/questsets/, (msg: any) => this.handleListQuestionSets(msg));
    this.bot.onText(/\/upload/, (msg: any) => this.handleUploadCommand(msg));
    
    // Handle document uploads
    this.bot.on("document", (msg: any) => this.handleDocument(msg));
    
    this.bot.on("message", (msg: any) => this.handleMessage(msg));
  }

  // New helper method for triggering resume scan and email
  private async triggerResumeProcessing(candidate: CandidateDocument, questionSet: IQuestionSet): Promise<boolean> {
    console.log(questionSet._id,"unswidhuwhduwhd")
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
      
      const candidate = await CandidateService.getByTelegramId(telegramId);
      
      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ Please start with /start first to begin your application.");
        return;
      }

      const uploadMessage = `📄 *Resume Upload*\n\n` +
        `Please send your resume as a document. Accepted formats:\n` +
        `• PDF (.pdf)\n` +
        `• Microsoft Word (.doc, .docx)\n\n` +
        `📁 Maximum file size: 20MB\n\n` +
        `💡 Just drag and drop your file or use the attachment button!`;

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

      // Check if user has started the application
      const candidate = await CandidateService.getByTelegramId(telegramId);
      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ Please start with /start first to begin your application.");
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

        // Send success message
        let successMessage = `✅ *Resume Uploaded Successfully!*\n\n` +
          `📄 File: ${document.file_name}\n` +
          `📏 Size: ${this.formatFileSize(document.file_size || 0)}\n` +
          `📅 Uploaded: ${new Date().toLocaleDateString()}\n\n`;

        // CRITICAL FIX: Check if application is completed and trigger email
        if (candidate.isCompleted) {
          console.log(`[handleDocument] Application already completed, triggering resume processing...`);
          const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
          
          if (questionSet) {
            const emailSent = await this.triggerResumeProcessing(candidate, questionSet);
            if (emailSent) {
              successMessage += "📧 Your resume has been sent to our HR team for review!\n\n";
            } else {
              successMessage += "⚠️ Resume saved but email could not be sent. Please contact support.\n\n";
            }
          }
        } else {
          successMessage += "Your resume has been saved and will be reviewed along with your application.\n\n";
        }

        successMessage += "Use /status to see your complete application status.";

        await this.bot.sendMessage(chatId, successMessage, { parse_mode: "Markdown" });

        // If there are still questions to answer, remind the user
        const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
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

  // Enhanced status method to show resume info
  private async handleStatus(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      const candidate = await CandidateService.getByTelegramId(telegramId);

      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ No application found. Use /start to begin or /questsets to see available question sets.");
        return;
      }

      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());

      if (!questionSet) {
        this.bot.sendMessage(chatId, "❌ Question set not found. Please restart your application.");
        return;
      }

      if (candidate.isCompleted) {
        let message = "📊 *Application Status*\n✅ Completed\n\n";
        message += `📋 *Question Set*: ${questionSet.title}\n\n`;
        
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

        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } else {
        const totalQuestions = questionSet.questions.length;
        const progress = `${candidate.currentStep}/${totalQuestions}`;
        const percentage = Math.round((candidate.currentStep / totalQuestions) * 100);
        
        let message = `⏳ *Application Status*\n`;
        message += `📋 *Question Set*: ${questionSet.title}\n`;
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

        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error('Error in handleStatus:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while fetching your status. Please try again.');
    }
  }

  // Enhanced start method with resume upload info
  private async handleStart(msg: TelegramBot.Message, match: any) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      const questionSetId = match && match[1] ? match[1] : null;

      let candidate = await CandidateService.getByTelegramId(telegramId);

      if (candidate?.isCompleted) {
        this.bot.sendMessage(chatId, "✅ You have already completed the hiring process!");
        return;
      }

      let questionSet: IQuestionSet | null = null;

      if (questionSetId) {
        if (mongoose.Types.ObjectId.isValid(questionSetId)) {
          questionSet = await QuestionSetService.getById(questionSetId);
          if (!questionSet) {
            this.bot.sendMessage(chatId, "❌ Invalid question set ID. Using default question set.");
          }
        } else {
          this.bot.sendMessage(chatId, "❌ Invalid question set ID format. Using default question set.");
        }
      }

      if (!questionSet) {
        questionSet = await QuestionSetService.getDefault();
      }

      if (!questionSet) {
        this.bot.sendMessage(chatId, "❌ No question sets available. Please contact administrator.");
        return;
      }

      candidate = await CandidateService.createOrGet(telegramId, {
        telegramId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        currentStep: 0,
        questionSetId: questionSet._id,
      });

      // Enhanced welcome message
      let welcomeMessage = `🎯 *${questionSet.title}*\n\n`;
      if (questionSet.description) {
        welcomeMessage += `${questionSet.description}\n\n`;
      }
      welcomeMessage += `📝 This application has ${questionSet.questions.length} questions.\n`;
      welcomeMessage += `⏱️ It should take about ${Math.ceil(questionSet.questions.length / 2)} minutes to complete.\n`;
      welcomeMessage += `📄 You can also upload your resume using /upload\n\n`;
      welcomeMessage += `💡 *Available Commands:*\n`;
      welcomeMessage += `• /upload - Upload your resume\n`;
      welcomeMessage += `• /status - Check application status\n`;
      welcomeMessage += `• /restart - Start over\n\n`;

      await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
      
      this.askNextQuestion(chatId, candidate, questionSet);
    } catch (error) {
      console.error('Error in handleStart:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
  }

  private async handleListQuestionSets(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const questionSets = await QuestionSetService.getActive();

      if (!questionSets || questionSets.length === 0) {
        this.bot.sendMessage(chatId, "❌ No active question sets available.");
        return;
      }

      let message = "📋 *Available Question Sets*\n\n";
      
      for (const qs of questionSets) {
        message += `🔹 *${qs.title}*${qs.isDefault ? ' (Default)' : ''}\n`;
        if (qs.description) {
          message += `   ${qs.description}\n`;
        }
        message += `   📝 ${qs.questions.length} questions\n`;
        message += `   Command: /start ${qs._id}\n\n`;
      }

      message += "💡 Use `/start <question-set-id>` to begin with a specific question set.";

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error('Error in handleListQuestionSets:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while fetching question sets.');
    }
  }

  private async handleRestart(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      // Get candidate to clean up resume file if exists
      const candidate = await CandidateService.getByTelegramId(telegramId);
      if (candidate && candidate.responses['resumeFilePath']) {
        try {
          const filePath = candidate.responses['resumeFilePath'];
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error('Error deleting resume file:', fileError);
        }
      }
      
      await CandidateService.delete(telegramId);
      
      this.bot.sendMessage(chatId, "🔄 Process restarted! Use /start to begin again or /questsets to see available question sets.");
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
      const candidate = await CandidateService.getByTelegramId(telegramId);
      
      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ Please start with /start or use /questsets to see available question sets");
        return;
      }
      
      if (candidate.isCompleted) {
        this.bot.sendMessage(chatId, "✅ You already completed the application. Use /restart to start over.");
        return;
      }

      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());
      
      if (!questionSet) {
        this.bot.sendMessage(chatId, "❌ Question set not found. Please use /restart to start over.");
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

        let completionMessage = `🎉 *Application Submitted Successfully!*\n\n`;
        completionMessage += `📋 Question Set: ${questionSet.title}\n\n`;
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

        completionMessage += "Use /status to view your application details anytime.";
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
      this.bot.sendMessage(chatId, '❌ An error occurred. Please try /restart to begin again.');
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
