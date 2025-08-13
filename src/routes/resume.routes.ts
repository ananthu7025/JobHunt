// src/routes/resume.routes.ts
import { Router } from 'express';
import { ResumeController } from '../controllers/resume.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { uploadResume } from '../middleware/upload.middleware';
import { resumeSchemas } from '../utils/validation';

const router = Router();
const resumeController = new ResumeController();

// All routes require authentication
router.use(authenticateToken);

// Resume scanning and analysis
router.post(
  '/scan',
  uploadResume.single('resume'),
  validateRequest(resumeSchemas.scan),
  resumeController.scanResume
);

// Get resume scores with filtering
router.get('/scores', resumeController.getResumeScores);

// Get specific resume score by ID
router.get('/scores/:id', resumeController.getResumeScoreById);

export { router as resumeRoutes };
