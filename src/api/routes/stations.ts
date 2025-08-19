// Stations API routes

import { Router } from 'express';
import { StationRepository } from '../../repositories/station.repository';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { stationSchema, stationUpdateSchema, stationQuerySchema, stationParamsSchema } from '../schemas/station';
import { UserRole } from '../../types';

const router = Router();
const stationRepo = new StationRepository();

// Get all stations
router.get('/', 
  authenticateToken,
  validateQuery(stationQuerySchema),
  async (req, res) => {
    try {
      const { line, priority, limit, offset } = req.query;
      
      let stations;
      if (line) {
        stations = await stationRepo.findByLine(line as string);
      } else if (priority) {
        stations = await stationRepo.findByPriority(priority as any);
      } else {
        stations = await stationRepo.findAll();
      }
      
      // Apply pagination if specified
      if (limit || offset) {
        const limitNum = limit ? parseInt(limit as string) : 50;
        const offsetNum = offset ? parseInt(offset as string) : 0;
        stations = stations.slice(offsetNum, offsetNum + limitNum);
      }
      
      res.json({
        success: true,
        data: stations,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch stations'
        },
        timestamp: new Date()
      });
    }
  }
);

// Get station by ID
router.get('/:id',
  authenticateToken,
  validateParams(stationParamsSchema),
  async (req, res) => {
    try {
      const station = await stationRepo.findById(req.params.id);
      
      if (!station) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Station not found'
          },
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: station,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch station'
        },
        timestamp: new Date()
      });
    }
  }
);

// Create new station
router.post('/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateRequest(stationSchema),
  async (req, res) => {
    try {
      const station = await stationRepo.create(req.body);
      
      res.status(201).json({
        success: true,
        data: station,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Station with this name already exists'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create station'
        },
        timestamp: new Date()
      });
    }
  }
);

// Update station
router.put('/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER]),
  validateParams(stationParamsSchema),
  validateRequest(stationUpdateSchema),
  async (req, res) => {
    try {
      const station = await stationRepo.update(req.params.id, req.body);
      
      res.json({
        success: true,
        data: station,
        timestamp: new Date()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Station not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update station'
        },
        timestamp: new Date()
      });
    }
  }
);

// Delete station
router.delete('/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  validateParams(stationParamsSchema),
  async (req, res) => {
    try {
      await stationRepo.delete(req.params.id);
      
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
            message: 'Station not found'
          },
          timestamp: new Date()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete station'
        },
        timestamp: new Date()
      });
    }
  }
);

export { router as stationRoutes };