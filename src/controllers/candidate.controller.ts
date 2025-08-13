import { Request, Response } from "express";
import { CandidateService } from "../services/candidate.service";

export const CandidateController = {
  async getAllCompleted(req: Request, res: Response) {
    const candidates = await CandidateService.getAll({ isCompleted: true });
    res.json(candidates);
  },

  async getAll(req: Request, res: Response) {
    const candidates = await CandidateService.getAll();
    res.json(candidates);
  },

  async getByTelegramId(req: Request, res: Response) {
    const candidate = await CandidateService.getByTelegramId(req.params.telegramId);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  },

  async delete(req: Request, res: Response) {
    const candidate = await CandidateService.delete(req.params.telegramId);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json({ message: "Candidate deleted" });
  },
};
