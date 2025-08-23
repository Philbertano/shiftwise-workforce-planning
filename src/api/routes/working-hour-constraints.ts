import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WorkingHourConstraintRepository } from '../../repositories/working-hour-constraint.repository.js';
import { WorkingHourConstraint, NightShiftRestrictions } from '../../models/WorkingHourConstraint.js';
import { ContractType } from '../../types/index.js';
import { validateRequest } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';


// Validation schemas
const NightShiftRestrictionsSchema = z.object({
  maxConsecutiveNights: z.number().min(1).optional(),
  minRestAfterNights: z.number().min(8).optional(),
  maxNightsPerWeek: z.number().min(1).optional(),
  requireMedicalClearance: z.boolean().optional()
});

const CreateConstraintSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  maxConsecutiveDays: z.number().min(1).max(14),
  minRestDays: z.number().min(1).max(7),
  maxHoursPerWeek: z.number().min(1).max(80),
  maxHoursPerDay: z.number().min(1).max(16),
  minHoursBetweenShifts: z.number().min(0).max(24),
  allowBackToBackShifts: z.boolean().default(false),
  weekendWorkAllowed: z.boolean().default(true),
  nightShiftRestrictions: NightShiftRestrictionsSchema.optional(),
  contractTypes: z.array(z.nativeEnum(ContractType)).min(1, 'At least one contract type is required')
});

const UpdateConstraintSchema = CreateConstraintSchema.partial();

const QueryConstraintsSchema = z.object({
  contractType: z.nativeEnum(ContractType).optional(),
  active: z.string().transform(str => str === 'true').optional(),
  namePattern: z.string().optional(),
  weekendWork: z.string().transform(str => str === 'true').optional(),
  backToBackShifts: z.string().transform(str => str === 'true').optional(),
  nightShiftRestrictions: z.string().transform(str => str === 'true').optional()
});

