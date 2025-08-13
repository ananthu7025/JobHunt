// src/services/gemini.service.ts
import { getGeminiModel } from '../config/gemini';
import { IGeminiResponse, IJobDescription } from '../types';

export class GeminiService {
  private model = getGeminiModel();

  async analyzeResume(
    resumeText: string,
    jobDescription: IJobDescription,
    additionalRequirements?: string,
    weightage = { skills: 30, experience: 25, education: 20, keywords: 25 }
  ): Promise<IGeminiResponse> {
    try {
      const prompt = this.createAnalysisPrompt(
        resumeText,
        jobDescription,
        additionalRequirements,
        weightage
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeminiResponse(text);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to analyze resume with Gemini API');
    }
  }

  private createAnalysisPrompt(
    resumeText: string,
    jobDescription: IJobDescription,
    additionalRequirements?: string,
    weightage?: { skills: number; experience: number; education: number; keywords: number }
  ): string {
    return `
You are an expert HR analyst. Analyze the following resume against the job description and provide a detailed assessment.

**Job Description:**
Title: ${jobDescription.title}
Company: ${jobDescription.company}
Description: ${jobDescription.description}
Required Skills: ${jobDescription.requiredSkills.join(', ')}
Preferred Skills: ${jobDescription.preferredSkills?.join(', ') || 'None'}
Experience Required: ${jobDescription.experience}
Location: ${jobDescription.location}
Job Type: ${jobDescription.jobType}
${additionalRequirements ? `Additional Requirements: ${additionalRequirements}` : ''}

**Resume Text:**
${resumeText}

**Scoring Weightage:**
- Skills Match: ${weightage?.skills}%
- Experience Match: ${weightage?.experience}%
- Education Match: ${weightage?.education}%
- Keywords Match: ${weightage?.keywords}%

Please analyze and provide a response in the following JSON format (respond with valid JSON only):

{
  "overall_score": <number between 0-100>,
  "skills_match_score": <number between 0-100>,
  "experience_match_score": <number between 0-100>,
  "education_match_score": <number between 0-100>,
  "keywords_match_score": <number between 0-100>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "experience_analysis": "Brief analysis of candidate's experience relevance",
  "strengths_and_weaknesses": "Key strengths and areas for improvement",
  "recommendations": ["recommendation1", "recommendation2"],
  "candidate_info": {
    "name": "extracted name or null",
    "email": "extracted email or null",
    "phone": "extracted phone or null"
  }
}

Focus on:
1. Technical skills alignment with job requirements
2. Experience level and relevance
3. Educational background fit
4. Industry-specific keywords presence
5. Overall cultural and role fit
`;
  }

  private parseGeminiResponse(responseText: string): IGeminiResponse {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const requiredFields = [
        'overall_score', 'skills_match_score', 'experience_match_score',
        'education_match_score', 'keywords_match_score'
      ];

      for (const field of requiredFields) {
        if (typeof parsedResponse[field] !== 'number') {
          parsedResponse[field] = 0;
        }
      }

      // Ensure arrays exist
      parsedResponse.matched_skills = parsedResponse.matched_skills || [];
      parsedResponse.missing_skills = parsedResponse.missing_skills || [];
      parsedResponse.recommendations = parsedResponse.recommendations || [];

      // Ensure strings exist
      parsedResponse.experience_analysis = parsedResponse.experience_analysis || 'No analysis available';
      parsedResponse.strengths_and_weaknesses = parsedResponse.strengths_and_weaknesses || 'No assessment available';

      return parsedResponse as IGeminiResponse;
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      // Return default response if parsing fails
      return {
        overall_score: 0,
        skills_match_score: 0,
        experience_match_score: 0,
        education_match_score: 0,
        keywords_match_score: 0,
        matched_skills: [],
        missing_skills: [],
        experience_analysis: 'Analysis failed - please try again',
        strengths_and_weaknesses: 'Assessment failed - please try again',
        recommendations: ['Please re-upload resume and try again'],
        candidate_info: {}
      };
    }
  }
}
