// src/controllers/candidate.controller.ts
import { Request, Response } from "express";
import { CandidateService } from "../services/candidate.service";
import { createResponse } from "../utils/response";

export const CandidateController = {
  async getAllCompleted(req: Request, res: Response) {
    try {
      const { questionSetId } = req.query;
    const filter = { isCompleted: true } as { isCompleted: boolean; questionSetId?: string };

if (questionSetId) {
  filter.questionSetId = questionSetId as string;
}

      const candidates = await CandidateService.getAll(filter);
      res.json(createResponse(true, "Completed candidates retrieved successfully", candidates));
    } catch (error) {
      console.error("Get completed candidates error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const { questionSetId } = req.query;
      const candidates = await CandidateService.getAllWithQuestionSet(questionSetId as string);
      res.json(createResponse(true, "Candidates retrieved successfully", candidates));
    } catch (error) {
      console.error("Get candidates error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getByTelegramId(req: Request, res: Response) {
    try {
      const candidate = await CandidateService.getByTelegramId(req.params.telegramId);
      if (!candidate) {
        return res.status(404).json(createResponse(false, "Candidate not found"));
      }
      res.json(createResponse(true, "Candidate retrieved successfully", candidate));
    } catch (error) {
      console.error("Get candidate error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const candidate = await CandidateService.delete(req.params.telegramId);
      if (!candidate) {
        return res.status(404).json(createResponse(false, "Candidate not found"));
      }
      res.json(createResponse(true, "Candidate deleted successfully"));
    } catch (error) {
      console.error("Delete candidate error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const { questionSetId } = req.query;
      const stats = await CandidateService.getStats(questionSetId as string);
      res.json(createResponse(true, "Statistics retrieved successfully", stats));
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getResponsesByField(req: Request, res: Response) {
    try {
      const { questionSetId, field } = req.params;
      const responses = await CandidateService.getResponsesByField(questionSetId, field);
      res.json(createResponse(true, "Field responses retrieved successfully", responses));
    } catch (error) {
      console.error("Get field responses error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async exportCandidates(req: Request, res: Response) {
    try {
      const { questionSetId } = req.query;
      const candidates = await CandidateService.getAll({ 
        isCompleted: true,
        ...(questionSetId && { questionSetId })
      });

      // Format data for export
      const exportData = candidates.map(candidate => ({
        telegramId: candidate.telegramId,
        username: candidate.username,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        questionSet: candidate.questionSetId || 'Unknown',
        ...candidate.responses,
        submittedAt: candidate.createdAt,
        updatedAt: candidate.updatedAt
      }));

      res.json(createResponse(true, "Export data retrieved successfully", exportData));
    } catch (error) {
      console.error("Export candidates error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },
  
  async rankCandidates(req: Request, res: Response) {
    try {
      const { jobId, limit } = req.query;

      if (!jobId) {
        return res.status(400).json(createResponse(false, "Job ID is required"));
      }

      const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
      const rankedCandidates = await CandidateService.rankCandidates(jobId as string, parsedLimit);

      res.json(createResponse(true, "Candidates ranked successfully", rankedCandidates));
    } catch (error) {
      console.error("Rank candidates error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  }
};
