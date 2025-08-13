import { Request, Response } from 'express';
export declare class ResumeController {
    private resumeService;
    scanResume: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getResumeScores: (req: Request, res: Response) => Promise<void>;
    getResumeScoreById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=resume.controller.d.ts.map