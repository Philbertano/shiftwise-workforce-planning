// Zod validation schemas for Skill API

import { z } from 'zod';
import { SkillCategory } from '../../types';

// Create skill schema
export const skillSchema = z.object({
  name: z.string()
    .min(2, 'Skill name must be at least 2 characters')
    .max(100, 'Skill name must not exceed 100 characters'),
  
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  
  levelScale: z.number()
    .min(1, 'Level scale must be at least 1')
    .max(5, 'Level scale must not exceed 5')
    .default(3),
  
  category: z.nativeEnum(SkillCategory, {
    errorMap: () => ({ message: 'Invalid skill category' })
  })
});

// Update skill schema (all fields optional except validation rules)
export const skillUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Skill name must be at least 2 characters')
    .max(100, 'Skill name must not exceed 100 characters')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  
  levelScale: z.number()
    .min(1, 'Level scale must be at least 1')
    .max(5, 'Level scale must not exceed 5')
    .optional(),
  
  category: z.nativeEnum(SkillCategory, {
    errorMap: () => ({ message: 'Invalid skill category' })
  }).optional()
});

// Query parameters schema for skill endpoints
export const skillQuerySchema = z.object({
  category: z.nativeEnum(SkillCategory).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

// Route parameters schema
export const skillParamsSchema = z.object({
  id: z.string().min(1, 'Skill ID is required')
});