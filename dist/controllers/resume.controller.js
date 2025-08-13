"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const resume_service_1 = require("../services/resume.service");
const response_1 = require("../utils/response");
class ResumeController {
    constructor() {
        this.resumeService = new resume_service_1.ResumeService();
        this.scanResume = async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json((0, response_1.createResponse)(false, 'Resume file is required'));
                }
                const scanRequest = req.body;
                const result = await this.resumeService.scanResume(req.file.path, req.file.filename, scanRequest, req.user.userId);
                res.json((0, response_1.createResponse)(true, 'Resume scanned successfully', result));
            }
            catch (error) {
                console.error('Resume scan error:', error);
                res.status(500).json((0, response_1.createResponse)(false, 'Failed to scan resume', undefined, error.message));
            }
        };
        this.getResumeScores = async (req, res) => {
            try {
                const filters = {
                    jobId: req.query.jobId,
                    scannedBy: req.user.role === 'admin' ? req.query.scannedBy : req.user.userId,
                    minScore: req.query.minScore ? parseInt(req.query.minScore) : undefined,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10,
                    page: req.query.page ? parseInt(req.query.page) : 1,
                };
                const result = await this.resumeService.getResumeScores(filters);
                res.json((0, response_1.createResponse)(true, 'Resume scores retrieved successfully', result));
            }
            catch (error) {
                console.error('Get resume scores error:', error);
                res.status(500).json((0, response_1.createResponse)(false, 'Failed to retrieve resume scores', undefined, error.message));
            }
        };
        this.getResumeScoreById = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.resumeService.getResumeScores({
                    scannedBy: req.user.role === 'admin' ? undefined : req.user.userId
                });
                const resumeScore = result.scores.find(score => score._id.toString() === id);
                if (!resumeScore) {
                    return res.status(404).json((0, response_1.createResponse)(false, 'Resume score not found'));
                }
                res.json((0, response_1.createResponse)(true, 'Resume score retrieved successfully', resumeScore));
            }
            catch (error) {
                console.error('Get resume score error:', error);
                res.status(500).json((0, response_1.createResponse)(false, 'Failed to retrieve resume score', undefined, error.message));
            }
        };
    }
}
exports.ResumeController = ResumeController;
//# sourceMappingURL=resume.controller.js.map