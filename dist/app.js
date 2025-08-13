"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const auth_routes_1 = require("./routes/auth.routes");
const job_routes_1 = require("./routes/job.routes");
const resume_routes_1 = require("./routes/resume.routes");
const response_1 = require("./utils/response");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static files for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json((0, response_1.createResponse)(true, 'Server is running'));
});
// API routes
app.use('/api/auth', auth_routes_1.authRoutes);
app.use('/api/jobs', job_routes_1.jobRoutes);
app.use('/api/resume', resume_routes_1.resumeRoutes);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json((0, response_1.createResponse)(false, 'Route not found'));
});
// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(error.status || 500).json((0, response_1.createResponse)(false, error.message || 'Internal server error', undefined, process.env.NODE_ENV === 'development' ? error.stack : undefined));
});
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        // Start listening
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map