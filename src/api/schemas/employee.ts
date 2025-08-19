// Zod validation schemas for Employee API

import { z } from 'zod';

// Create employee schema
export const employeeSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  
  contractType: z.enum(['full-time', 'part-time', 'contract'], {
    errorMap: () => ({ message: 'Invalid contract type' })
  }),
  
  weeklyHours: z.number()
    .min(1, 'Weekly hours must be at least 1')
    .max(60, 'Weekly hours must not exceed 60')
    .optional(),
  
  maxHoursPerDay: z.number()
    .min(1, 'Max hours per day must be at least 1')
    .max(16, 'Max hours per day must not exceed 16')
    .optional(),
  
  team: z.string()
    .min(1, 'Team is required')
    .max(50, 'Team name must not exceed 50 characters')
    .optional(),
  
  active: z.boolean().default(true).optional()
});

// Update employee schema (all fields optional except validation rules)
export const employeeUpdateSchema = employeeSchema.partial();