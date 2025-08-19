// Shifts API routes

import { Router } from 'express';
import { ShiftTemplateRepository } from '../../repositories/shift-template.repository';
import { ShiftDemandRepository } from '../../repositories/shift-demand.repository';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { 
  shiftTemplateSchema, 
  shiftTemplateUpdateSchema, 
  shiftDemandSchema,
  shiftDemandUpdateSchema,
  shiftQuerySchema, 
  shiftParamsSchema 
} from '../schemas/shift';
import { UserRole } from '../../types';

const router = Router();
const shiftTemplateRepo = new ShiftTemplateRepository();
const shiftDemandRepo = new ShiftDemandRepository();

// Get all shift templates
router.get('/templates', 
  authenticateToken,
  validateQuery(shiftQuerySchema),
  async (req, res) => {
    try {
      const { shiftType, limit, offset } = req.query;
      
      let templates;
      if (shiftType) {
        templates = await shiftTemplateRepo.findByType(shiftType as any);
      } else {
        templates = await shiftTemplateRepo.findAll();
      }
      
      // Apply pagination if specified
      if (limit || offset) {
        const limitNum = limit ? parseInt(limit as string) : 50;
        const offsetNum = offset ? parseInt(offset as string) : 0;
        templates = templates.slice(offsetNum, offsetNum + limitNum);
      }
      
      res.json({
        success: true,
        data: templates,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch shift templates'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get shift template by ID
router.get('/templates/:id',
  authenticateToken,
  validateParams(shiftParamsSchema),
  async (req, res) => {
    try {
      const template = await shiftTemplateRepo.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shift template not found'
          },
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: template,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch shift template'
        },
        timestamp: new Date()
      });
    }
  }
);

// Create new shift template
router.post('/templates',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateRequest(shiftTemplateSchema),
  async (req, res) => {
    try {
      const template = await shiftTemplateRepo.create(req.body);
      
      res.status(201).json({
        success: true,
        data: template,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Shift template with this name already exists'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create shift template'
        },
        timestamp: new Date()
      });
    }
  }
);

// Update shift template
router.put('/templates/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateParams(shiftParamsSchema),
  validateRequest(shiftTemplateUpdateSchema),
  async (req, res) => {
    try {
      const template = await shiftTemplateRepo.update(req.params.id, req.body);
      
      res.json({
        success: true,
        data: template,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shift template not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update shift template'
        },
        timestamp: new Date()
      });
    }
  }
);

// Delete shift template
router.delete('/templates/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  validateParams(shiftParamsSchema),
  async (req, res) => {
    try {
      await shiftTemplateRepo.delete(req.params.id);
      
      res.json({
        success: true,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shift template not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete shift template'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get shift demands
router.get('/demands', 
  authenticateToken,
  async (req, res) => {
    try {
      const { date, stationId, priority } = req.query;
      
      let demands;
      if (date) {
        demands = await shiftDemandRepo.findByDate(new Date(date as string));
      } else if (stationId) {
        demands = await shiftDemandRepo.findByStation(stationId as string);
      } else if (priority) {
        demands = await shiftDemandRepo.findByPriority(priority as any);
      } else {
        demands = await shiftDemandRepo.findAll();
      }
      
      res.json({
        success: true,
        data: demands,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch shift demands'
        },
        timestamp: new Date()
      });
    }
  }
);

// Create shift demand
router.post('/demands',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateRequest(shiftDemandSchema),
  async (req, res) => {
    try {
      const demand = await shiftDemandRepo.create(req.body);
      
      res.status(201).json({
        success: true,
        data: demand,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create shift demand'
        },
        timestamp: new Date()
      });
    }
  }
);

// Update shift demand
router.put('/demands/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateParams(shiftParamsSchema),
  validateRequest(shiftDemandUpdateSchema),
  async (req, res) => {
    try {
      const demand = await shiftDemandRepo.update(req.params.id, req.body);
      
      res.json({
        success: true,
        data: demand,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Shift demand not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update shift demand'
        },
        timestamp: new Date()
      });
    }
  }
);

export { router as shiftRoutes };