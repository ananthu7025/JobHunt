// src/models/candidate.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface CandidateDocument extends Document {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  currentStep: number;
  responses: { [key: string]: string }; // Dynamic responses based on question set
  isCompleted: boolean;
  questionSetId: mongoose.Types.ObjectId; // Reference to the question set used
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<CandidateDocument>({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  currentStep: { type: Number, default: 0 },
  responses: {
    type: Schema.Types.Mixed, // Allows dynamic fields
    default: {}
  },
  isCompleted: { type: Boolean, default: false },
  questionSetId: {
    type: Schema.Types.ObjectId,
    ref: 'QuestionSet',
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Candidate = mongoose.model<CandidateDocument>("Candidate", candidateSchema);