// src/routes/questionSet.routes.ts
import { Router } from 'express';
import { QuestionSetController } from '../controllers/questionSet.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Question Set CRUD operations
router.post('/', QuestionSetController.createQuestionSet);
router.get('/', QuestionSetController.getAllQuestionSets);
router.get('/active', QuestionSetController.getActiveQuestionSets);
router.get('/:id', QuestionSetController.getQuestionSetById);
router.put('/:id', QuestionSetController.updateQuestionSet);
router.delete('/:id', QuestionSetController.deleteQuestionSet);

// Additional operations
router.post('/:id/duplicate', QuestionSetController.duplicateQuestionSet);
router.patch('/:id/set-default', QuestionSetController.setDefaultQuestionSet);

export { router as questionSetRoutes };