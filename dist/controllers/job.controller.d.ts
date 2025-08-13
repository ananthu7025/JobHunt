import { Request, Response } from 'express';
export declare class JobController {
    static createJob(req: Request, res: Response): Promise<void>;
    static getAllJobs(req: Request, res: Response): Promise<void>;
    static getJobById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateJob(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteJob(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=job.controller.d.ts.map