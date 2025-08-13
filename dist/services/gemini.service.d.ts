import { IGeminiResponse, IJobDescription } from '../types';
export declare class GeminiService {
    private model;
    analyzeResume(resumeText: string, jobDescription: IJobDescription, additionalRequirements?: string, weightage?: {
        skills: number;
        experience: number;
        education: number;
        keywords: number;
    }): Promise<IGeminiResponse>;
    private createAnalysisPrompt;
    private parseGeminiResponse;
}
//# sourceMappingURL=gemini.service.d.ts.map