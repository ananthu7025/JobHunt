import TelegramBot from "node-telegram-bot-api";
import { CandidateService } from "../services/candidate.service";
import { CandidateResponses, questions } from "../config/questions";
import { CandidateDocument } from "../models/candidate.model";

export class TelegramHiringBotService {
  private bot: TelegramBot;
  private readonly token: string = process.env.TELEGRAM_BOT_TOKEN || "8309639217:AAEQwAu_3zsjwzOK2GIQUNV3_GONfc8-GsI";

  constructor() {
    this.bot = new TelegramBot(this.token, { polling: true });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.onText(/\/start/, (msg: any) => this.handleStart(msg));
    this.bot.onText(/\/restart/, (msg: any) => this.handleRestart(msg));
    this.bot.onText(/\/status/, (msg: any) => this.handleStatus(msg));
    this.bot.on("message", (msg: any) => this.handleMessage(msg));
  }

  private async handleStart(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";

      let candidate = await CandidateService.getByTelegramId(telegramId);

      if (candidate?.isCompleted) {
        this.bot.sendMessage(chatId, "✅ You have already completed the hiring process!");
        return;
      }

      candidate = await CandidateService.createOrGet(telegramId, {
        telegramId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        currentStep: 0,
      });

      this.askNextQuestion(chatId, candidate);
    } catch (error) {
      console.error('Error in handleStart:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.');
    }
  }

  private async handleRestart(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || "";
      
      await CandidateService.delete(telegramId);
      
      const candidate = await CandidateService.createOrGet(telegramId, {
        telegramId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        currentStep: 0,
      });
      
      this.bot.sendMessage(chatId, "🔄 Process restarted!");
      this.askNextQuestion(chatId, candidate);
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
        this.bot.sendMessage(chatId, "❌ No application found. Use /start to begin.");
        return;
      }

      if (candidate.isCompleted) {
        let message = "📊 *Application Status*\n✅ Completed\n\n";
        
        // Define the expected fields to match your CandidateResponses interface
        const fields = [
          { key: 'name', label: '👤 Name' },
          { key: 'email', label: '📧 Email' },
          { key: 'phone', label: '📱 Phone' },
          { key: 'position', label: '💼 Position' },
          { key: 'experience', label: '🎯 Experience' },
          { key: 'skills', label: '🛠️ Skills' },
          { key: 'availability', label: '📅 Availability' },
          { key: 'expectedSalary', label: '💰 Expected Salary' },
          { key: 'portfolio', label: '🌐 Portfolio' },
          { key: 'additionalInfo', label: '💭 Additional Info' }
        ];

        // Only include actual response fields, not Mongoose internals
        for (const field of fields) {
          const value = candidate.responses[field.key as keyof typeof candidate.responses];
          if (value && typeof value === 'string') {
            // Truncate long values to prevent message overflow
            const truncatedValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
            message += `• *${field.label}*: ${truncatedValue}\n`;
          }
        }

        // Add submission date
        if (candidate.createdAt) {
          message += `\n📅 *Submitted*: ${candidate.createdAt.toLocaleDateString()}\n`;
        }

        // Check if message is still too long (Telegram limit is ~4096 chars)
        if (message.length > 4000) {
          message = "📊 *Application Status*\n✅ Completed\n\n";
          message += "✨ Your application has been successfully submitted!\n";
          if (candidate.createdAt) {
            message += `📅 Submitted: ${candidate.createdAt.toLocaleDateString()}\n`;
          }
          message += "\n💡 Contact admin for full application details.";
        }

        await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } else {
        const progress = `${candidate.currentStep}/${questions.length}`;
        const percentage = Math.round((candidate.currentStep / questions.length) * 100);
        
        let message = `⏳ *Application Status*\n`;
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
        this.bot.sendMessage(chatId, "❌ Please start with /start");
        return;
      }
      
      if (candidate.isCompleted) {
        this.bot.sendMessage(chatId, "✅ You already completed the application.");
        return;
      }
      
      await this.processResponse(chatId, candidate, msg.text);
    } catch (error) {
      console.error('Error in handleMessage:', error);
      this.bot.sendMessage(msg.chat.id, '❌ An error occurred processing your message. Please try again.');
    }
  }

  private async processResponse(chatId: number, candidate: CandidateDocument, response: string) {
    try {
      const currentQuestion = questions.find(q => q.step === candidate.currentStep + 1);
      if (!currentQuestion) return;

      if (!currentQuestion.validation(response)) {
        // Provide specific validation messages based on field
        const fieldMessages: Record<keyof CandidateResponses, string> = {
          name: "Please provide a valid name (at least 3 characters).",
          email: "Please provide a valid email address (example@domain.com).",
          phone: "Please provide a valid phone number (at least 9 characters).",
          position: "Please specify the position you're applying for.",
          experience: "Please provide your years of experience (number or text like '3 years').",
          skills: "Please list your skills (at least 10 characters, separated by commas).",
          availability: "Please specify when you can start working.",
          expectedSalary: "Please provide your expected salary range.",
          portfolio: "Please provide a portfolio link or type 'none'.",
          additionalInfo: "Please share some additional information (at least 5 characters)."
        };

        const validationMessage = fieldMessages[currentQuestion.field] || 'Please provide a valid response.';
        this.bot.sendMessage(chatId, `❌ ${validationMessage}`);
        return;
      }

      // Store the response
      candidate.responses[currentQuestion.field] = response;
      candidate.currentStep++;
      candidate.updatedAt = new Date();

      if (candidate.currentStep >= questions.length) {
        candidate.isCompleted = true;
        await candidate.save();
        
        // Send completion message with summary
        let completionMessage = "🎉 *Application Submitted Successfully!*\n\n";
        completionMessage += "Thank you for completing your application. ";
        completionMessage += "Our team will review it and get back to you soon.\n\n";
        completionMessage += "Use /status to view your application details anytime.";
        
        this.bot.sendMessage(chatId, completionMessage, { parse_mode: "Markdown" });
      } else {
        await candidate.save();
        
        // Small delay before asking next question for better UX
        setTimeout(() => {
          this.askNextQuestion(chatId, candidate);
        }, 500);
      }
    } catch (error) {
      console.error('Error in processResponse:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred saving your response. Please try again.');
    }
  }

  private askNextQuestion(chatId: number, candidate: CandidateDocument) {
    try {
      const nextQuestion = questions.find(q => q.step === candidate.currentStep + 1);
      if (nextQuestion) {
        const progress = `[${candidate.currentStep + 1}/${questions.length}] `;
        const questionText = progress + nextQuestion.question;
        
        this.bot.sendMessage(chatId, questionText);
      }
    } catch (error) {
      console.error('Error in askNextQuestion:', error);
      this.bot.sendMessage(chatId, '❌ An error occurred. Please try /restart to begin again.');
    }
  }

  // Utility method to split long messages if needed
  private async sendLongMessage(chatId: number, fullMessage: string, parseMode: "Markdown" | "HTML" = "Markdown") {
    const maxLength = 4000; // Leave buffer under Telegram's 4096 limit
    
    if (fullMessage.length <= maxLength) {
      await this.bot.sendMessage(chatId, fullMessage, { parse_mode: parseMode });
      return;
    }

    // Split message into chunks
    const chunks = [];
    let currentChunk = "";
    
    const lines = fullMessage.split('\n');
    
    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = line + '\n';
        } else {
          // Single line is too long, truncate it
          chunks.push(line.substring(0, maxLength - 3) + '...');
        }
      } else {
        currentChunk += line + '\n';
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Send chunks with small delay
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prefix = i === 0 ? '' : `📄 *Part ${i + 1}/${chunks.length}*\n\n`;
      
      await this.bot.sendMessage(chatId, prefix + chunk, { parse_mode: parseMode });
      
      // Small delay between messages to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
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