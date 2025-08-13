"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeminiModel = exports.genAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
// if (!process.env.GEMINI_API_KEY) {
//     throw new Error('GEMINI_API_KEY is not defined in environment variables');
// }
exports.genAI = new generative_ai_1.GoogleGenerativeAI("AIzaSyDuPX6-FkOXeZG-7mzucqL-Mdjjho_tW7M");
const getGeminiModel = () => {
    return exports.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
        },
    });
};
exports.getGeminiModel = getGeminiModel;
//# sourceMappingURL=gemini.js.map