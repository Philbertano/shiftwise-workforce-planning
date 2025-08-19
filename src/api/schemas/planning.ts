// Zod validation schemas for Planning API

import { z } from 'zod';
import { PlanningStrategy } from '../../types';

// Date range schema
const dateRangeSchema = z.object({
  start: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .transform(str => new Date(str)),
  end: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .transform(str => new Date(str))
}).refine((data) => data.end >= data.start, {
  message: "End date must be after or equal to start date",
  path: ["end"]
});

// Custom constraint schema
const customConstraintSchema = z.object({
  name: z.string().min(1, 'Constraint name is required'),
  rule: z.string().min(1, 'Constraint rule is required'),
  weight: z.number().min(0).max(1, 'Weight must be between 0 and 1')
});

// Plan generation schema
export const planGenerationSchema = z.object({
  dateRange: dateRangeSchema,
  
  stationIds: z.array(z.string().min(1, 'Station ID cannot be empty'))
    .optional(),
  
  shiftTemplateIds: z.array(z.string().min(1, 'Shift template ID cannot be empty'))
    .optional(),
  
  strategy: z.nativeEnum(PlanningStrategy, {
    errorMap: () => ({ message: 'Invalid planning strategy' })
  }).default(PlanningStrategy.BALANCED),
  
  constraints: z.array(customConstraintSchema)
    .optional()
});

// Plan commit schema
export const planCommitSchema = z.object({
  assignmentIds: z.array(z.string().min(1, 'Assignment ID cannot be empty'))
    .min(1, 'At least one assignment must be selected for commit')
    .optional() // If not provided, commit all assignments in the plan
});

// Coverage query schema
export const coverageQuerySchema = z.object({
  dateStart: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional(),
  
  dateEnd: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
  
  stationIds: z.string() // Comma-separated station IDs
    .optional()
}).refine((data) => {
  if (data.dateStart && data.dateEnd) {
    return new Date(data.dateEnd) >= new Date(data.dateStart);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["dateEnd"]
});

// Plan query schema
export const planQuerySchema = z.object({
  status: z.enum(['proposed', 'committed', 'rejected']).optional(),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdBy: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

// Route parameters schema
export const planParamsSchema = z.object({
  id: z.string().min(1, 'Plan ID is required')
});

// Simulation schema
export const simulationSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  
  changes: z.object({
    addAbsences: z.array(z.object({
      employeeId: z.string().min(1, 'Employee ID is required'),
      dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: z.enum(['vacation', 'sick', 'training', 'personal'])
    })).optional(),
    
    removeAbsences: z.array(z.string().min(1, 'Absence ID is required'))
      .optional(),
    
    modifyDemands: z.array(z.object({
      demandId: z.string().min(1, 'Demand ID is required'),
      requiredCount: z.number().min(0, 'Required count must be non-negative')
    })).optional()
  })
});

// Assignment explanation schema
export const assignmentExplanationSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required')
});