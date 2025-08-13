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
    question: "👋 Welcome to our hiring process! Let's start with your full name:",
    validation: (text) => text.length > 2,
  },
  {
    step: 2,
    field: "email",
    question: "📧 Please provide your email address:",
    validation: (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text),
  },
  {
    step: 3,
    field: "phone",
    question: "📱 What's your phone number?",
    validation: (text) => text.length > 8,
  },
  {
    step: 4,
    field: "position",
    question: "💼 What position are you applying for?",
    validation: (text) => text.length > 2,
  },
  {
    step: 5,
    field: "experience",
    question: "🎯 How many years of relevant experience do you have?",
    validation: (text) => !isNaN(Number(text)) || text.toLowerCase().includes("year"),
  },
  {
    step: 6,
    field: "skills",
    question: "🛠️ Please list your key skills (separated by commas):",
    validation: (text) => text.length > 10,
  },
  {
    step: 7,
    field: "availability",
    question: "📅 When can you start working? (e.g., immediately, 2 weeks notice, etc.)",
    validation: (text) => text.length > 3,
  },
  {
    step: 8,
    field: "expectedSalary",
    question: "💰 What's your expected salary range?",
    validation: (text) => text.length > 3,
  },
  {
    step: 9,
    field: "portfolio",
    question: '🌐 Do you have a portfolio/LinkedIn/GitHub link? (or type "none" if not applicable)',
    validation: (text) => text.length > 3,
  },
  {
    step: 10,
    field: "additionalInfo",
    question: "💭 Any additional information you'd like to share?",
    validation: (text) => text.length > 5,
  },
];
