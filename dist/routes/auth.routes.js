"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
// src/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
exports.authRoutes = router;
// Public routes
router.post('/register', (0, validation_middleware_1.validateRequest)(validation_1.authSchemas.register), auth_controller_1.AuthController.register);
router.post('/login', (0, validation_middleware_1.validateRequest)(validation_1.authSchemas.login), auth_controller_1.AuthController.login);
// Protected routes
router.get('/profile', auth_middleware_1.authenticateToken, auth_controller_1.AuthController.getProfile);
//# sourceMappingURL=auth.routes.js.map