// Zod validation schemas for Employee API

import { z } from 'zod';

// Employee preferences schema
const employeePreferencesSchema = z.object({
  preferredShifts: z.array(z.enum(['day', 'night', 'swing', 'weekend'])).optional(),
  preferredStations: z.array(z.string()).optional(),
  maxConsecutiveDays: z.number().min(1).max(14).optional(),
  preferredDaysOff: z.array(z.number().min(0).max(6)).optional()
}).optional();

// Create employee schema
export const employeeSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  
  contractType: z.enum(['full-time', 'part-time', 'temporary', 'contract'], {
    errorMap: () => ({ message: 'Invalid contract type' })
  }),
  
  weeklyHours: z.number()
    .min(1, 'Weekly hours must be at least 1')
    .max(80, 'Weekly hours must not exceed 80')
    .optional(),
  
  maxHoursPerDay: z.number()
    .min(1, 'Max hours per day must be at least 1')
    .max(24, 'Max hours per day must not exceed 24')
    .optional(),
  
  minRestHours: z.number()
    .min(8, 'Minimum rest must be at least 8 hours')
    .max(24, 'Rest hours cannot exceed 24')
    .optional(),
  
  team: z.string()
    .min(1, 'Team is required')
    .max(50, 'Team name must not exceed 50 characters')
    .optional(),
  
  active: z.boolean().default(true).optional(),
  
  preferences: employeePreferencesSchema
});

// Update employee schema (all fields optional except validation rules)
export const employeeUpdateSchema = employeeSchema.partial();