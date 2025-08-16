// src/routes/bot.routes.ts
import { Router } from "express";
import { BotController } from "../controllers/bot.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Bot statistics and info
router.get("/stats", BotController.getStats);
router.get("/info", BotController.getBotInfo);

// Question set management for bot
router.get("/questionsets", BotController.getQuestionSets);
router.post("/questionsets/set-active", BotController.setActiveQuestionSet);

// Communication features
router.post("/broadcast", BotController.broadcast);

export default router;