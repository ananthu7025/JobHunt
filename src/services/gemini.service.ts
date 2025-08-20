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



async generateCoverLetter(
  candidateName: string,
  resumeText: string,
  jobDescription: IJobDescription
): Promise<string> {
  try {
    const prompt = this.createCoverLetterPrompt(
      candidateName,
      resumeText,
      jobDescription
    );

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const coverLetterContent = response.text();
    
    // Wrap in proper HTML email format
    return this.formatAsEmailHTML(coverLetterContent, candidateName, jobDescription);
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to a simple template with proper HTML formatting
    return this.createFallbackCoverLetter(candidateName, jobDescription);
  }
}

private formatAsEmailHTML(content: string, candidateName: string, jobDescription: IJobDescription): string {
  // Clean up the content if it already has HTML tags
  let cleanContent = content.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
  
  // If content doesn't start with HTML tags, assume it's plain text and wrap it
  if (!cleanContent.startsWith('<')) {
    const paragraphs = cleanContent.split('\n\n').filter(p => p.trim());
    cleanContent = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cover Letter - ${candidateName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .cover-letter {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .subject {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .position-info {
            font-size: 14px;
            color: #6c757d;
        }
        .content p {
            margin-bottom: 15px;
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        strong {
            color: #2c3e50;
        }
        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #6c757d;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="cover-letter">
        <div class="header">
            <div class="subject">Application for ${jobDescription.title}</div>
            <div class="position-info">${jobDescription.company} • Submitted by ${candidateName}</div>
        </div>
        
        <div class="content">
            ${cleanContent}
        </div>
        
        <div class="footer">
            <p><em>Resume attached for your review</em></p>
        </div>
    </div>
</body>
</html>`.trim();
}

private createFallbackCoverLetter(candidateName: string, jobDescription: IJobDescription): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cover Letter - ${candidateName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .cover-letter {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .content p {
            margin-bottom: 15px;
        }
        .signature {
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="cover-letter">
        <div class="content">
            <p>Dear Hiring Manager,</p>
            <p>I am writing to express my strong interest in the <strong>${jobDescription.title}</strong> position at <strong>${jobDescription.company}</strong>. I have attached my resume for your review and consideration.</p>
            <p>I believe my background and experience would make me a valuable addition to your team. I would welcome the opportunity to discuss how I can contribute to ${jobDescription.company}'s continued success.</p>
            <p>Thank you for your time and consideration. I look forward to hearing from you.</p>
            <div class="signature">
                <p>Sincerely,<br><strong>${candidateName}</strong></p>
            </div>
        </div>
    </div>
</body>
</html>`.trim();
}

private createCoverLetterPrompt(
  candidateName: string,
  resumeText: string,
  jobDescription: IJobDescription
): string {
  return `
You are an expert cover letter writer. Create a professional, personalized cover letter using ONLY the specific information provided below. Do not invent, assume, or add any details not explicitly stated.

**CANDIDATE:**
Name: ${candidateName}

**TARGET POSITION:**
Job Title: ${jobDescription.title}
Company: ${jobDescription.company}
Job Description: ${jobDescription.description}
Required Skills: ${jobDescription.requiredSkills.join(', ')}

**CANDIDATE'S RESUME:**
${resumeText}

**OUTPUT FORMAT:**
- Generate the cover letter content as clean HTML paragraphs
- Use only <p>, <strong>, <em> tags for formatting
- Do not include <html>, <head>, <body> tags (they will be added later)
- No markdown, no placeholders, no comments

**CONTENT STRUCTURE:**
Paragraph 1 - Opening:
- Start with "Dear Hiring Manager,"
- State the specific position you're applying for: ${jobDescription.title} at ${jobDescription.company}
- Brief statement of interest and why you're a strong candidate

Paragraph 2 - Experience Match:
- Identify 2-3 specific experiences, skills, or achievements from the resume that directly align with the job requirements
- Use concrete examples with measurable results where available in the resume
- Connect these experiences to the company's needs mentioned in the job description

Paragraph 3 - Value Proposition:
- Explain how your background makes you uniquely qualified for this role
- Reference specific aspects of the job description that excite you
- Only mention company-specific details if they appear in the job description - otherwise focus on the role itself

Paragraph 4 - Closing:
- Express enthusiasm for the opportunity
- Request an interview
- Professional sign-off: "Sincerely, ${candidateName}"

**STRICT RULES - FOLLOW EXACTLY:**
1. Use ONLY information from the resume and job description provided above
2. Do not mention LinkedIn, websites, portfolios unless explicitly listed in the resume
3. Do not add assumed technical skills, tools, or software not mentioned in resume
4. Do not create fictional achievements or experiences
5. Do not use generic phrases like "proven track record" unless backed by specific resume evidence
6. Do not mention salary, benefits, or compensation
7. Keep each paragraph to 3-4 sentences maximum
8. Match the tone to be professional but personable
9. Ensure every claim can be verified from the provided resume text
10. Do not exceed 250 words total
11. NEVER include placeholders, brackets, or conditional text like "[insert X if Y]"
12. If information is not available, simply omit that sentence entirely
13. Do not wrap output in \`\`\`html code blocks

**QUALITY CHECKLIST:**
- Does each skill mentioned appear in both the resume AND job requirements?
- Are all achievements/experiences directly quoted or paraphrased from the resume?
- Is the company name and job title correct throughout?
- Does the letter flow logically from opening to closing?

Generate only the cover letter paragraphs now. Output ONLY the paragraph content - no explanations, no additional text.
  `;
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
