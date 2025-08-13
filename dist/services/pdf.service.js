"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
// src/services/pdf.service.ts
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const fs_1 = __importDefault(require("fs"));
class PDFService {
    static async extractTextFromPDF(filePath) {
        try {
            const dataBuffer = fs_1.default.readFileSync(filePath);
            const data = await (0, pdf_parse_1.default)(dataBuffer);
            return data.text;
        }
        catch (error) {
            throw new Error(`Failed to extract text from PDF: ${error}`);
        }
    }
    static async extractCandidateInfo(resumeText) {
        const info = {};
        // Extract email
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emailMatch = resumeText.match(emailRegex);
        if (emailMatch) {
            info.email = emailMatch[0];
        }
        // Extract phone number
        const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const phoneMatch = resumeText.match(phoneRegex);
        if (phoneMatch) {
            info.phone = phoneMatch[0];
        }
        // Extract name (basic implementation - first line that looks like a name)
        const lines = resumeText.split('\n').filter(line => line.trim());
        for (const line of lines.slice(0, 5)) {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 2 && trimmedLine.length < 50 &&
                /^[a-zA-Z\s]+$/.test(trimmedLine) &&
                !trimmedLine.includes('@') &&
                !trimmedLine.includes('www')) {
                info.name = trimmedLine;
                break;
            }
        }
        return info;
    }
}
exports.PDFService = PDFService;
//# sourceMappingURL=pdf.service.js.map