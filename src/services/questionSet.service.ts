// src/services/questionSet.service.ts
import { QuestionSet } from "../models/QuestionSet.model";
import { JobDescription } from "../models/Job.model";
import { IQuestionSet } from "../types";

export const QuestionSetService = {
  async getById(id: string): Promise<IQuestionSet | null> {
    try {
      return await QuestionSet.findById(id).populate('createdBy', 'name email');
    } catch (error) {
      console.error('Error getting question set by ID:', error);
      return null;
    }
  },

  async getDefault(): Promise<IQuestionSet | null> {
    try {
      return await QuestionSet.findOne({ isDefault: true, isActive: true })
        .populate('createdBy', 'name email');
    } catch (error) {
      console.error('Error getting default question set:', error);
      return null;
    }
  },

  async getActive(): Promise<IQuestionSet[]> {
    try {
      return await QuestionSet.find({ isActive: true })
        .populate('createdBy', 'name email')
        .populate('jobId', 'title company')
        .sort({ isDefault: -1, title: 1 });
    } catch (error) {
      console.error('Error getting active question sets:', error);
      return [];
    }
  },

  async getByJobId(jobId: string): Promise<IQuestionSet | null> {
    try {
      return await QuestionSet.findOne({ jobId: jobId, isActive: true })
        .populate('createdBy', 'name email')
        .populate('jobId', 'title company');
    } catch (error) {
      console.error('Error getting question set by Job ID:', error);
      return null;
    }
  },

  // New method to get all question sets for a specific job
  async getAllByJobId(jobId: string): Promise<IQuestionSet[]> {
    try {
      return await QuestionSet.find({ jobId: jobId })
        .populate('createdBy', 'name email')
        .populate('jobId', 'title company')
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting question sets by Job ID:', error);
      return [];
    }
  },

  // Create question set for a specific job
  async createForJob(jobId: string, userId: string, customData?: Partial<IQuestionSet>): Promise<IQuestionSet | null> {
    try {
      const job = await JobDescription.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const defaultQuestions = [
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
        {
          step: 3,
          field: "phone",
          question: "📱 What's your phone number?",
          validation: {
            type: "phone"
          },
          isRequired: true
        },
        {
          step: 4,
          field: "position",
          question: `💼 You're applying for ${job.title}. Please confirm this is correct:`,
          validation: {
            type: "text",
            minLength: 2
          },
          isRequired: true
        },
        {
          step: 5,
          field: "experience",
          question: `🎯 This role requires ${job.experience} experience. How many years of relevant experience do you have?`,
          validation: {
            type: "text",
            minLength: 1
          },
          isRequired: true
        },
        {
          step: 6,
          field: "skills",
          question: `🛠️ Required skills: ${job.requiredSkills.join(', ')}. Please describe your experience with these:`,
          validation: {
            type: "text",
            minLength: 10
          },
          isRequired: true
        },
        {
          step: 7,
          field: "availability",
          question: "📅 When can you start working? (e.g., immediately, 2 weeks notice, etc.)",
          validation: {
            type: "text",
            minLength: 3
          },
          isRequired: true
        },
        {
          step: 8,
          field: "expectedSalary",
          question: job.salaryRange?.min && job.salaryRange?.max 
            ? `💰 Our budget is ${job.salaryRange.min}-${job.salaryRange.max}. What's your expected salary?`
            : "💰 What's your expected salary range?",
          validation: {
            type: "text",
            minLength: 3
          },
          isRequired: true
        },
        {
          step: 9,
          field: "portfolio",
          question: '🌐 Do you have a portfolio/LinkedIn/GitHub link? (or type "none" if not applicable)',
          validation: {
            type: "url"
          },
          isRequired: false
        },
        {
          step: 10,
          field: "additionalInfo",
          question: "💭 Any additional information you'd like to share about your fit for this role?",
          validation: {
            type: "text",
            minLength: 5
          },
          isRequired: false
        }
      ];

      const questionSet = new QuestionSet({
        title: customData?.title || `Questions for ${job.title} at ${job.company}`,
        description: customData?.description || `Interview questions for the ${job.title} position`,
        jobId: jobId,
        questions: customData?.questions || defaultQuestions,
        isActive: customData?.isActive !== undefined ? customData.isActive : true,
        isDefault: false, // Job-specific question sets are never default
        createdBy: userId
      });

      return await questionSet.save();
    } catch (error) {
      console.error('Error creating question set for job:', error);
      return null;
    }
  },

  async createDefault(): Promise<IQuestionSet> {
    // Create a default question set if none exists
    const defaultQuestionSet = new QuestionSet({
      title: "Standard Hiring Questions",
      description: "Default set of questions for job applications",
      jobId: null, // Default question set is not tied to a specific job
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
        {
          step: 3,
          field: "phone",
          question: "📱 What's your phone number?",
          validation: {
            type: "phone"
          },
          isRequired: true
        },
        {
          step: 4,
          field: "position",
          question: "💼 What position are you applying for?",
          validation: {
            type: "text",
            minLength: 2
          },
          isRequired: true
        },
        {
          step: 5,
          field: "experience",
          question: "🎯 How many years of relevant experience do you have?",
          validation: {
            type: "text",
            minLength: 1
          },
          isRequired: true
        },
        {
          step: 6,
          field: "skills",
          question: "🛠️ Please list your key skills (separated by commas):",
          validation: {
            type: "text",
            minLength: 10
          },
          isRequired: true
        },
        {
          step: 7,
          field: "availability",
          question: "📅 When can you start working? (e.g., immediately, 2 weeks notice, etc.)",
          validation: {
            type: "text",
            minLength: 3
          },
          isRequired: true
        },
        {
          step: 8,
          field: "expectedSalary",
          question: "💰 What's your expected salary range?",
          validation: {
            type: "text",
            minLength: 3
          },
          isRequired: true
        },
        {
          step: 9,
          field: "portfolio",
          question: '🌐 Do you have a portfolio/LinkedIn/GitHub link? (or type "none" if not applicable)',
          validation: {
            type: "url"
          },
          isRequired: false
        },
        {
          step: 10,
          field: "additionalInfo",
          question: "💭 Any additional information you'd like to share?",
          validation: {
            type: "text",
            minLength: 5
          },
          isRequired: false
        }
      ],
      isActive: true,
      isDefault: true,
      createdBy: null // System created
    });

    return await defaultQuestionSet.save();
  },

  // Check if a job already has a question set
  async jobHasQuestionSet(jobId: string): Promise<boolean> {
    try {
      const count = await QuestionSet.countDocuments({ jobId: jobId });
      return count > 0;
    } catch (error) {
      console.error('Error checking if job has question set:', error);
      return false;
    }
  }
};