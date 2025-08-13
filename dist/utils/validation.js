"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeSchemas = exports.jobSchemas = exports.authSchemas = void 0;
// src/utils/validation.ts
const joi_1 = __importDefault(require("joi"));
exports.authSchemas = {
    register: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: joi_1.default.string().min(6).required().messages({
            'string.min': 'Password must be at least 6 characters long',
            'any.required': 'Password is required'
        }),
        name: joi_1.default.string().min(2).max(50).required().messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'any.required': 'Name is required'
        }),
        role: joi_1.default.string().valid('hr', 'admin').default('hr')
    }),
    login: joi_1.default.object({
        email: joi_1.default.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: joi_1.default.string().required().messages({
            'any.required': 'Password is required'
        })
    })
};
exports.jobSchemas = {
    create: joi_1.default.object({
        title: joi_1.default.string().min(3).max(100).required().messages({
            'string.min': 'Job title must be at least 3 characters long',
            'string.max': 'Job title cannot exceed 100 characters',
            'any.required': 'Job title is required'
        }),
        company: joi_1.default.string().min(2).max(100).required().messages({
            'string.min': 'Company name must be at least 2 characters long',
            'string.max': 'Company name cannot exceed 100 characters',
            'any.required': 'Company name is required'
        }),
        description: joi_1.default.string().min(10).required().messages({
            'string.min': 'Job description must be at least 10 characters long',
            'any.required': 'Job description is required'
        }),
        requiredSkills: joi_1.default.array().items(joi_1.default.string().min(1)).min(1).required().messages({
            'array.min': 'At least one required skill must be specified',
            'any.required': 'Required skills are required'
        }),
        preferredSkills: joi_1.default.array().items(joi_1.default.string().min(1)).optional(),
        experience: joi_1.default.string().required().messages({
            'any.required': 'Experience requirement is required'
        }),
        location: joi_1.default.string().required().messages({
            'any.required': 'Location is required'
        }),
        jobType: joi_1.default.string().valid('full-time', 'part-time', 'contract', 'internship').required().messages({
            'any.only': 'Job type must be one of: full-time, part-time, contract, internship',
            'any.required': 'Job type is required'
        }),
        salaryRange: joi_1.default.object({
            min: joi_1.default.number().positive().required(),
            max: joi_1.default.number().positive().greater(joi_1.default.ref('min')).required()
        }).optional()
    }),
    update: joi_1.default.object({
        title: joi_1.default.string().min(3).max(100).optional(),
        company: joi_1.default.string().min(2).max(100).optional(),
        description: joi_1.default.string().min(10).optional(),
        requiredSkills: joi_1.default.array().items(joi_1.default.string().min(1)).min(1).optional(),
        preferredSkills: joi_1.default.array().items(joi_1.default.string().min(1)).optional(),
        experience: joi_1.default.string().optional(),
        location: joi_1.default.string().optional(),
        jobType: joi_1.default.string().valid('full-time', 'part-time', 'contract', 'internship').optional(),
        salaryRange: joi_1.default.object({
            min: joi_1.default.number().positive().required(),
            max: joi_1.default.number().positive().greater(joi_1.default.ref('min')).required()
        }).optional()
    }).min(1)
};
exports.resumeSchemas = {
    scan: joi_1.default.object({
        jobId: joi_1.default.string().required().messages({
            'any.required': 'Job ID is required'
        }),
        additionalRequirements: joi_1.default.string().optional(),
        weightage: joi_1.default.object({
            skills: joi_1.default.number().min(0).max(100).default(30),
            experience: joi_1.default.number().min(0).max(100).default(25),
            education: joi_1.default.number().min(0).max(100).default(20),
            keywords: joi_1.default.number().min(0).max(100).default(25)
        }).optional()
    })
};
//# sourceMappingURL=validation.js.map