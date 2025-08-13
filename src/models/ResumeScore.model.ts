// src/models/ResumeScore.model.ts
import mongoose, { Schema } from 'mongoose';
import { IResumeScore } from '../types';

const resumeScoreSchema = new Schema<IResumeScore>({
  candidateName: {
    type: String,
    required: true,
  },
  candidateEmail: String,
  candidatePhone: String,
  resumeText: {
    type: String,
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'JobDescription',
    required: true,
  },
  scores: {
    overall: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    skillsMatch: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    experienceMatch: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    educationMatch: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    keywordsMatch: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  analysis: {
    matchedSkills: [String],
    missingSkills: [String],
    experienceAnalysis: String,
    strengthsAndWeaknesses: String,
    recommendations: [String],
  },
  resumeFileName: {
    type: String,
    required: true,
  },
  scannedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

export const ResumeScore = mongoose.model<IResumeScore>('ResumeScore', resumeScoreSchema);