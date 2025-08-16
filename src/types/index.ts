// src/types/index.ts
import { Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: "hr" | "admin";
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IJobDescription extends Document {
  _id: string;
  title: string;
  company: string;
  hrEmail: string;
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  experience: string;
  location: string;
  jobType: "full-time" | "part-time" | "contract" | "internship";
  salaryRange?: {
    min: number;
    max: number;
  };
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
}

export interface IResumeScore extends Document {
  _id: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  resumeText: string;
  createdBy: Types.ObjectId | string;
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
  scannedBy: Types.ObjectId | string;
  createdAt: Date;
jobId:Types.ObjectId | string;
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
export interface ICandidate extends Document {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  currentStep: number;
  responses: {
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
    experience?: string;
    skills?: string;
    availability?: string;
    expectedSalary?: string;
    portfolio?: string;
    additionalInfo?: string;
    [key: string]: any;
  };
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionSetId: Types.ObjectId;
}

export interface IQuestion {
  step: number;
  field: string;
  question: string;
  validation: {
    type: 'text' | 'email' | 'phone' | 'number' | 'url' | 'custom';
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customValidation?: string; // For custom validation logic
  };
  isRequired: boolean;
}

export interface IQuestionSet extends Document {
  title: string;
  description?: string;
  jobId: Types.ObjectId;
  questions: IQuestion[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
