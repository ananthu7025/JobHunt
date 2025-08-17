// src/routes/job.routes.ts
import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';
import { jobSchemas } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Job CRUD operations
router.post('/', validateRequest(jobSchemas.create), JobController.createJob);
router.get('/', JobController.getAllJobs);
router.get('/:id', JobController.getJobById);
router.put('/:id', validateRequest(jobSchemas.update), JobController.updateJob);
router.delete('/:id', JobController.deleteJob);
router.get('/:id/questionset', authenticateToken, JobController.getJobQuestionSet);

export { router as jobRoutes };
