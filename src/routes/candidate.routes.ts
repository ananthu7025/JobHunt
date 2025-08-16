// src/routes/candidate.routes.ts
import { Router } from "express";
import { CandidateController } from "../controllers/candidate.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Basic CRUD operations
router.get("/", CandidateController.getAllCompleted);
router.get("/all", CandidateController.getAll);
router.get("/stats", CandidateController.getStats);
router.get("/export", CandidateController.exportCandidates);
router.get("/:telegramId", CandidateController.getByTelegramId);
router.delete("/:telegramId", CandidateController.delete);

// Question set specific operations
router.get("/questionset/:questionSetId/responses/:field", CandidateController.getResponsesByField);

// Ranking
router.get("/rank", CandidateController.rankCandidates);

export default router;
