"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeService = void 0;
// src/services/resume.service.ts
const models_1 = require("../models");
const gemini_service_1 = require("./gemini.service");
const pdf_service_1 = require("./pdf.service");
const fs_1 = __importDefault(require("fs"));
class ResumeService {
    constructor() {
        this.geminiService = new gemini_service_1.GeminiService();
    }
    async scanResume(filePath, fileName, scanRequest, scannedBy) {
        try {
            // Extract text from resume
            const resumeText = await pdf_service_1.PDFService.extractTextFromPDF(filePath);
            // Get job description
            const jobDescription = await models_1.JobDescription.findById(scanRequest.jobId);
            if (!jobDescription) {
                throw new Error('Job description not found');
            }
            // Analyze with Gemini
            const analysis = await this.geminiService.analyzeResume(resumeText, jobDescription, scanRequest.additionalRequirements, scanRequest.weightage);
            // Extract candidate info if not provided by Gemini
            const candidateInfo = analysis.candidate_info ||
                await pdf_service_1.PDFService.extractCandidateInfo(resumeText);
            // Create resume score record
            const resumeScore = new models_1.ResumeScore({
                candidateName: candidateInfo.name || 'Unknown Candidate',
                candidateEmail: candidateInfo.email,
                candidatePhone: candidateInfo.phone,
                resumeText,
                jobId: scanRequest.jobId,
                scores: {
                    overall: analysis.overall_score,
                    skillsMatch: analysis.skills_match_score,
                    experienceMatch: analysis.experience_match_score,
                    educationMatch: analysis.education_match_score,
                    keywordsMatch: analysis.keywords_match_score,
                },
                analysis: {
                    matchedSkills: analysis.matched_skills,
                    missingSkills: analysis.missing_skills,
                    experienceAnalysis: analysis.experience_analysis,
                    strengthsAndWeaknesses: analysis.strengths_and_weaknesses,
                    recommendations: analysis.recommendations,
                },
                resumeFileName: fileName,
                scannedBy,
            });
            await resumeScore.save();
            // Clean up uploaded file
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            return resumeScore;
        }
        catch (error) {
            // Clean up uploaded file in case of error
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            throw error;
        }
    }
    async getResumeScores(filters) {
        const query = {};
        if (filters.jobId)
            query.jobId = filters.jobId;
        if (filters.scannedBy)
            query.scannedBy = filters.scannedBy;
        if (filters.minScore)
            query['scores.overall'] = { $gte: filters.minScore };
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const [scores, total] = await Promise.all([
            models_1.ResumeScore.find(query)
                .populate('jobId', 'title company')
                .populate('scannedBy', 'name email')
                .sort({ 'scores.overall': -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            models_1.ResumeScore.countDocuments(query)
        ]);
        return {
            scores,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                count: total
            }
        };
    }
}
exports.ResumeService = ResumeService;
//# sourceMappingURL=resume.service.js.map