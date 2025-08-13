// src/services/resume.service.ts
import { ResumeScore, JobDescription } from '../models';
import { GeminiService } from './gemini.service';
import { PDFService } from './pdf.service';
import { IScanRequest, IResumeScore } from '../types';
import fs from 'fs';

export class ResumeService {
  private geminiService = new GeminiService();

  async scanResume(
    filePath: string,
    fileName: string,
    scanRequest: IScanRequest,
    scannedBy: string
  ): Promise<IResumeScore> {
    try {
      // Extract text from resume
      const resumeText = await PDFService.extractTextFromPDF(filePath);
      
      // Get job description
      const jobDescription = await JobDescription.findById(scanRequest.jobId);
      if (!jobDescription) {
        throw new Error('Job description not found');
      }

      // Analyze with Gemini
      const analysis = await this.geminiService.analyzeResume(
        resumeText,
        jobDescription,
        scanRequest.additionalRequirements,
        scanRequest.weightage
      );

      // Extract candidate info if not provided by Gemini
      const candidateInfo = analysis.candidate_info || 
        await PDFService.extractCandidateInfo(resumeText);

      // Create resume score record
      const resumeScore = new ResumeScore({
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
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return resumeScore;
    } catch (error) {
      // Clean up uploaded file in case of error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  async getResumeScores(filters: {
    jobId?: string;
    scannedBy?: string;
    minScore?: number;
    limit?: number;
    page?: number;
  }) {
    const query: any = {};
    
    if (filters.jobId) query.jobId = filters.jobId;
    if (filters.scannedBy) query.scannedBy = filters.scannedBy;
    if (filters.minScore) query['scores.overall'] = { $gte: filters.minScore };

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [scores, total] = await Promise.all([
      ResumeScore.find(query)
        .populate('jobId', 'title company')
        .populate('scannedBy', 'name email')
        .sort({ 'scores.overall': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ResumeScore.countDocuments(query)
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
