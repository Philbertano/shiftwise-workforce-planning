// Zod validation schemas for Shift API

import { z } from 'zod';
import { ShiftType, Priority } from '../../types';

// Break rule schema
const breakRuleSchema = z.object({
  duration: z.number()
    .min(5, 'Break duration must be at least 5 minutes')
    .max(120, 'Break duration must not exceed 120 minutes'),
  startAfter: z.number()
    .min(0, 'Start after must be non-negative')
    .max(480, 'Start after must not exceed 480 minutes'),
  paid: z.boolean().default(false)
});

// Create shift template schema
export const shiftTemplateSchema = z.object({
  name: z.string()
    .min(2, 'Shift template name must be at least 2 characters')
    .max(100, 'Shift template name must not exceed 100 characters'),
  
  startTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  
  endTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  
  breakRules: z.array(breakRuleSchema).default([]),
  
  shiftType: z.nativeEnum(ShiftType, {
    errorMap: () => ({ message: 'Invalid shift type' })
  })
});

// Update shift template schema (all fields optional except validation rules)
export const shiftTemplateUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Shift template name must be at least 2 characters')
    .max(100, 'Shift template name must not exceed 100 characters')
    .optional(),
  
  startTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format')
    .optional(),
  
  endTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format')
    .optional(),
  
  breakRules: z.array(breakRuleSchema).optional(),
  
  shiftType: z.nativeEnum(ShiftType, {
    errorMap: () => ({ message: 'Invalid shift type' })
  }).optional()
});

// Create shift demand schema
export const shiftDemandSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform(str => new Date(str)),
  
  stationId: z.string().min(1, 'Station ID is required'),
  
  shiftTemplateId: z.string().min(1, 'Shift template ID is required'),
  
  requiredCount: z.number()
    .min(1, 'Required count must be at least 1')
    .max(20, 'Required count must not exceed 20'),
  
  priority: z.nativeEnum(Priority, {
    errorMap: () => ({ message: 'Invalid priority level' })
  }),
  
  notes: z.string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
});

// Update shift demand schema (all fields optional except validation rules)
export const shiftDemandUpdateSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
    .optional(),
  
  stationId: z.string().min(1, 'Station ID is required').optional(),
  
  shiftTemplateId: z.string().min(1, 'Shift template ID is required').optional(),
  
  requiredCount: z.number()
    .min(1, 'Required count must be at least 1')
    .max(20, 'Required count must not exceed 20')
    .optional(),
  
  priority: z.nativeEnum(Priority, {
    errorMap: () => ({ message: 'Invalid priority level' })
  }).optional(),
  
  notes: z.string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
});

// Query parameters schema for shift endpoints
export const shiftQuerySchema = z.object({
  shiftType: z.nativeEnum(ShiftType).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  stationId: z.string().optional(),
  priority: z.nativeEnum(Priority).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

// Route parameters schema
export const shiftParamsSchema = z.object({
  id: z.string().min(1, 'Shift ID is required')
});