// Zod validation schemas for Station API

import { z } from 'zod';
import { Priority } from '../../types';

// Required skill schema
const requiredSkillSchema = z.object({
  skillId: z.string().min(1, 'Skill ID is required'),
  minLevel: z.number()
    .min(1, 'Minimum level must be at least 1')
    .max(5, 'Minimum level must not exceed 5'),
  count: z.number()
    .min(1, 'Count must be at least 1')
    .max(10, 'Count must not exceed 10'),
  mandatory: z.boolean().default(true)
});

// Create station schema
export const stationSchema = z.object({
  name: z.string()
    .min(2, 'Station name must be at least 2 characters')
    .max(100, 'Station name must not exceed 100 characters'),
  
  line: z.string()
    .min(1, 'Line is required')
    .max(50, 'Line name must not exceed 50 characters'),
  
  requiredSkills: z.array(requiredSkillSchema)
    .min(1, 'At least one required skill must be specified'),
  
  priority: z.nativeEnum(Priority, {
    errorMap: () => ({ message: 'Invalid priority level' })
  }),
  
  location: z.string()
    .max(200, 'Location must not exceed 200 characters')
    .optional()
});

// Update station schema (all fields optional except validation rules)
export const stationUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Station name must be at least 2 characters')
    .max(100, 'Station name must not exceed 100 characters')
    .optional(),
  
  line: z.string()
    .min(1, 'Line is required')
    .max(50, 'Line name must not exceed 50 characters')
    .optional(),
  
  requiredSkills: z.array(requiredSkillSchema)
    .min(1, 'At least one required skill must be specified')
    .optional(),
  
  priority: z.nativeEnum(Priority, {
    errorMap: () => ({ message: 'Invalid priority level' })
  }).optional(),
  
  location: z.string()
    .max(200, 'Location must not exceed 200 characters')
    .optional()
});

// Query parameters schema for station endpoints
export const stationQuerySchema = z.object({
  line: z.string().optional(),
  priority: z.nativeEnum(Priority).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

// Route parameters schema
export const stationParamsSchema = z.object({
  id: z.string().min(1, 'Station ID is required')
});