// src/controllers/job.controller.ts
import { Request, Response } from "express";
import { JobDescription } from "../models/Job.model";
import { QuestionSet } from "../models/QuestionSet.model";
import { createResponse } from "../utils/response";
import { Types } from "mongoose";

export class JobController {
  static async createJob(req: Request, res: Response) {
    try {
      const jobData = {
        ...req.body,
        createdBy: req.user!.userId,
      };

      const job = new JobDescription(jobData);
      await job.save();

      // Auto-create a question set for this job
      await JobController.createDefaultQuestionSetForJob(job._id.toString(), req.user!.userId);

      res
        .status(201)
        .json(
          createResponse(true, "Job description created successfully with question set", job)
        );
    } catch (error) {
      console.error("Create job error:", error);
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

  // Helper method to create default question set for a job
  private static async createDefaultQuestionSetForJob(jobId: string, userId: string) {
    try {
      const job = await JobDescription.findById(jobId);
      if (!job) return;

      const questionSet = new QuestionSet({
        title: `Questions for ${job.title} at ${job.company}`,
        description: `Interview questions for the ${job.title} position`,
        jobId: jobId,
        questions: [
          {
            step: 1,
            field: "name",
            question: "👋 Welcome to our hiring process! Let's start with your full name:",
            validation: {
              type: "text",
              minLength: 2
            },
            isRequired: true
          },
          {
            step: 2,
            field: "email",
            question: "📧 Please provide your email address:",
            validation: {
              type: "email"
            },
            isRequired: true
          },
        ],
        isActive: true,
        isDefault: false, // Job-specific question sets are not default
        createdBy: userId
      });

      await questionSet.save();
      console.log(`Question set created for job: ${job.title}`);
    } catch (error) {
      console.error("Error creating question set for job:", error);
      // Don't throw error to avoid breaking job creation
    }
  }

  static async getAllJobs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query =
        req.user!.role === "admin" ? {} : { createdBy: req.user!.userId };

      const [jobs, total] = await Promise.all([
        JobDescription.find(query)
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        JobDescription.countDocuments(query),
      ]);

      res.json(
        createResponse(true, "Jobs retrieved successfully", {
          jobs,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: total,
          },
        })
      );
    } catch (error) {
      console.error("Get jobs error:", error);
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

  static async getJobById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await JobDescription.findById(id).populate(
        "createdBy",
        "name email"
      );

      if (!job) {
        return res
          .status(404)
          .json(createResponse(false, "Job description not found"));
      }

      // Check if user has access to this job
      const createdById =
        job.createdBy instanceof Types.ObjectId
          ? job.createdBy.toString()
          : job.createdBy.toString();

      if (req.user!.role !== "admin" && createdById !== req.user!.userId) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      res.json(createResponse(true, "Job retrieved successfully", job));
    } catch (error) {
      console.error("Get job error:", error);
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

  static async updateJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await JobDescription.findById(id);

      if (!job) {
        return res
          .status(404)
          .json(createResponse(false, "Job description not found"));
      }

      // Check if user has access to this job
      if (
        req.user!.role !== "admin" &&
        job.createdBy.toString() !== req.user!.userId
      ) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      const updatedJob = await JobDescription.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }).populate("createdBy", "name email");

      res.json(createResponse(true, "Job updated successfully", updatedJob));
    } catch (error) {
      console.error("Update job error:", error);
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

  static async deleteJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await JobDescription.findById(id);

      if (!job) {
        return res
          .status(404)
          .json(createResponse(false, "Job description not found"));
      }

      // Check if user has access to this job
      if (
        req.user!.role !== "admin" &&
        job.createdBy.toString() !== req.user!.userId
      ) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      // Delete associated question sets when job is deleted
      await QuestionSet.deleteMany({ jobId: id });

      await JobDescription.findByIdAndDelete(id);

      res.json(createResponse(true, "Job and associated question sets deleted successfully"));
    } catch (error) {
      console.error("Delete job error:", error);
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

  // New method to get question set for a specific job
  static async getJobQuestionSet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Check if job exists and user has access
      const job = await JobDescription.findById(id);
      if (!job) {
        return res.status(404).json(createResponse(false, "Job not found"));
      }

      if (req.user!.role !== "admin" && job.createdBy.toString() !== req.user!.userId) {
        return res.status(403).json(createResponse(false, "Access denied"));
      }

      // Get the question set for this job
      const questionSet = await QuestionSet.findOne({ jobId: id })
        .populate("createdBy", "name email");

      if (!questionSet) {
        return res.status(404).json(createResponse(false, "Question set not found for this job"));
      }

      res.json(createResponse(true, "Question set retrieved successfully", questionSet));
    } catch (error) {
      console.error("Get job question set error:", error);
      res.status(500).json(
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