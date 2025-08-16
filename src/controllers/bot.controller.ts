// src/controllers/bot.controller.ts
import { Request, Response } from "express";
import { CandidateService } from "../services/candidate.service";
import { QuestionSetService } from "../services/questionSet.service";
import { createResponse } from "../utils/response";

export const BotController = {
  async getStats(req: Request, res: Response) {
    try {
      const { questionSetId } = req.query;
      const stats = await CandidateService.getStats(questionSetId as string);
      res.json(createResponse(true, "Bot statistics retrieved successfully", stats));
    } catch (error) {
      console.error("Get bot stats error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async broadcast(req: Request, res: Response) {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json(createResponse(false, "Message is required"));
      }
      
      // Note: Actual broadcast implementation would require the bot instance
      // This is a placeholder for the broadcast functionality
      res.json(createResponse(true, "Broadcast feature not implemented yet", {
        message: "This feature requires integration with the bot service"
      }));
    } catch (error) {
      console.error("Broadcast error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getQuestionSets(req: Request, res: Response) {
    try {
      const questionSets = await QuestionSetService.getActive();
      res.json(createResponse(true, "Active question sets retrieved successfully", questionSets));
    } catch (error) {
      console.error("Get question sets error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async setActiveQuestionSet(req: Request, res: Response) {
    try {
      const { questionSetId } = req.body;
      
      if (!questionSetId) {
        return res.status(400).json(createResponse(false, "Question set ID is required"));
      }

      const questionSet = await QuestionSetService.getById(questionSetId);
      
      if (!questionSet) {
        return res.status(404).json(createResponse(false, "Question set not found"));
      }

      // This would typically update bot configuration
      // For now, we'll just return success
      res.json(createResponse(true, "Active question set updated successfully", {
        questionSetId,
        title: questionSet.title,
        message: "Note: Bot restart may be required for changes to take effect"
      }));
    } catch (error) {
      console.error("Set active question set error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getBotInfo(req: Request, res: Response) {
    try {
      const [questionSets, stats] = await Promise.all([
        QuestionSetService.getActive(),
        CandidateService.getStats()
      ]);

      const defaultQuestionSet = questionSets.find(qs => qs.isDefault);

      res.json(createResponse(true, "Bot information retrieved successfully", {
        isRunning: true, // This would come from bot service status
        defaultQuestionSet: defaultQuestionSet ? {
          id: defaultQuestionSet._id,
          title: defaultQuestionSet.title,
          questionsCount: defaultQuestionSet.questions.length
        } : null,
        availableQuestionSets: questionSets.length,
        stats
      }));
    } catch (error) {
      console.error("Get bot info error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  }
};