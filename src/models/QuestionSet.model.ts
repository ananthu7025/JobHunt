// src/models/QuestionSet.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { IQuestion, IQuestionSet } from '../types';

const questionSchema = new Schema<IQuestion>({
  step: { type: Number, required: true },
  field: { type: String, required: true },
  question: { type: String, required: true },
  validation: {
    type: { 
      type: String, 
      enum: ['text', 'email', 'phone', 'number', 'url', 'custom'],
      default: 'text'
    },
    minLength: { type: Number, default: 1 },
    maxLength: { type: Number, default: 1000 },
    pattern: String,
    customValidation: String
  },
  isRequired: { type: Boolean, default: true }
}, { _id: false });

const questionSetSchema = new Schema<IQuestionSet>({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'JobDescription',
    required: true,
  },
  questions: [questionSchema],
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true 
});

// Ensure only one default question set exists
questionSetSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await QuestionSet.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export const QuestionSet = mongoose.model<IQuestionSet>('QuestionSet', questionSetSchema);
