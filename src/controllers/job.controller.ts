// src/controllers/job.controller.ts
import { Request, Response } from "express";
import { JobDescription } from "../models/Job.model";
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

      res
        .status(201)
        .json(
          createResponse(true, "Job description created successfully", job)
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

      await JobDescription.findByIdAndDelete(id);

      res.json(createResponse(true, "Job deleted successfully"));
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
}
