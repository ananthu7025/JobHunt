// src/services/candidate.service.ts
import { Candidate, CandidateDocument } from "../models/candidate.model";
import { ResumeScore } from "../models/ResumeScore.model";
import { QuestionSetService } from "./questionSet.service";
import mongoose from "mongoose";

export const CandidateService = {
  async createOrGet(telegramId: string, userData: Partial<CandidateDocument>) {
    let candidate = await Candidate.findOne({ telegramId });
    
    if (!candidate) {
      // If no question set specified, use default
      if (!userData.questionSetId) {
        const defaultQuestionSet = await QuestionSetService.getDefault();
        if (!defaultQuestionSet) {
          throw new Error("No default question set available");
        }
        userData.questionSetId = defaultQuestionSet._id;
      }
      
      // Ensure questionSetId is stored as ObjectId, not the full document
      if (userData.questionSetId && typeof userData.questionSetId === 'object' && userData.questionSetId._id) {
        userData.questionSetId = userData.questionSetId._id;
      }
      
      candidate = new Candidate(userData);
      await candidate.save();
    } else {
      // Update existing candidate with new question set if provided
      if (userData.questionSetId) {
        // Extract ObjectId if full document is passed
        const newQuestionSetId = typeof userData.questionSetId === 'object' && userData.questionSetId._id 
          ? userData.questionSetId._id 
          : userData.questionSetId;
          
        if (newQuestionSetId.toString() !== candidate.questionSetId.toString()) {
          candidate.questionSetId = newQuestionSetId;
          candidate.currentStep = 0; // Reset progress for new question set
          candidate.responses = {}; // Clear previous responses
          candidate.isCompleted = false;
          await candidate.save();
        }
      }
    }
    
    return candidate;
  },

  async update(telegramId: string, updateData: Partial<CandidateDocument>) {
    return Candidate.findOneAndUpdate(
      { telegramId }, 
      { ...updateData, updatedAt: new Date() }, 
      { new: true }
    );
  },

  async delete(telegramId: string) {
    return Candidate.findOneAndDelete({ telegramId });
  },

  // FIXED: Don't populate questionSetId when it will be used as an ID
  async getByTelegramId(telegramId: string) {
    return Candidate.findOne({ telegramId });
  },

  // Separate method for when you need the populated questionSet data
  async getByTelegramIdWithQuestionSet(telegramId: string) {
    return Candidate.findOne({ telegramId }).populate('questionSetId');
  },

  async getAll(filter: any = {}) {
    return Candidate.find(filter)
      .populate('questionSetId', 'title description')
      .sort({ createdAt: -1 });
  },

  async getAllWithQuestionSet(questionSetId?: string) {
    const filter = questionSetId ? { questionSetId } : {};
    return Candidate.find(filter)
      .populate('questionSetId', 'title description')
      .sort({ createdAt: -1 });
  },

  async getStats(questionSetId?: string) {
    const filter = questionSetId ? { questionSetId } : {};
    
    const [total, completed, byQuestionSet] = await Promise.all([
      Candidate.countDocuments(filter),
      Candidate.countDocuments({ ...filter, isCompleted: true }),
      Candidate.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$questionSetId',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'questionsets',
            localField: '_id',
            foreignField: '_id',
            as: 'questionSet'
          }
        },
        {
          $unwind: '$questionSet'
        },
        {
          $project: {
            questionSetTitle: '$questionSet.title',
            total: 1,
            completed: 1,
            completionRate: {
              $multiply: [
                { $divide: ['$completed', '$total'] },
                100
              ]
            }
          }
        }
      ])
    ]);

    return {
      totalCandidates: total,
      completedApplications: completed,
      inProgressApplications: total - completed,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : "0",
      byQuestionSet
    };
  },

  async getResponsesByField(questionSetId: string, field: string) {
    const candidates = await Candidate.find({
      questionSetId,
      isCompleted: true,
      [`responses.${field}`]: { $exists: true, $ne: null }
    });

    return candidates.map(candidate => ({
      telegramId: candidate.telegramId,
      response: candidate.responses[field],
      createdAt: candidate.createdAt
    }));
  },

  async rankCandidates(jobId: string, limit: number = 10) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new Error("Invalid jobId format");
    }

    return ResumeScore.aggregate([
      { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
      { $sort: { "scores.overall": -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          candidateName: 1,
          candidateEmail: 1,
          overallScore: "$scores.overall",
          skillsMatch: "$scores.skillsMatch",
          experienceMatch: "$scores.experienceMatch",
          jobId: 1,
          resumeFileName: 1,
        },
      },
    ]);
  }
};
