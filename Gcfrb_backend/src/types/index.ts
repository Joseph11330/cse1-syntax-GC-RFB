import { Request } from "express";

export type UserRole = "student" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}