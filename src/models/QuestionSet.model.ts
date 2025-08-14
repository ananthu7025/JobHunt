import mongoose, { Schema, Document } from 'mongoose';
import { Question } from '../config/questions';

export interface QuestionSet extends Document {
  setId: string;
  name?: string;
  questions: Question[];
}

const questionSetSchema: Schema = new Schema({
  setId: { type: String, required: true, unique: true },
  name: { type: String },
  questions: { type: [Object], required: true },
});

export const QuestionSetModel = mongoose.model<QuestionSet>('QuestionSet', questionSetSchema);
