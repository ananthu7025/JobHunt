import { Router } from "express";
import { BotController } from "../controllers/bot.controller";

const router = Router();

router.get("/stats", BotController.getStats);
router.post("/broadcast", BotController.broadcast);

export default router;
