"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_model_1 = require("../models/User.model");
const response_1 = require("../utils/response");
class AuthController {
    static async register(req, res) {
        try {
            const { email, password, name, role } = req.body;
            // Check if user already exists
            const existingUser = await User_model_1.User.findOne({ email });
            if (existingUser) {
                return res.status(400).json((0, response_1.createResponse)(false, 'User already exists with this email'));
            }
            // Create new user
            const user = new User_model_1.User({
                email,
                password,
                name,
                role: role || 'hr',
            });
            await user.save();
            // Generate JWT token
            const payload = {
                userId: user._id,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '7d',
            });
            res.status(201).json((0, response_1.createResponse)(true, 'User registered successfully', {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                token,
            }));
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            // Find user by email
            const user = await User_model_1.User.findOne({ email });
            if (!user) {
                return res.status(400).json((0, response_1.createResponse)(false, 'Invalid email or password'));
            }
            // Check password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(400).json((0, response_1.createResponse)(false, 'Invalid email or password'));
            }
            // Generate JWT token
            const payload = {
                userId: user._id,
                email: user.email,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '7d',
            });
            res.json((0, response_1.createResponse)(true, 'Login successful', {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
                token,
            }));
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
    static async getProfile(req, res) {
        try {
            const user = await User_model_1.User.findById(req.user.userId).select('-password');
            if (!user) {
                return res.status(404).json((0, response_1.createResponse)(false, 'User not found'));
            }
            res.json((0, response_1.createResponse)(true, 'Profile retrieved successfully', user));
        }
        catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json((0, response_1.createResponse)(false, 'Internal server error', undefined, error.message));
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map