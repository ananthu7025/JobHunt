// src/utils/validation.ts
import Joi from 'joi';

export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
    role: Joi.string().valid('hr', 'admin').default('hr')
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  })
};

export const jobSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Job title must be at least 3 characters long',
      'string.max': 'Job title cannot exceed 100 characters',
      'any.required': 'Job title is required'
    }),
    company: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters',
      'any.required': 'Company name is required'
    }),
    description: Joi.string().min(10).required().messages({
      'string.min': 'Job description must be at least 10 characters long',
      'any.required': 'Job description is required'
    }),
    requiredSkills: Joi.array().items(Joi.string().min(1)).min(1).required().messages({
      'array.min': 'At least one required skill must be specified',
      'any.required': 'Required skills are required'
    }),
    preferredSkills: Joi.array().items(Joi.string().min(1)).optional(),
    experience: Joi.string().required().messages({
      'any.required': 'Experience requirement is required'
    }),
    location: Joi.string().required().messages({
      'any.required': 'Location is required'
    }),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').required().messages({
      'any.only': 'Job type must be one of: full-time, part-time, contract, internship',
      'any.required': 'Job type is required'
    }),
    salaryRange: Joi.object({
      min: Joi.number().positive().required(),
      max: Joi.number().positive().greater(Joi.ref('min')).required()
    }).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    company: Joi.string().min(2).max(100).optional(),
    description: Joi.string().min(10).optional(),
    requiredSkills: Joi.array().items(Joi.string().min(1)).min(1).optional(),
    preferredSkills: Joi.array().items(Joi.string().min(1)).optional(),
    experience: Joi.string().optional(),
    location: Joi.string().optional(),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').optional(),
    salaryRange: Joi.object({
      min: Joi.number().positive().required(),
      max: Joi.number().positive().greater(Joi.ref('min')).required()
    }).optional()
  }).min(1)
};

export const resumeSchemas = {
  scan: Joi.object({
    jobId: Joi.string().required().messages({
      'any.required': 'Job ID is required'
    }),
    additionalRequirements: Joi.string().optional(),
    weightage: Joi.object({
      skills: Joi.number().min(0).max(100).default(30),
      experience: Joi.number().min(0).max(100).default(25),
      education: Joi.number().min(0).max(100).default(20),
      keywords: Joi.number().min(0).max(100).default(25)
    }).optional()
  })
};