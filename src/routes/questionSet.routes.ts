import { Router } from 'express';
import { QuestionSetController } from '../controllers/questionSet.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Protected routes (assuming only authenticated users can manage question sets)
router.post('/', authenticateToken, QuestionSetController.createQuestionSet);
router.get('/:setId', authenticateToken, QuestionSetController.getQuestionSet);
router.put('/:setId', authenticateToken, QuestionSetController.updateQuestionSet);
router.delete('/:setId', authenticateToken, QuestionSetController.deleteQuestionSet);

export { router as questionSetRoutes };
