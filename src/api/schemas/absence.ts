// Zod validation schemas for Absence API

import { z } from 'zod';
import { AbsenceType } from '../../types';

// Create absence schema
export const absenceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  
  type: z.nativeEnum(AbsenceType, {
    errorMap: () => ({ message: 'Invalid absence type' })
  }),
  
  dateStart: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .transform(str => new Date(str)),
  
  dateEnd: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .transform(str => new Date(str)),
  
  reason: z.string()
    .max(500, 'Reason must not exceed 500 characters')
    .optional()
}).refine((data) => data.dateEnd >= data.dateStart, {
  message: "End date must be after or equal to start date",
  path: ["dateEnd"]
});

// Update absence schema (all fields optional except validation rules)
export const absenceUpdateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').optional(),
  
  type: z.nativeEnum(AbsenceType, {
    errorMap: () => ({ message: 'Invalid absence type' })
  }).optional(),
  
  dateStart: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional(),
  
  dateEnd: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional(),
  
  reason: z.string()
    .max(500, 'Reason must not exceed 500 characters')
    .optional()
}).refine((data) => {
  if (data.dateStart && data.dateEnd) {
    return data.dateEnd >= data.dateStart;
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["dateEnd"]
});

// Absence approval schema
export const absenceApprovalSchema = z.object({
  approved: z.boolean()
});

// Query parameters schema for absence endpoints
export const absenceQuerySchema = z.object({
  employeeId: z.string().optional(),
  type: z.nativeEnum(AbsenceType).optional(),
  approved: z.enum(['true', 'false']).optional(),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

// Route parameters schema
export const absenceParamsSchema = z.object({
  id: z.string().min(1, 'Absence ID is required')
});