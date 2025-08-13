import { Document } from 'mongoose';
export interface IUser extends Document {
    _id: string;
    email: string;
    password: string;
    name: string;
    role: 'hr' | 'admin';
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export interface IJobDescription extends Document {
    _id: string;
    title: string;
    company: string;
    description: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    experience: string;
    location: string;
    jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
    salaryRange?: {
        min: number;
        max: number;
    };
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IResumeScore extends Document {
    _id: string;
    candidateName: string;
    candidateEmail?: string;
    candidatePhone?: string;
    resumeText: string;
    jobId: string;
    scores: {
        overall: number;
        skillsMatch: number;
        experienceMatch: number;
        educationMatch: number;
        keywordsMatch: number;
    };
    analysis: {
        matchedSkills: string[];
        missingSkills: string[];
        experienceAnalysis: string;
        strengthsAndWeaknesses: string;
        recommendations: string[];
    };
    resumeFileName: string;
    scannedBy: string;
    createdAt: Date;
}
export interface IScanRequest {
    jobId: string;
    additionalRequirements?: string;
    weightage?: {
        skills: number;
        experience: number;
        education: number;
        keywords: number;
    };
}
export interface IGeminiResponse {
    overall_score: number;
    skills_match_score: number;
    experience_match_score: number;
    education_match_score: number;
    keywords_match_score: number;
    matched_skills: string[];
    missing_skills: string[];
    experience_analysis: string;
    strengths_and_weaknesses: string;
    recommendations: string[];
    candidate_info?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}
export interface IApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface IAuthPayload {
    userId: string;
    email: string;
    role: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: IAuthPayload;
            file?: Express.Multer.File;
        }
    }
}
//# sourceMappingURL=index.d.ts.map