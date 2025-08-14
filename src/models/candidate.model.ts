import mongoose, { Schema, Document } from 'mongoose';
import { Question } from '../config/questions';
import { CandidateResponses } from '../config/questions';

export interface CandidateDocument extends Document {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  currentStep: number;
  responses: CandidateResponses;
  questions: Question[];
  setId: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema: Schema = new Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  currentStep: { type: Number, default: 0 },
  responses: {
    name: String,
    email: String,
    phone: String,
    position: String,
    experience: String,
    skills: String,
    availability: String,
    expectedSalary: String,
    portfolio: String,
    additionalInfo: String,
  },
  questions: [{ type: Object, required: true }],
  setId: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Candidate = mongoose.model<CandidateDocument>('Candidate', candidateSchema);
