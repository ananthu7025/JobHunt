// src/services/resume.service.ts
import { ResumeScore, JobDescription } from '../models';
import { GeminiService } from './gemini.service';
import { PDFService } from './pdf.service';
import { IScanRequest, IResumeScore } from '../types';
import fs from 'fs';
import path from 'path';

export class ResumeService {
  private geminiService = new GeminiService();

  // -----------------------
  // Instance Methods
  // -----------------------
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
      if (!jobDescription) throw new Error('Job description not found');

      // Analyze with Gemini
      const analysis = await this.geminiService.analyzeResume(
        resumeText,
        jobDescription,
        scanRequest.additionalRequirements,
        scanRequest.weightage
      );

      // Extract candidate info (fallback to PDF extraction)
      const pdfCandidateInfo = await PDFService.extractCandidateInfo(resumeText);
      const candidateInfo = {
        name: analysis.candidate_info?.name || pdfCandidateInfo.name || 'Unknown Candidate',
        email: analysis.candidate_info?.email || pdfCandidateInfo.email,
        phone: analysis.candidate_info?.phone || pdfCandidateInfo.phone
      };

      // Create ResumeScore record
      const resumeScore = new ResumeScore({
        candidateName: candidateInfo.name,
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

      // Cleanup uploaded file
      await ResumeService.deleteFile(filePath);

      return resumeScore;
    } catch (error) {
      console.error('Error scanning resume:', error);
      await ResumeService.deleteFile(filePath);
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
    if (filters.minScore !== undefined) query['scores.overall'] = { $gte: filters.minScore };

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100); // max 100 per page
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

  // -----------------------
  // Static File Helpers
  // -----------------------
  private static readonly UPLOAD_DIR = 'uploads/resumes/';
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  static async ensureUploadDirectory(): Promise<void> {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      await fs.promises.mkdir(this.UPLOAD_DIR, { recursive: true });
    }
  }

  static validateFileType(filename: string, mimeType?: string): boolean {
    const extension = path.extname(filename).toLowerCase();
    const isValidExtension = this.ALLOWED_EXTENSIONS.includes(extension);
    const isValidMimeType = !mimeType || this.ALLOWED_MIME_TYPES.includes(mimeType);
    return isValidExtension && isValidMimeType;
  }

  static validateFileSize(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  static async getFileStats(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    modifiedAt?: Date;
  }> {
    try {
      if (!fs.existsSync(filePath)) return { exists: false };
      const stats = await fs.promises.stat(filePath);
      return { exists: true, size: stats.size, modifiedAt: stats.mtime };
    } catch (error) {
      console.error('Error getting file stats:', error);
      return { exists: false };
    }
  }

  static async cleanupOrphanedFiles(): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const results = { deletedCount: 0, errors: [] as string[] };
    try {
      if (!fs.existsSync(this.UPLOAD_DIR)) return results;
      const files = await fs.promises.readdir(this.UPLOAD_DIR);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        try {
          const filePath = path.join(this.UPLOAD_DIR, file);
          const stats = await fs.promises.stat(filePath);
          if (stats.mtime < sevenDaysAgo) {
            await fs.promises.unlink(filePath);
            results.deletedCount++;
          }
        } catch (error) {
          results.errors.push(`Error processing file ${file}: ${error}`);
        }
      }
    } catch (error) {
      results.errors.push(`Error reading upload directory: ${error}`);
    }
    return results;
  }

  static getUploadDirectory(): string { return this.UPLOAD_DIR; }
  static getMaxFileSize(): number { return this.MAX_FILE_SIZE; }
  static getAllowedExtensions(): string[] { return [...this.ALLOWED_EXTENSIONS]; }
  static getAllowedMimeTypes(): string[] { return [...this.ALLOWED_MIME_TYPES]; }
}

// -----------------------
// Export helper functions
// -----------------------
export const resumeHelpers = {
  formatFileSize: ResumeService.formatFileSize.bind(ResumeService),
  validateFileType: ResumeService.validateFileType.bind(ResumeService),
  validateFileSize: ResumeService.validateFileSize.bind(ResumeService),
  deleteFile: ResumeService.deleteFile.bind(ResumeService),
  getFileStats: ResumeService.getFileStats.bind(ResumeService)
};
