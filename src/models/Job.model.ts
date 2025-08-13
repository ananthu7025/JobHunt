import mongoose, { Schema, Types, Document } from 'mongoose';
import { IJobDescription } from '../types';

const jobSchema = new Schema<IJobDescription>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  requiredSkills: [{
    type: String,
    required: true,
  }],
  preferredSkills: [{
    type: String,
  }],
  experience: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    required: true,
  },
  salaryRange: {
    min: Number,
    max: Number,
  },
  createdBy: {
    type: Schema.Types.ObjectId, // ✅ No casting to string
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

export const JobDescription = mongoose.model<IJobDescription>('JobDescription', jobSchema);