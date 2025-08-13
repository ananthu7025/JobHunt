"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeRoutes = void 0;
// src/routes/resume.routes.ts
const express_1 = require("express");
const resume_controller_1 = require("../controllers/resume.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
exports.resumeRoutes = router;
const resumeController = new resume_controller_1.ResumeController();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Resume scanning and analysis
router.post('/scan', upload_middleware_1.uploadResume.single('resume'), (0, validation_middleware_1.validateRequest)(validation_1.resumeSchemas.scan), resumeController.scanResume);
// Get resume scores with filtering
router.get('/scores', resumeController.getResumeScores);
// Get specific resume score by ID
router.get('/scores/:id', resumeController.getResumeScoreById);
//# sourceMappingURL=resume.routes.js.map