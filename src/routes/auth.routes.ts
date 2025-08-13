// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { authSchemas } from '../utils/validation';

const router = Router();

// Public routes
router.post('/register', validateRequest(authSchemas.register), AuthController.register);
router.post('/login', validateRequest(authSchemas.login), AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);

export { router as authRoutes };
