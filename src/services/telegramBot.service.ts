// src/services/telegramBot.service.ts
import TelegramBot from "node-telegram-bot-api";
import { CandidateService } from "../services/candidate.service";
import { QuestionSetService } from "../services/questionSet.service";
import { CandidateDocument } from "../models/candidate.model";
import { IQuestion, IQuestionSet } from "../models/QuestionSet.model";
import { ValidationHelper } from "../utils/validation";
import mongoose from "mongoose";

export class TelegramHiringBotService {
  private bot: TelegramBot;
  private readonly token: string = process.env.TELEGRAM_BOT_TOKEN || "8309639217:AAEQwAu_3zsjwzOK2GIQUNV3_GONfc8-GsI";

  constructor() {
    this.bot = new TelegramBot(this.token, { polling: true });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.onText(/\/start(?:\s+(.+))?/, (msg: any, match: any) => this.handleStart(msg, match));
    this.bot.onText(/\/restart/, (msg: any) => this.handleRestart(msg));
    this.bot.onText(/\/status/, (msg: any) => this.handleStatus(msg));
    this.bot.onText(/\/questsets/, (msg: any) => this.handleListQuestionSets(msg));
    this.bot.on("message", (msg: any) => this.handleMessage(msg));
  }

  private async handleStart(msg: TelegramBot.Message, match: any) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      // Extract question set ID from command (e.g., /start 60f7b3b3b3b3b3b3b3b3b3b3)
      const questionSetId = match && match[1] ? match[1] : null;

      let candidate = await CandidateService.getByTelegramId(telegramId);

      if (candidate?.isCompleted) {
        this.bot.sendMessage(chatId, "✅ You have already completed the hiring process!");
        return;
      }

      // Get the question set to use
      let questionSet: IQuestionSet | null = null;

      if (questionSetId) {
        // Validate ObjectId format before querying
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

      // Create or update candidate with the question set
      candidate = await CandidateService.createOrGet(telegramId, {
        telegramId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        currentStep: 0,
        questionSetId: questionSet._id, // This is now properly handled in createOrGet
      });

      // Welcome message with question set info
      let welcomeMessage = `🎯 *${questionSet.title}*\n\n`;
      if (questionSet.description) {
        welcomeMessage += `${questionSet.description}\n\n`;
      }
      welcomeMessage += `📝 This application has ${questionSet.questions.length} questions.\n`;
      welcomeMessage += `⏱️ It should take about ${Math.ceil(questionSet.questions.length / 2)} minutes to complete.\n\n`;

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
      
      await CandidateService.delete(telegramId);
      
      this.bot.sendMessage(chatId, "🔄 Process restarted! Use /start to begin again or /questsets to see available question sets.");
    } catch (error) {
      console.error('Error in handleRestart:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while restarting. Please try again.');
    }
  }

  private async handleStatus(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      const candidate = await CandidateService.getByTelegramId(telegramId);

      if (!candidate) {
        this.bot.sendMessage(chatId, "❌ No application found. Use /start to begin or /questsets to see available question sets.");
        return;
      }

      // FIXED: Now candidate.questionSetId is properly an ObjectId, not a populated document
      const questionSet = await QuestionSetService.getById(candidate.questionSetId.toString());

      if (!questionSet) {
        this.bot.sendMessage(chatId, "❌ Question set not found. Please restart your application.");
        return;
      }

      if (candidate.isCompleted) {
        let message = "📊 *Application Status*\n✅ Completed\n\n";
        message += `📋 *Question Set*: ${questionSet.title}\n\n`;
        
        // Show responses
        const responses = Object.entries(candidate.responses);
        if (responses.length > 0) {
          message += "*Your Responses:*\n";
          let responseCount = 0;
          for (const [field, value] of responses) {
            if (value && typeof value === 'string') {
              const question = questionSet.questions.find(q => q.field === field);
              const label = question ? question.field.charAt(0).toUpperCase() + question.field.slice(1) : field;
              const truncatedValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
              message += `• *${label}*: ${truncatedValue}\n`;
              responseCount++;
              
              // Limit to prevent message overflow
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
        
        if (candidate.createdAt) {
          message += `🕐 Started: ${candidate.createdAt.toLocaleDateString()}\n`;
        }
        
        message += `\n📝 Continue your application by answering the next question.`;

        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error('Error in handleStatus:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred while fetching your status. Please try again.');
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

      // FIXED: Now candidate.questionSetId is properly an ObjectId
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
      const currentQuestion = questionSet.questions.find(q => q.step === candidate.currentStep + 1);
      if (!currentQuestion) return;

      // Validate response using the dynamic validation
      const validation = ValidationHelper.validateResponse(currentQuestion, response);
      
      if (!validation.isValid) {
        const helpMessage = ValidationHelper.getValidationMessage(currentQuestion);
        this.bot.sendMessage(chatId, `❌ ${validation.message}\n\n💡 ${helpMessage}`);
        return;
      }

      // Store the response
      candidate.responses[currentQuestion.field] = response.trim();
      candidate.currentStep++;
      candidate.updatedAt = new Date();

      if (candidate.currentStep >= questionSet.questions.length) {
        candidate.isCompleted = true;
        await candidate.save();
        
        // Send completion message
        let completionMessage = `🎉 *Application Submitted Successfully!*\n\n`;
        completionMessage += `📋 Question Set: ${questionSet.title}\n\n`;
        completionMessage += "Thank you for completing your application. ";
        completionMessage += "Our team will review it and get back to you soon.\n\n";
        completionMessage += "Use /status to view your application details anytime.";
        
        this.bot.sendMessage(chatId, completionMessage, { parse_mode: "Markdown" });
      } else {
        await candidate.save();
        
        // Small delay before asking next question for better UX
        setTimeout(() => {
          this.askNextQuestion(chatId, candidate, questionSet);
        }, 500);
      }
    } catch (error) {
      console.error('Error in processResponse:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred saving your response. Please try again.');
    }
  }

  private askNextQuestion(chatId: number, candidate: CandidateDocument, questionSet: IQuestionSet) {
    try {
      const nextQuestion = questionSet.questions.find(q => q.step === candidate.currentStep + 1);
      if (nextQuestion) {
        const progress = `[${candidate.currentStep + 1}/${questionSet.questions.length}] `;
        const questionText = progress + nextQuestion.question;
        
        // Add validation hint if needed
        const validationHint = ValidationHelper.getValidationMessage(nextQuestion);
        const fullMessage = validationHint ? `${questionText}\n\n💡 ${validationHint}` : questionText;
        
        this.bot.sendMessage(chatId, fullMessage);
      }
    } catch (error) {
      console.error('Error in askNextQuestion:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred. Please try /restart to begin again.');
    }
  }

  // Method to stop the bot gracefully
  public stopBot() {
    try {
      this.bot.stopPolling();
      console.log('Telegram bot stopped');
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  }
}