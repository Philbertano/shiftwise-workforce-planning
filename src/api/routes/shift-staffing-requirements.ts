import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ShiftStaffingRequirementRepository } from '../../repositories/shift-staffing-requirement.repository.js';
import { ShiftSkillRequirementRepository } from '../../repositories/shift-skill-requirement.repository.js';
import { ShiftStaffingRequirement } from '../../models/ShiftStaffingRequirement.js';
import { ShiftSkillRequirement } from '../../models/ShiftSkillRequirement.js';
import { Priority } from '../../types/index.js';
import { validateRequest } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';


// Validation schemas
const CreateStaffingRequirementSchema = z.object({
  stationId: z.string().min(1, 'Station ID is required'),
  shiftTemplateId: z.string().min(1, 'Shift template ID is required'),
  minEmployees: z.number().min(1, 'Minimum employees must be at least 1'),
  maxEmployees: z.number().min(1, 'Maximum employees must be at least 1'),
  optimalEmployees: z.number().min(1, 'Optimal employees must be at least 1'),
  priority: z.nativeEnum(Priority),
  effectiveFrom: z.string().transform(str => new Date(str)),
  effectiveUntil: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional(),
  skillRequirements: z.array(z.object({
    skillId: z.string().min(1, 'Skill ID is required'),
    minLevel: z.number().min(1).max(3),
    requiredCount: z.number().min(1),
    mandatory: z.boolean().default(true),
    priority: z.nativeEnum(Priority)
  })).optional()
});

const UpdateStaffingRequirementSchema = CreateStaffingRequirementSchema.partial().omit({ stationId: true, shiftTemplateId: true });

const QueryStaffingRequirementsSchema = z.object({
  stationId: z.string().optional(),
  shiftTemplateId: z.string().optional(),
  priority: z.nativeEnum(Priority).optional(),
  date: z.string().transform(str => new Date(str)).optional(),
  active: z.string().transform(str => str === 'true').optional()
});

