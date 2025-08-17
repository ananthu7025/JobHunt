// src/services/candidate.service.ts
import { Candidate, CandidateDocument } from "../models/candidate.model";
import mongoose from "mongoose";
import { ResumeScore } from "../models/ResumeScore.model";

interface IResumeScore {
  candidateId: mongoose.Types.ObjectId;
  score: number;
  feedback: string;
}

interface CandidateData {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  currentStep: number;
  questionSetId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
}

export const CandidateService = {
  // Get candidate by telegram ID for a specific question set (job)
  async getByTelegramIdAndQuestionSet(
    telegramId: string,
    questionSetId: string
  ): Promise<CandidateDocument | null> {
    try {
      return await Candidate.findOne({
        telegramId,
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
      });
    } catch (error) {
      console.error(
        "Error getting candidate by telegramId and questionSetId:",
        error
      );
      return null;
    }
  },

  // Get the most recent application for a telegram user (prioritize incomplete ones)
  async getByTelegramId(telegramId: string): Promise<CandidateDocument | null> {
    try {
      return await Candidate.findOne({ telegramId }).sort({
        isCompleted: 1,
        updatedAt: -1,
      }); // incomplete first, then by most recent
    } catch (error) {
      console.error("Error getting candidate by telegramId:", error);
      return null;
    }
  },

  // Get all applications for a telegram user
  async getAllByTelegramId(telegramId: string): Promise<CandidateDocument[]> {
    try {
      return await Candidate.find({ telegramId })
        .populate("questionSetId")
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error getting all candidates by telegramId:", error);
      return [];
    }
  },

  // Get active (incomplete) application for a telegram user
  async getActiveByTelegramId(
    telegramId: string
  ): Promise<CandidateDocument | null> {
    try {
      return await Candidate.findOne({
        telegramId,
        isCompleted: false,
      }).sort({ updatedAt: -1 });
    } catch (error) {
      console.error("Error getting active candidate by telegramId:", error);
      return null;
    }
  },

  // Create new candidate application or get existing one for specific job
  async createOrGet(
    telegramId: string,
    candidateData: CandidateData
  ): Promise<CandidateDocument> {
    try {
      // Check if candidate already exists for this specific question set
      const existingCandidate = await Candidate.findOne({
        telegramId,
        questionSetId: candidateData.questionSetId,
      });

      if (existingCandidate) {
        // Update existing candidate data if needed
        existingCandidate.username =
          candidateData.username || existingCandidate.username;
        existingCandidate.firstName =
          candidateData.firstName || existingCandidate.firstName;
        existingCandidate.lastName =
          candidateData.lastName || existingCandidate.lastName;
        existingCandidate.updatedAt = new Date();

        await existingCandidate.save();
        return existingCandidate;
      }

      // Create new candidate application for this job
      const newCandidate = new Candidate({
        telegramId: candidateData.telegramId,
        username: candidateData.username,
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        currentStep: candidateData.currentStep,
        questionSetId: candidateData.questionSetId,
        jobId: candidateData.jobId,
        responses: {},
        isCompleted: false,
      });

      await newCandidate.save();
      return newCandidate;
    } catch (error) {
      console.error("Error creating or getting candidate:", error);
      throw error;
    }
  },

  // Create a new candidate application
  async create(candidateData: CandidateData): Promise<CandidateDocument> {
    try {
      const candidate = new Candidate({
        telegramId: candidateData.telegramId,
        username: candidateData.username,
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        currentStep: candidateData.currentStep,
        questionSetId: candidateData.questionSetId,
        jobId: candidateData.jobId,
        responses: {},
        isCompleted: false,
      });

      await candidate.save();
      return candidate;
    } catch (error) {
      console.error("Error creating candidate:", error);
      throw error;
    }
  },

  // Update candidate
  async update(
    candidateId: string,
    updateData: Partial<CandidateDocument>
  ): Promise<CandidateDocument | null> {
    try {
      return await Candidate.findByIdAndUpdate(
        candidateId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error("Error updating candidate:", error);
      return null;
    }
  },

  // Delete all applications for a telegram user
  async delete(telegramId: string): Promise<boolean> {
    try {
      await Candidate.deleteMany({ telegramId });
      return true;
    } catch (error) {
      console.error("Error deleting candidates:", error);
      return false;
    }
  },

  // Delete specific application
  async deleteApplication(
    telegramId: string,
    questionSetId: string
  ): Promise<boolean> {
    try {
      await Candidate.deleteOne({
        telegramId,
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
      });
      return true;
    } catch (error) {
      console.error("Error deleting specific application:", error);
      return false;
    }
  },

  // Get candidate by ID
  async getById(candidateId: string): Promise<CandidateDocument | null> {
    try {
      return await Candidate.findById(candidateId).populate("questionSetId");
    } catch (error) {
      console.error("Error getting candidate by ID:", error);
      return null;
    }
  },

  // Get all candidates for a specific question set (job applications)
  async getByQuestionSetId(
    questionSetId: string
  ): Promise<CandidateDocument[]> {
    try {
      return await Candidate.find({
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error getting candidates by question set ID:", error);
      return [];
    }
  },

  // Get completed applications for a specific question set
  async getCompletedByQuestionSetId(
    questionSetId: string
  ): Promise<CandidateDocument[]> {
    try {
      return await Candidate.find({
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
        isCompleted: true,
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error(
        "Error getting completed candidates by question set ID:",
        error
      );
      return [];
    }
  },

  // Check if user has applied for a specific job
  async hasAppliedForJob(
    telegramId: string,
    questionSetId: string
  ): Promise<boolean> {
    try {
      const application = await Candidate.findOne({
        telegramId,
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
      });
      return !!application;
    } catch (error) {
      console.error("Error checking if user applied for job:", error);
      return false;
    }
  },

  // Get application status for a specific job
  async getApplicationStatus(
    telegramId: string,
    questionSetId: string
  ): Promise<{
    exists: boolean;
    isCompleted: boolean;
    progress: { current: number; total: number } | null;
    application: CandidateDocument | null;
  }> {
    try {
      const application = await Candidate.findOne({
        telegramId,
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
      }).populate("questionSetId");

      if (!application) {
        return {
          exists: false,
          isCompleted: false,
          progress: null,
          application: null,
        };
      }

      const questionSet = application.questionSetId as any;
      const totalQuestions = questionSet?.questions?.length || 0;

      return {
        exists: true,
        isCompleted: application.isCompleted,
        progress: {
          current: application.currentStep,
          total: totalQuestions,
        },
        application,
      };
    } catch (error) {
      console.error("Error getting application status:", error);
      return {
        exists: false,
        isCompleted: false,
        progress: null,
        application: null,
      };
    }
  },

  // Get all candidates with optional filtering
  async getAll(filter: any = {}): Promise<CandidateDocument[]> {
    try {
      const query: any = {};
      if (filter.isCompleted !== undefined) {
        query.isCompleted = filter.isCompleted;
      }
      if (filter.questionSetId) {
        query.questionSetId = new mongoose.Types.ObjectId(filter.questionSetId);
      }
      return await Candidate.find(query)
        .populate("questionSetId")
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error("Error getting all candidates:", error);
      return [];
    }
  },

  // Get all responses for a specific field from completed applications
  async getResponsesByField(
    questionSetId: string,
    field: string
  ): Promise<any[]> {
    try {
      const candidates = await Candidate.find({
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
        isCompleted: true,
      });

      return candidates
        .map((c) => (c.responses as any)[field])
        .filter((response) => response !== undefined);
    } catch (error) {
      console.error("Error getting responses by field:", error);
      return [];
    }
  },

  // Rank candidates based on resume scores
  async rankCandidates(questionSetId: string, limit: number): Promise<any[]> {
    try {
      const candidates = await Candidate.find({
        questionSetId: new mongoose.Types.ObjectId(questionSetId),
        isCompleted: true,
      }).lean();

      const candidateIds = candidates.map((c) => c._id);
      const scores: IResumeScore[] = await ResumeScore.find({
        candidateId: { $in: candidateIds },
      })
        .sort({ score: -1 })
        .lean();

      const rankedCandidates = scores.map((score) => {
        const candidate = candidates.find((c) =>
          c._id.equals(score.candidateId)
        );
        return {
          ...candidate,
          scoreDetails: {
            score: score.score,
            feedback: score.feedback,
          },
        };
      });

      const scoredCandidateIds = scores.map((s) => s.candidateId.toString());
      const unscoredCandidates = candidates
        .filter((c) => !scoredCandidateIds.includes(c._id.toString()))
        .map((c) => ({ ...c, scoreDetails: null }));

      const fullRankedList = [...rankedCandidates, ...unscoredCandidates];

      return fullRankedList.slice(0, limit);
    } catch (error) {
      console.error("Error ranking candidates:", error);
      return [];
    }
  },

  // Get statistics for admin/HR
  async getStats(questionSetId?: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    withResume: number;
  }> {
    try {
      const filter: any = {};
      if (questionSetId) {
        filter.questionSetId = new mongoose.Types.ObjectId(questionSetId);
      }

      const total = await Candidate.countDocuments(filter);
      const completed = await Candidate.countDocuments({
        ...filter,
        isCompleted: true,
      });
      const inProgress = await Candidate.countDocuments({
        ...filter,
        isCompleted: false,
      });
      const withResume = await Candidate.countDocuments({
        ...filter,
        $and: [
          { "responses.resumeFileName": { $exists: true } },
          { "responses.resumeFileName": { $ne: null } },
          { "responses.resumeFileName": { $ne: "" } },
        ],
      });

      return {
        total,
        completed,
        inProgress,
        withResume,
      };
    } catch (error) {
      console.error("Error getting candidate stats:", error);
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        withResume: 0,
      };
    }
  },
};
