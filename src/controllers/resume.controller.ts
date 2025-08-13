//  src/controllers/resume.controller.ts
import { Request, Response } from "express";
import { ResumeService } from "../services/resume.service";
import { createResponse } from "../utils/response";
import { IScanRequest } from "../types";

export class ResumeController {
  private resumeService = new ResumeService();

  scanResume = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json(createResponse(false, "Resume file is required"));
      }

      const scanRequest: IScanRequest = req.body;

      const result = await this.resumeService.scanResume(
        req.file.path,
        req.file.filename,
        scanRequest,
        req.user!.userId
      );

      res.json(createResponse(true, "Resume scanned successfully", result));
    } catch (error) {
      console.error("Resume scan error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  };

  getResumeScores = async (req: Request, res: Response) => {
    try {
      const filters = {
        jobId: req.query.jobId as string,
        scannedBy:
          req.user!.role === "admin"
            ? (req.query.scannedBy as string)
            : req.user!.userId,
        minScore: req.query.minScore
          ? parseInt(req.query.minScore as string)
          : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
      };

      const result = await this.resumeService.getResumeScores(filters);

      res.json(
        createResponse(true, "Resume scores retrieved successfully", result)
      );
    } catch (error) {
      console.error("Get resume scores error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  };

  getResumeScoreById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.resumeService.getResumeScores({
        scannedBy: req.user!.role === "admin" ? undefined : req.user!.userId,
      });

      const resumeScore = result.scores.find(
        (score) => score._id.toString() === id
      );

      if (!resumeScore) {
        return res
          .status(404)
          .json(createResponse(false, "Resume score not found"));
      }

      res.json(
        createResponse(true, "Resume score retrieved successfully", resumeScore)
      );
    } catch (error) {
      console.error("Get resume score error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  };
}
