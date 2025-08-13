import { Router } from "express";
import { CandidateController } from "../controllers/candidate.controller";

const router = Router();

router.get("/", CandidateController.getAllCompleted);
router.get("/all/list", CandidateController.getAll);
router.get("/:telegramId", CandidateController.getByTelegramId);
router.delete("/:telegramId", CandidateController.delete);

export default router;
