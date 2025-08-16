// src/controllers/candidate.controller.ts
import { Request, Response } from "express";
import { CandidateService } from "../services/candidate.service";
import { createResponse } from "../utils/response";
import fs from 'fs';
import path from 'path';

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
      // Get candidate first to check for resume file
      const candidateToDelete = await CandidateService.getByTelegramId(req.params.telegramId);
      
      if (candidateToDelete && candidateToDelete.responses['resumeFilePath']) {
        try {
          const filePath = candidateToDelete.responses['resumeFilePath'];
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted resume file: ${filePath}`);
          }
        } catch (fileError) {
          console.error('Error deleting resume file:', fileError);
          // Continue with candidate deletion even if file deletion fails
        }
      }

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
      
      // Add resume upload statistics
      const candidates = await CandidateService.getAll(
        questionSetId ? { questionSetId: questionSetId as string } : {}
      );
      
      const resumeStats = {
        totalCandidates: candidates.length,
        withResume: candidates.filter(c => c.responses['resumeFileName']).length,
        withoutResume: candidates.filter(c => !c.responses['resumeFileName']).length,
        resumeUploadRate: candidates.length > 0 
          ? Math.round((candidates.filter(c => c.responses['resumeFileName']).length / candidates.length) * 100)
          : 0
      };

      const enhancedStats = {
        ...stats,
        resumeStats
      };

      res.json(createResponse(true, "Statistics retrieved successfully", enhancedStats));
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

      // Format data for export with resume information
      const exportData = candidates.map(candidate => ({
        telegramId: candidate.telegramId,
        username: candidate.username,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        questionSet: candidate.questionSetId || 'Unknown',
        resumeFileName: candidate.responses['resumeFileName'] || 'Not uploaded',
        resumeUploadedAt: candidate.responses['resumeUploadedAt'] || null,
        hasResume: !!candidate.responses['resumeFileName'],
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

  async downloadResume(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;
      const candidate = await CandidateService.getByTelegramId(telegramId);

      if (!candidate) {
        return res.status(404).json(createResponse(false, "Candidate not found"));
      }

      const resumeFilePath = candidate.responses['resumeFilePath'];
      if (!resumeFilePath) {
        return res.status(404).json(createResponse(false, "Resume not found for this candidate"));
      }

      if (!fs.existsSync(resumeFilePath)) {
        return res.status(404).json(createResponse(false, "Resume file not found on server"));
      }

      const fileName = candidate.responses['resumeFileName'] || 'resume';
      
      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // Stream the file
      const fileStream = fs.createReadStream(resumeFilePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json(createResponse(false, "Error downloading resume"));
        }
      });

    } catch (error) {
      console.error("Download resume error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async getResumeInfo(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;
      const candidate = await CandidateService.getByTelegramId(telegramId);

      if (!candidate) {
        return res.status(404).json(createResponse(false, "Candidate not found"));
      }

      const resumeInfo = {
        hasResume: !!candidate.responses['resumeFileName'],
        fileName: candidate.responses['resumeFileName'] || null,
        uploadedAt: candidate.responses['resumeUploadedAt'] || null,
        fileExists: candidate.responses['resumeFilePath'] ? 
          fs.existsSync(candidate.responses['resumeFilePath']) : false
      };

      res.json(createResponse(true, "Resume information retrieved successfully", resumeInfo));
    } catch (error) {
      console.error("Get resume info error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  },

  async deleteResume(req: Request, res: Response) {
    try {
      const { telegramId } = req.params;
      const candidate = await CandidateService.getByTelegramId(telegramId);

      if (!candidate) {
        return res.status(404).json(createResponse(false, "Candidate not found"));
      }

      const resumeFilePath = candidate.responses['resumeFilePath'];
      if (!resumeFilePath) {
        return res.status(404).json(createResponse(false, "No resume found for this candidate"));
      }

      // Delete the file if it exists
      if (fs.existsSync(resumeFilePath)) {
        fs.unlinkSync(resumeFilePath);
      }

      // Remove resume info from candidate record
      delete candidate.responses['resumeFileName'];
      delete candidate.responses['resumeFilePath'];
      delete candidate.responses['resumeUploadedAt'];
      candidate.updatedAt = new Date();

      await candidate.save();

      res.json(createResponse(true, "Resume deleted successfully"));
    } catch (error) {
      console.error("Delete resume error:", error);
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
  },

  async getCandidatesWithResumes(req: Request, res: Response) {
    try {
      const { questionSetId } = req.query;
      const filter = { isCompleted: true } as { isCompleted: boolean; questionSetId?: string };

      if (questionSetId) {
        filter.questionSetId = questionSetId as string;
      }

      const candidates = await CandidateService.getAll(filter);
      
      // Filter candidates who have uploaded resumes
      const candidatesWithResumes = candidates.filter(candidate => 
        candidate.responses['resumeFileName']
      );

      // Add file existence check
      const candidatesWithValidResumes = candidatesWithResumes.map(candidate => ({
        ...candidate.toObject(),
        resumeExists: candidate.responses['resumeFilePath'] ? 
          fs.existsSync(candidate.responses['resumeFilePath']) : false
      }));

      res.json(createResponse(true, "Candidates with resumes retrieved successfully", candidatesWithValidResumes));
    } catch (error) {
      console.error("Get candidates with resumes error:", error);
      res.status(500).json(
        createResponse(false, "Internal server error", undefined, (error as Error).message)
      );
    }
  }
};