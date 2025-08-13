"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const response_1 = require("../utils/response");
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            return res.status(400).json((0, response_1.createResponse)(false, errorMessage));
        }
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.middleware.js.map