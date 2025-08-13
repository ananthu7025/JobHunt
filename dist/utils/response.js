"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponse = void 0;
const createResponse = (success, message, data, error) => {
    const response = {
        success,
        message,
    };
    if (data !== undefined) {
        response.data = data;
    }
    if (error) {
        response.error = error;
    }
    return response;
};
exports.createResponse = createResponse;
//# sourceMappingURL=response.js.map