export function createShiftStaffingRequirementsRouter(): Router {
  const router = Router();
  const staffingRepo = new ShiftStaffingRequirementRepository();
  const skillRepo = new ShiftSkillRequirementRepository();

  // Apply authentication middleware to all routes
  router.use(requireAuth(['shift_leader', 'hr_planner', 'admin']));

  /**
   * GET /api/shift-staffing-requirements
   * Get staffing requirements with optional filtering
   */
  router.get('/', validateRequest({ query: QueryStaffingRequirementsSchema }), async (req: Request, res: Response) => {
    try {
      const { stationId, shiftTemplateId, priority, date, active } = req.query as any;
      let requirements: ShiftStaffingRequirement[];

      if (date) {
        if (stationId) {
          requirements = await staffingRepo.findByStationForDate(stationId, date);
        } else {
          requirements = await staffingRepo.findActiveForDate(date);
        }
      } else if (stationId && shiftTemplateId) {
        requirements = await staffingRepo.findByStationAndShift(stationId, shiftTemplateId);
      } else if (priority) {
        requirements = await staffingRepo.findByPriority(priority);
      } else {
        requirements = await staffingRepo.findAll();
      }

      // Filter by active status if specified
      if (active !== undefined) {
        requirements = requirements.filter(req => req.active === active);
      }

      // Get skill requirements for each staffing requirement
      const requirementIds = requirements.map(req => req.id);
      const skillRequirementsMap = await skillRepo.findByStaffingRequirements(requirementIds);

      const result = requirements.map(requirement => ({
        ...requirement.toJSON(),
        skillRequirements: skillRequirementsMap.get(requirement.id)?.map(sr => sr.toJSON()) || []
      }));

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching staffing requirements:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch staffing requirements',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/shift-staffing-requirements/:id
   * Get a specific staffing requirement by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const requirement = await staffingRepo.findById(id);

      if (!requirement) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Staffing requirement not found'
          },
          timestamp: new Date()
        });
      }

      // Get skill requirements
      const skillRequirements = await skillRepo.findByStaffingRequirement(id);

      res.json({
        success: true,
        data: {
          ...requirement.toJSON(),
          skillRequirements: skillRequirements.map(sr => sr.toJSON())
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching staffing requirement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch staffing requirement',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/shift-staffing-requirements
   * Create a new staffing requirement
   */
  router.post('/', validateRequest({ body: CreateStaffingRequirementSchema }), async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const userId = req.user?.id || 'system';

      // Generate ID for the staffing requirement
      const requirementId = `staffing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the staffing requirement
      const requirement = new ShiftStaffingRequirement({
        id: requirementId,
        stationId: data.stationId,
        shiftTemplateId: data.shiftTemplateId,
        minEmployees: data.minEmployees,
        maxEmployees: data.maxEmployees,
        optimalEmployees: data.optimalEmployees,
        priority: data.priority,
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil,
        notes: data.notes
      });

      // Check for conflicts
      const conflicts = await staffingRepo.findConflicts(requirement);
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Staffing requirement conflicts with existing requirements',
            details: conflicts.map(c => ({
              id: c.id,
              effectiveFrom: c.effectiveFrom,
              effectiveUntil: c.effectiveUntil
            }))
          },
          timestamp: new Date()
        });
      }

      // Save the staffing requirement
      await staffingRepo.create(requirement);

      // Create skill requirements if provided
      const skillRequirements: ShiftSkillRequirement[] = [];
      if (data.skillRequirements) {
        for (const skillReq of data.skillRequirements) {
          const skillRequirementId = `skill_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const skillRequirement = new ShiftSkillRequirement({
            id: skillRequirementId,
            staffingRequirementId: requirementId,
            skillId: skillReq.skillId,
            minLevel: skillReq.minLevel,
            requiredCount: skillReq.requiredCount,
            mandatory: skillReq.mandatory,
            priority: skillReq.priority
          });
          
          await skillRepo.create(skillRequirement);
          skillRequirements.push(skillRequirement);
        }
      }

      res.status(201).json({
        success: true,
        data: {
          ...requirement.toJSON(),
          skillRequirements: skillRequirements.map(sr => sr.toJSON())
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error creating staffing requirement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: 'Failed to create staffing requirement',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * PUT /api/shift-staffing-requirements/:id
   * Update a staffing requirement
   */
  router.put('/:id', validateRequest({ body: UpdateStaffingRequirementSchema }), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existingRequirement = await staffingRepo.findById(id);
      if (!existingRequirement) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Staffing requirement not found'
          },
          timestamp: new Date()
        });
      }

      // Update the requirement
      const updatedRequirement = existingRequirement.update(data);

      // Check for conflicts if dates changed
      if (data.effectiveFrom || data.effectiveUntil) {
        const conflicts = await staffingRepo.findConflicts(updatedRequirement);
        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Updated staffing requirement conflicts with existing requirements',
              details: conflicts.map(c => ({
                id: c.id,
                effectiveFrom: c.effectiveFrom,
                effectiveUntil: c.effectiveUntil
              }))
            },
            timestamp: new Date()
          });
        }
      }

      await staffingRepo.update(updatedRequirement);

      // Handle skill requirements if provided
      let skillRequirements: ShiftSkillRequirement[] = [];
      if (data.skillRequirements) {
        // Delete existing skill requirements
        await skillRepo.deleteByStaffingRequirement(id);

        // Create new skill requirements
        for (const skillReq of data.skillRequirements) {
          const skillRequirementId = `skill_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const skillRequirement = new ShiftSkillRequirement({
            id: skillRequirementId,
            staffingRequirementId: id,
            skillId: skillReq.skillId,
            minLevel: skillReq.minLevel,
            requiredCount: skillReq.requiredCount,
            mandatory: skillReq.mandatory,
            priority: skillReq.priority
          });
          
          await skillRepo.create(skillRequirement);
          skillRequirements.push(skillRequirement);
        }
      } else {
        // Keep existing skill requirements
        skillRequirements = await skillRepo.findByStaffingRequirement(id);
      }

      res.json({
        success: true,
        data: {
          ...updatedRequirement.toJSON(),
          skillRequirements: skillRequirements.map(sr => sr.toJSON())
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating staffing requirement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update staffing requirement',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * DELETE /api/shift-staffing-requirements/:id
   * Delete a staffing requirement
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingRequirement = await staffingRepo.findById(id);
      if (!existingRequirement) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Staffing requirement not found'
          },
          timestamp: new Date()
        });
      }

      // Delete skill requirements first
      await skillRepo.deleteByStaffingRequirement(id);

      // Delete the staffing requirement
      await staffingRepo.delete(id);

      res.json({
        success: true,
        data: { id },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error deleting staffing requirement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete staffing requirement',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/shift-staffing-requirements/summary/stations
   * Get staffing requirements summary by station
   */
  router.get('/summary/stations', async (req: Request, res: Response) => {
    try {
      const summary = await staffingRepo.getStationSummary();

      res.json({
        success: true,
        data: summary,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching station summary:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch station summary',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/shift-staffing-requirements/expiring
   * Get requirements that are expiring soon
   */
  router.get('/expiring', async (req: Request, res: Response) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 30;
      const expiringRequirements = await staffingRepo.findExpiringSoon(daysAhead);

      res.json({
        success: true,
        data: expiringRequirements.map(req => req.toJSON()),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error fetching expiring requirements:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch expiring requirements',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/shift-staffing-requirements/:id/deactivate
   * Deactivate a staffing requirement
   */
  router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingRequirement = await staffingRepo.findById(id);
      if (!existingRequirement) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Staffing requirement not found'
          },
          timestamp: new Date()
        });
      }

      const deactivatedRequirement = existingRequirement.deactivate();
      await staffingRepo.update(deactivatedRequirement);

      res.json({
        success: true,
        data: deactivatedRequirement.toJSON(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error deactivating staffing requirement:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DEACTIVATE_ERROR',
          message: 'Failed to deactivate staffing requirement',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  });

  return router;
}