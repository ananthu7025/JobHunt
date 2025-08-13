"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json((0, response_1.createResponse)(false, 'Access token required'));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json((0, response_1.createResponse)(false, 'Invalid or expired token'));
    }
};
exports.authenticateToken = authenticateToken;
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json((0, response_1.createResponse)(false, 'Authentication required'));
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json((0, response_1.createResponse)(false, 'Insufficient permissions'));
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
//# sourceMappingURL=auth.middleware.js.map