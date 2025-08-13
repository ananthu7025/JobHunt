import { IScanRequest, IResumeScore } from '../types';
export declare class ResumeService {
    private geminiService;
    scanResume(filePath: string, fileName: string, scanRequest: IScanRequest, scannedBy: string): Promise<IResumeScore>;
    getResumeScores(filters: {
        jobId?: string;
        scannedBy?: string;
        minScore?: number;
        limit?: number;
        page?: number;
    }): Promise<{
        scores: Omit<Omit<import("mongoose").Document<unknown, {}, IResumeScore> & IResumeScore & Required<{
            _id: string;
        }>, never>, never>[];
        pagination: {
            current: number;
            total: number;
            count: number;
        };
    }>;
}
//# sourceMappingURL=resume.service.d.ts.map