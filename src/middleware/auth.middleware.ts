// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthPayload } from '../types';
import { createResponse } from '../utils/response';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createResponse(false, 'Access token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IAuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json(createResponse(false, 'Invalid or expired token'));
  }
};

export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(createResponse(false, 'Insufficient permissions'));
    }

    next();
  };
};