export interface Question {
  step: number;
  field: keyof CandidateResponses;
  question: string;
  validation: (text: string) => boolean;
}

export interface CandidateResponses {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  experience?: string;
  skills?: string;
  availability?: string;
  expectedSalary?: string;
  portfolio?: string;
  additionalInfo?: string;
}

export const questions: Question[] = [
  {
    step: 1,
    field: "name",
    question: "👋 Welcome! What's your full name?",
    validation: (text) => text.length > 2
  },
  {
    step: 2,
    field: "email",
    question: "📧 Please provide your email:",
    validation: (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
  },
  // ... rest of your steps
];
