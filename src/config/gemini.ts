import { GoogleGenerativeAI } from '@google/generative-ai';

// if (!process.env.GEMINI_API_KEY) {
//   throw new Error('GEMINI_API_KEY is not defined in environment variables');
// }

export const genAI = new GoogleGenerativeAI("AIzaSyDuPX6-FkOXeZG-7mzucqL-Mdjjho_tW7M");

export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
};