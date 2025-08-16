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
    }).optional(),
    hrEmail: Joi.string().email().required().messages({
      'string.email': 'HR email must be a valid email address',
      'any.required': 'HR email is required'
    }),
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
    }).optional(),
    hrEmail: Joi.string().email().optional().messages({
      'string.email': 'HR email must be a valid email address'
    })
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
// src/utils/validation.helper.ts
import { IQuestion } from "../types";

export class ValidationHelper {
  static validateResponse(question: IQuestion, response: string): { isValid: boolean; message?: string } {
    if (!response || typeof response !== 'string') {
      return { isValid: false, message: 'Response is required' };
    }

    const trimmedResponse = response.trim();

    // Check required field
    if (question.isRequired && !trimmedResponse) {
      return { isValid: false, message: 'This field is required' };
    }

    // Check length constraints
    if (question.validation.minLength && trimmedResponse.length < question.validation.minLength) {
      return { 
        isValid: false, 
        message: `Minimum length is ${question.validation.minLength} characters` 
      };
    }

    if (question.validation.maxLength && trimmedResponse.length > question.validation.maxLength) {
      return { 
        isValid: false, 
        message: `Maximum length is ${question.validation.maxLength} characters` 
      };
    }

    // Type-specific validations
    switch (question.validation.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedResponse)) {
          return { isValid: false, message: 'Please provide a valid email address' };
        }
        break;

      case 'phone':
        // Allow various phone formats
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[\d\s\-\(\)]{8,}$/;
        if (!phoneRegex.test(trimmedResponse.replace(/\s/g, ''))) {
          return { isValid: false, message: 'Please provide a valid phone number' };
        }
        break;

      case 'number':
        if (isNaN(Number(trimmedResponse))) {
          return { isValid: false, message: 'Please provide a valid number' };
        }
        break;

      case 'url':
        try {
          new URL(trimmedResponse);
        } catch {
          // Allow "none" or "n/a" for optional URL fields
          if (!['none', 'n/a', 'not applicable'].includes(trimmedResponse.toLowerCase())) {
            return { isValid: false, message: 'Please provide a valid URL or type "none"' };
          }
        }
        break;

      case 'custom':
        if (question.validation.pattern) {
          const customRegex = new RegExp(question.validation.pattern);
          if (!customRegex.test(trimmedResponse)) {
            return { 
              isValid: false, 
              message: 'Response does not match the required format' 
            };
          }
        }
        break;

      case 'text':
      default:
        // No additional validation for text type
        break;
    }

    return { isValid: true };
  }

  static getValidationMessage(question: IQuestion): string {
    const messages: string[] = [];

    if (question.isRequired) {
      messages.push("This field is required");
    }

    switch (question.validation.type) {
      case 'email':
        messages.push("Please provide a valid email address");
        break;
      case 'phone':
        messages.push("Please provide a valid phone number");
        break;
      case 'number':
        messages.push("Please provide a valid number");
        break;
      case 'url':
        messages.push('Please provide a valid URL or type "none"');
        break;
    }

    if (question.validation.minLength) {
      messages.push(`Minimum ${question.validation.minLength} characters`);
    }

    if (question.validation.maxLength) {
      messages.push(`Maximum ${question.validation.maxLength} characters`);
    }

    return messages.join(". ");
  }
}
