import { Request, Response } from 'express';
import { QuestionSetModel } from '../models/QuestionSet.model';
import { QuestionSet } from '../models/QuestionSet.model'; // Import the interface

export class QuestionSetController {
  public static async createQuestionSet(req: Request, res: Response) {
    try {
      const questionSet: QuestionSet = req.body;
      const createdQuestionSet = await QuestionSetModel.create(questionSet);
      res.status(201).json(createdQuestionSet);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create question set' });
    }
  }

  public static async getQuestionSet(req: Request, res: Response) {
    try {
      const setId = req.params.setId;
      const questionSet = await QuestionSetModel.findById(setId);
      if (!questionSet) {
        return res.status(404).json({ error: 'Question set not found' });
      }
      res.json(questionSet);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve question set' });
    }
  }

  // Add update and delete methods similarly
  public static async updateQuestionSet(req: Request, res: Response) {
    try {
      const setId = req.params.setId;
      const updatedQuestionSet = req.body;
      const questionSet = await QuestionSetModel.findByIdAndUpdate(setId, updatedQuestionSet, { new: true });
      if (!questionSet) {
        return res.status(404).json({ error: 'Question set not found' });
      }
      res.json(questionSet);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update question set' });
    }
  }

  public static async deleteQuestionSet(req: Request, res: Response) {
    try {
      const setId = req.params.setId;
      const result = await QuestionSetModel.findByIdAndDelete(setId);
      if (!result) {
        return res.status(404).json({ error: 'Question set not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete question set' });
    }
  }
}
