import { Request, Response } from "express";
import { CandidateService } from "../services/candidate.service";

export const BotController = {
  async getStats(req: Request, res: Response) {
    const stats = await CandidateService.getStats();
    res.json(stats);
  },

  async broadcast(req: Request, res: Response) {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    res.json({ message: "Broadcast feature not implemented yet" });
  },
};
