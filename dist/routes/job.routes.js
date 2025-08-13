"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRoutes = void 0;
// src/routes/job.routes.ts
const express_1 = require("express");
const job_controller_1 = require("../controllers/job.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
exports.jobRoutes = router;
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Job CRUD operations
router.post('/', (0, validation_middleware_1.validateRequest)(validation_1.jobSchemas.create), job_controller_1.JobController.createJob);
router.get('/', job_controller_1.JobController.getAllJobs);
router.get('/:id', job_controller_1.JobController.getJobById);
router.put('/:id', (0, validation_middleware_1.validateRequest)(validation_1.jobSchemas.update), job_controller_1.JobController.updateJob);
router.delete('/:id', job_controller_1.JobController.deleteJob);
//# sourceMappingURL=job.routes.js.map