"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobController = void 0;
const Job_model_1 = require("../models/Job.model");
const response_1 = require("../utils/response");
class JobController {
    static async createJob(req, res) {
        try {
            const jobData = {
                ...req.body,
                createdBy: req.user.userId,
            };
            const job = new Job_model_1.JobDescription(jobData);
            await job.save();
            res.status(201).json((0, response_1.createResponse)(true, 'Job description created successfully', job));
        }
        catch (error) {
            console.error('Create job error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
    static async getAllJobs(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const query = req.user.role === 'admin'
                ? {}
                : { createdBy: req.user.userId };
            const [jobs, total] = await Promise.all([
                Job_model_1.JobDescription.find(query)
                    .populate('createdBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                Job_model_1.JobDescription.countDocuments(query)
            ]);
            res.json((0, response_1.createResponse)(true, 'Jobs retrieved successfully', {
                jobs,
                pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    count: total
                }
            }));
        }
        catch (error) {
            console.error('Get jobs error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
    static async getJobById(req, res) {
        try {
            const { id } = req.params;
            const job = await Job_model_1.JobDescription.findById(id).populate('createdBy', 'name email');
            if (!job) {
                return res.status(404).json((0, response_1.createResponse)(false, 'Job description not found'));
            }
            // Check if user has access to this job
            if (req.user.role !== 'admin' && job.createdBy._id.toString() !== req.user.userId) {
                return res.status(403).json((0, response_1.createResponse)(false, 'Access denied'));
            }
            res.json((0, response_1.createResponse)(true, 'Job retrieved successfully', job));
        }
        catch (error) {
            console.error('Get job error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
    static async updateJob(req, res) {
        try {
            const { id } = req.params;
            const job = await Job_model_1.JobDescription.findById(id);
            if (!job) {
                return res.status(404).json((0, response_1.createResponse)(false, 'Job description not found'));
            }
            // Check if user has access to this job
            if (req.user.role !== 'admin' && job.createdBy.toString() !== req.user.userId) {
                return res.status(403).json((0, response_1.createResponse)(false, 'Access denied'));
            }
            const updatedJob = await Job_model_1.JobDescription.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).populate('createdBy', 'name email');
            res.json((0, response_1.createResponse)(true, 'Job updated successfully', updatedJob));
        }
        catch (error) {
            console.error('Update job error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
    static async deleteJob(req, res) {
        try {
            const { id } = req.params;
            const job = await Job_model_1.JobDescription.findById(id);
            if (!job) {
                return res.status(404).json((0, response_1.createResponse)(false, 'Job description not found'));
            }
            // Check if user has access to this job
            if (req.user.role !== 'admin' && job.createdBy.toString() !== req.user.userId) {
                return res.status(403).json((0, response_1.createResponse)(false, 'Access denied'));
            }
            await Job_model_1.JobDescription.findByIdAndDelete(id);
            res.json((0, response_1.createResponse)(true, 'Job deleted successfully'));
        }
        catch (error) {
            console.error('Delete job error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
}
exports.JobController = JobController;
//# sourceMappingURL=job.controller.js.map