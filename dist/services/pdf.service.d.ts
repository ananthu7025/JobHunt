export declare class PDFService {
    static extractTextFromPDF(filePath: string): Promise<string>;
    static extractCandidateInfo(resumeText: string): Promise<{
        name?: string;
        email?: string;
        phone?: string;
    }>;
}
//# sourceMappingURL=pdf.service.d.ts.map