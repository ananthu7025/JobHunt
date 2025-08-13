// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model";
import { createResponse } from "../utils/response";
import { IAuthPayload } from "../types";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json(createResponse(false, "User already exists with this email"));
      }

      // Create new user
      const user = new User({
        email,
        password,
        name,
        role: role || "hr",
      });

      await user.save();

      // Generate JWT token
      const payload: IAuthPayload = {
        userId: user._id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: "7d",
      });

      res.status(201).json(
        createResponse(true, "User registered successfully", {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        })
      );
    } catch (error) {
      console.error("Registration error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid email or password"));
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid email or password"));
      }

      // Generate JWT token
      const payload: IAuthPayload = {
        userId: user._id,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: "7d",
      });

      res.json(
        createResponse(true, "Login successful", {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        })
      );
    } catch (error) {
      console.error("Login error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const user = await User.findById(req.user!.userId).select("-password");
      if (!user) {
        return res.status(404).json(createResponse(false, "User not found"));
      }

      res.json(createResponse(true, "Profile retrieved successfully", user));
    } catch (error) {
      console.error("Get profile error:", error);
      res
        .status(500)
        .json(
          createResponse(
            false,
            "Internal server error",
            undefined,
            (error as Error).message
          )
        );
    }
  }
}