export function createWorkingHourConstraintsRouter(): Router {
  const router = Router();
  const constraintRepo = new WorkingHourConstraintRepository();

  // Apply authentication middleware to all routes
  router.use(requireAuth(['hr_planner', 'admin']));

  /**
   * GET /api/working-hour-constraints
   * Get working hour constraints with optional filtering
   */
  router.get('/', validateRequest({ query: QueryConstraintsSchema }), async (req: Request, res: Response) => {
    try {
      const { contractType, active, namePattern, weekendWork, backToBackShifts, nightShiftRestrictions } = req.query as any;
      let constraints: WorkingHourConstraint[];

      if (contractType) {
        constraints = await constraintRepo.findByContractType(contractType);
      } else if (namePattern) {
        constraints = await constraintRepo.findByNamePattern(namePattern);
      } else if (nightShiftRestrictions === true) {
        constraints = await constraintRepo.findWithNightShiftRestrictions();
      } else if (weekendWork === false) {
        constraints = await constraintRepo.findNoWeekendWork();
      } else if (backToBackShifts === false) {
        constraints = await constraintRepo.findNoBackToBackShifts();
      } else if (active === true) {
        constraints = await constraintRepo.findActive();
      } else {
        constraints = await constraintRepo.findAll();
      }

      // Apply additional filters
      if (active !== undefined && contractType) {
        constraints = constraints.filter(c => c.active === active);
      }

      res.json({
        success: true,
        data: constraints.map(c => c.toJSON()),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching working hour constraints:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch working hour constraints',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/working-hour-constraints/:id
   * Get a specific working hour constraint by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const constraint = await constraintRepo.findById(id);

      if (!constraint) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Working hour constraint not found'
          },
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: constraint.toJSON(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching working hour constraint:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch working hour constraint',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/working-hour-constraints
   * Create a new working hour constraint
   */
  router.post('/', validateRequest({ body: CreateConstraintSchema }), async (req: Request, res: Response) => {
    try {
      const data = req.body;

      // Generate ID for the constraint
      const constraintId = `constraint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the constraint
      const constraint = new WorkingHourConstraint({
        id: constraintId,
        name: data.name,
        description: data.description,
        maxConsecutiveDays: data.maxConsecutiveDays,
        minRestDays: data.minRestDays,
        maxHoursPerWeek: data.maxHoursPerWeek,
        maxHoursPerDay: data.maxHoursPerDay,
        minHoursBetweenShifts: data.minHoursBetweenShifts,
        allowBackToBackShifts: data.allowBackToBackShifts,
        weekendWorkAllowed: data.weekendWorkAllowed,
        nightShiftRestrictions: data.nightShiftRestrictions,
        contractTypes: data.contractTypes
      });

      await constraintRepo.create(constraint);

      res.status(201).json({
        success: true,
        data: constraint.toJSON(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error creating working hour constraint:', error);
      
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_NAME',
            message: 'A constraint with this name already exists'
          },
          timestamp: new Date()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: 'Failed to create working hour constraint',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * PUT /api/working-hour-constraints/:id
   * Update a working hour constraint
   */
  router.put('/:id', validateRequest({ body: UpdateConstraintSchema }), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existingConstraint = await constraintRepo.findById(id);
      if (!existingConstraint) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Working hour constraint not found'
          },
          timestamp: new Date()
        });
      }

      const updatedConstraint = existingConstraint.update(data);
      await constraintRepo.update(updatedConstraint);

      res.json({
        success: true,
        data: updatedConstraint.toJSON(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating working hour constraint:', error);
      
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_NAME',
            message: 'A constraint with this name already exists'
          },
          timestamp: new Date()
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update working hour constraint',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * DELETE /api/working-hour-constraints/:id
   * Delete a working hour constraint
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingConstraint = await constraintRepo.findById(id);
      if (!existingConstraint) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Working hour constraint not found'
          },
          timestamp: new Date()
        });
      }

      await constraintRepo.delete(id);

      res.json({
        success: true,
        data: { id },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error deleting working hour constraint:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete working hour constraint',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/working-hour-constraints/statistics/contract-types
   * Get constraint statistics by contract type
   */
  router.get('/statistics/contract-types', async (req: Request, res: Response) => {
    try {
      const statistics = await constraintRepo.getStatisticsByContractType();

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching constraint statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch constraint statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/working-hour-constraints/most-restrictive/:contractType
   * Get the most restrictive constraint for a contract type
   */
  router.get('/most-restrictive/:contractType', async (req: Request, res: Response) => {
    try {
      const contractType = req.params.contractType as ContractType;
      
      if (!Object.values(ContractType).includes(contractType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTRACT_TYPE',
            message: 'Invalid contract type'
          },
          timestamp: new Date()
        });
      }

      const constraint = await constraintRepo.findMostRestrictive(contractType);

      if (!constraint) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No constraints found for this contract type'
          },
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        data: constraint.toJSON(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching most restrictive constraint:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch most restrictive constraint',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/working-hour-constraints/conflicts
   * Get potential conflicts between constraints
   */
  router.get('/conflicts', async (req: Request, res: Response) => {
    try {
      const conflicts = await constraintRepo.findPotentialConflicts();

      res.json({
        success: true,
        data: conflicts,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching constraint conflicts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch constraint conflicts',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/working-hour-constraints/:id/deactivate
   * Deactivate a working hour constraint
   */
  router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingConstraint = await constraintRepo.findById(id);
      if (!existingConstraint) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Working hour constraint not found'
          },
          timestamp: new Date()
        });
      }

      const deactivatedConstraint = existingConstraint.update({ active: false });
      await constraintRepo.update(deactivatedConstraint);

      res.json({
        success: true,
        data: deactivatedConstraint.toJSON(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error deactivating working hour constraint:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DEACTIVATE_ERROR',
          message: 'Failed to deactivate working hour constraint',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  return router;
}