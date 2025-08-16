// src/controllers/questionSet.controller.ts
import { Request, Response } from "express";
import { QuestionSet } from "../models/QuestionSet.model";
import { createResponse } from "../utils/response";

export class QuestionSetController {
  static async createQuestionSet(req: Request, res: Response) {
    try {
      const questionSetData = {
        ...req.body,
        createdBy: req.user!.userId,
      };

      // Sort questions by step
      if (questionSetData.questions) {
        questionSetData.questions = questionSetData.questions
          .sort((a: any, b: any) => a.step - b.step)
          .map((q: any, index: number) => ({ ...q, step: index + 1 }));
      }

      const questionSet = new QuestionSet(questionSetData);
      await questionSet.save();

      res
        .status(201)
        .json(
          createResponse(true, "Question set created successfully", questionSet)
        );
    } catch (error) {
      console.error("Create question set error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async getAllQuestionSets(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query = req.user!.role === "admin" 
        ? {} 
        : { createdBy: req.user!.userId };

      const [questionSets, total] = await Promise.all([
        QuestionSet.find(query)
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        QuestionSet.countDocuments(query),
      ]);

      res.json(
        createResponse(true, "Question sets retrieved successfully", {
          questionSets,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: total,
          },
        })
      );
    } catch (error) {
      console.error("Get question sets error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async getActiveQuestionSets(req: Request, res: Response) {
    try {
      const questionSets = await QuestionSet.find({ isActive: true })
        .populate("createdBy", "name email")
        .sort({ isDefault: -1, title: 1 });

      res.json(
        createResponse(true, "Active question sets retrieved successfully", questionSets)
      );
    } catch (error) {
      console.error("Get active question sets error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async getQuestionSetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const questionSet = await QuestionSet.findById(id).populate(
        "createdBy",
        "name email"
      );

      if (!questionSet) {
        return res
          .status(404)
          .json(createResponse(false, "Question set not found"));
      }

      // Check if user has access to this question set
      if (
        req.user!.role !== "admin" &&
        questionSet.createdBy.toString() !== req.user!.userId
      ) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      res.json(
        createResponse(true, "Question set retrieved successfully", questionSet)
      );
    } catch (error) {
      console.error("Get question set error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async updateQuestionSet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const questionSet = await QuestionSet.findById(id);

      if (!questionSet) {
        return res
          .status(404)
          .json(createResponse(false, "Question set not found"));
      }

      // Check if user has access to this question set
      if (
        req.user!.role !== "admin" &&
        questionSet.createdBy.toString() !== req.user!.userId
      ) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      // Sort questions by step if provided
      if (req.body.questions) {
        req.body.questions = req.body.questions
          .sort((a: any, b: any) => a.step - b.step)
          .map((q: any, index: number) => ({ ...q, step: index + 1 }));
      }

      const updatedQuestionSet = await QuestionSet.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      ).populate("createdBy", "name email");

      res.json(
        createResponse(true, "Question set updated successfully", updatedQuestionSet)
      );
    } catch (error) {
      console.error("Update question set error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async deleteQuestionSet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const questionSet = await QuestionSet.findById(id);

      if (!questionSet) {
        return res
          .status(404)
          .json(createResponse(false, "Question set not found"));
      }

      // Check if user has access to this question set
      if (
        req.user!.role !== "admin" &&
        questionSet.createdBy.toString() !== req.user!.userId
      ) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      // Prevent deletion of default question set
      if (questionSet.isDefault) {
        return res
          .status(400)
          .json(createResponse(false, "Cannot delete default question set"));
      }

      await QuestionSet.findByIdAndDelete(id);

      res.json(createResponse(true, "Question set deleted successfully"));
    } catch (error) {
      console.error("Delete question set error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async setDefaultQuestionSet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Only admin can set default
      if (req.user!.role !== "admin") {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      const questionSet = await QuestionSet.findById(id);

      if (!questionSet) {
        return res
          .status(404)
          .json(createResponse(false, "Question set not found"));
      }

      // Set this as default and unset others
      await QuestionSet.updateMany({}, { $set: { isDefault: false } });
      questionSet.isDefault = true;
      await questionSet.save();

      res.json(
        createResponse(true, "Default question set updated successfully", questionSet)
      );
    } catch (error) {
      console.error("Set default question set error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async duplicateQuestionSet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const originalQuestionSet = await QuestionSet.findById(id);

      if (!originalQuestionSet) {
        return res
          .status(404)
          .json(createResponse(false, "Question set not found"));
      }

      const duplicatedQuestionSet = new QuestionSet({
        title: `${originalQuestionSet.title} (Copy)`,
        description: originalQuestionSet.description,
        questions: originalQuestionSet.questions,
        isActive: false, // New duplicated sets are inactive by default
        isDefault: false,
        createdBy: req.user!.userId,
      });

      await duplicatedQuestionSet.save();

      res
        .status(201)
        .json(
          createResponse(true, "Question set duplicated successfully", duplicatedQuestionSet)
        );
    } catch (error) {
      console.error("Duplicate question set error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }
}