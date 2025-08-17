// src/models/candidate.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface CandidateDocument extends Document {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  currentStep: number;
  responses: { [key: string]: string };
  isCompleted: boolean;
  questionSetId: mongoose.Types.ObjectId; // Reference to the question set used
  jobId: { type: mongoose.Types.ObjectId, ref: 'JobDescription' }, // DEPRECATED but needed for old index
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<CandidateDocument>({
  telegramId: { type: String, required: true },
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
  jobId: { // DEPRECATED but needed for old index
    type: Schema.Types.ObjectId,
    ref: 'JobDescription'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// This is the correct index, but the old one on telegramId + jobId is causing issues.
// The code is being adapted to work with the old index.
// A proper database migration should be performed to remove the old index and rely on this one.
candidateSchema.index({ telegramId: 1, questionSetId: 1 }, { unique: true }); 
candidateSchema.index({ telegramId: 1, jobId: 1 }, { unique: true, sparse: true }); // Reflecting the likely state of the DB

// Additional indexes for better query performance
candidateSchema.index({ telegramId: 1 });
candidateSchema.index({ telegramId: 1, isCompleted: 1 });
candidateSchema.index({ questionSetId: 1 });
candidateSchema.index({ questionSetId: 1, isCompleted: 1 });
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ updatedAt: -1 });

// Pre-save middleware to update the updatedAt field
candidateSchema.pre('save', function(next) {
  if (this.isModified() && !this.isModified('createdAt')) {
    this.updatedAt = new Date();
  }
  next();
});

// Virtual for getting job details
candidateSchema.virtual('jobDetails', {
  ref: 'JobDescription',
  localField: 'questionSetId',
  foreignField: '_id',
  justOne: true
});

// Method to get application progress percentage
candidateSchema.methods.getProgressPercentage = function() {
  if (!this.questionSetId || !this.questionSetId.questions) {
    return 0;
  }
  const totalQuestions = this.questionSetId.questions.length;
  return totalQuestions > 0 ? Math.round((this.currentStep / totalQuestions) * 100) : 0;
};

// Method to check if resume is uploaded
candidateSchema.methods.hasResume = function() {
  return !!(this.responses['resumeFileName'] && this.responses['resumeFilePath']);
};

// Method to get formatted application summary
candidateSchema.methods.getSummary = function() {
  const summary: any = {
    id: this._id,
    telegramId: this.telegramId,
    name: this.responses['name'] || `${this.firstName || ''} ${this.lastName || ''}`.trim() || 'Unknown',
    email: this.responses['email'] || 'Not provided',
    phone: this.responses['phone'] || 'Not provided',
    position: this.responses['position'] || 'Not specified',
    isCompleted: this.isCompleted,
    hasResume: this.hasResume(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (!this.isCompleted) {
    summary.progress = {
      current: this.currentStep,
      percentage: this.getProgressPercentage()
    };
  }

  return summary;
};

export const Candidate = mongoose.model<CandidateDocument>("Candidate", candidateSchema);
