import { Candidate, CandidateDocument } from "../models/candidate.model";

export const CandidateService = {
  async createOrGet(telegramId: string, userData: Partial<CandidateDocument>) {
    let candidate = await Candidate.findOne({ telegramId });
    if (!candidate) {
      candidate = new Candidate(userData);
      await candidate.save();
    }
    return candidate;
  },

  async update(telegramId: string, updateData: Partial<CandidateDocument>) {
    return Candidate.findOneAndUpdate({ telegramId }, updateData, { new: true });
  },

  async delete(telegramId: string) {
    return Candidate.findOneAndDelete({ telegramId });
  },

  async getByTelegramId(telegramId: string) {
    return Candidate.findOne({ telegramId });
  },

  async getAll(filter: any = {}) {
    return Candidate.find(filter);
  },

async getStats() {
    const total = await Candidate.countDocuments({});
    const completed = await Candidate.countDocuments({ isCompleted: true });

    return {
      totalCandidates: total,
      completedApplications: completed,
      inProgressApplications: total - completed,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : "0",
    };
  },
};
