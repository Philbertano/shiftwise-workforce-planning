// Zod validation schemas for Authentication API

import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters')
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must not exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
  
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Reset password request schema
export const resetPasswordRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must not exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
  
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});