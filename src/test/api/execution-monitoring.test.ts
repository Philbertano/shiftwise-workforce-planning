// Integration tests for execution monitoring API

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import executionMonitoringRoutes from '../../api/routes/execution-monitoring.js';

// Mock the services
vi.mock('../../services/ExecutionMonitoringService.js');
vi.mock('../../repositories/execution-status.repository.js');
vi.mock('../../repositories/plan.repository.js');
vi.mock('../../repositories/assignment.repository.js');
vi.mock('../../services/AuditService.js');

const app = express();
app.use(express.json());
app.use('/api/execution-monitoring', executionMonitoringRoutes);

describe('Execution Monitoring API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT /api/execution-monitoring/status', () => {
    it('should update assignment status successfully', async () => {
      const mockExecutionStatus = {
        planId: 'plan-1',
        assignmentId: 'assignment-1',
        status: 'in_progress',
        actualStartTime: new Date(),
        updatedAt: new Date(),
        updatedBy: 'supervisor-1'
      };

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.updateAssignmentStatus).mockResolvedValue(mockExecutionStatus);

      const response = await request(app)
        .put('/api/execution-monitoring/status')
        .send({
          assignmentId: 'assignment-1',
          status: 'in_progress',
          actualStartTime: new Date().toISOString(),
          notes: 'Started on time'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .put('/api/execution-monitoring/status')
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.updateAssignmentStatus)
        .mockRejectedValue(new Error('Assignment not found'));

      const response = await request(app)
        .put('/api/execution-monitoring/status')
        .send({
          assignmentId: 'nonexistent',
          status: 'in_progress',
          actualStartTime: new Date().toISOString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Assignment not found');
    });
  });

  describe('GET /api/execution-monitoring/plan/:planId/summary', () => {
    it('should return plan execution summary', async () => {
      const mockSummary = {
        planId: 'plan-1',
        totalAssignments: 10,
        completedAssignments: 7,
        inProgressAssignments: 2,
        cancelledAssignments: 1,
        noShowAssignments: 0,
        completionRate: 70,
        onTimeRate: 85,
        lastUpdated: new Date()
      };

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.getPlanExecutionSummary).mockResolvedValue(mockSummary);

      const response = await request(app)
        .get('/api/execution-monitoring/plan/plan-1/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.planId).toBe('plan-1');
      expect(response.body.data.completionRate).toBe(70);
    });
  });

  describe('GET /api/execution-monitoring/assignment/:assignmentId/history', () => {
    it('should return assignment execution history', async () => {
      const mockHistory = [
        {
          planId: 'plan-1',
          assignmentId: 'assignment-1',
          status: 'scheduled',
          updatedAt: new Date(),
          updatedBy: 'system'
        },
        {
          planId: 'plan-1',
          assignmentId: 'assignment-1',
          status: 'in_progress',
          actualStartTime: new Date(),
          updatedAt: new Date(),
          updatedBy: 'supervisor-1'
        }
      ];

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.getAssignmentExecutionHistory).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/execution-monitoring/assignment/assignment-1/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/execution-monitoring/plan/:planId/coverage', () => {
    it('should return real-time coverage status', async () => {
      const mockCoverage = {
        totalDemands: 10,
        filledDemands: 8,
        coveragePercentage: 80,
        gaps: [],
        riskLevel: 'medium'
      };

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.getRealTimeCoverage).mockResolvedValue(mockCoverage);

      const response = await request(app)
        .get('/api/execution-monitoring/plan/plan-1/coverage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coveragePercentage).toBe(80);
    });
  });

  describe('POST /api/execution-monitoring/last-minute-change', () => {
    it('should handle last-minute change successfully', async () => {
      const mockResult = {
        originalAssignment: {
          id: 'assignment-1',
          demandId: 'demand-1',
          employeeId: 'employee-1',
          status: 'confirmed',
          score: 85,
          createdAt: new Date(),
          createdBy: 'system',
          updatedAt: new Date()
        },
        impactAnalysis: {
          affectedStations: ['station-1'],
          coverageImpact: -10,
          recommendedActions: ['Find replacement']
        }
      };

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.handleLastMinuteChange).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/execution-monitoring/last-minute-change')
        .send({
          assignmentId: 'assignment-1',
          changeType: 'cancel',
          reason: 'Employee sick'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.originalAssignment.id).toBe('assignment-1');
    });

    it('should validate change type', async () => {
      const response = await request(app)
        .post('/api/execution-monitoring/last-minute-change')
        .send({
          assignmentId: 'assignment-1',
          changeType: 'invalid',
          reason: 'Test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/execution-monitoring/plan/:planId/alerts', () => {
    it('should return execution alerts', async () => {
      const mockAlerts = {
        noShows: [],
        lateStarts: [],
        earlyEnds: [],
        coverageGaps: []
      };

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.getExecutionAlerts).mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/execution-monitoring/plan/plan-1/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('noShows');
      expect(response.body.data).toHaveProperty('lateStarts');
      expect(response.body.data).toHaveProperty('earlyEnds');
      expect(response.body.data).toHaveProperty('coverageGaps');
    });
  });

  describe('POST /api/execution-monitoring/replanning', () => {
    it('should trigger re-planning successfully', async () => {
      const mockResult = {
        newAssignments: [],
        updatedCoverage: {
          totalDemands: 10,
          filledDemands: 8,
          coveragePercentage: 80,
          gaps: [],
          riskLevel: 'medium'
        }
      };

      const { ExecutionMonitoringService } = await import('../../services/ExecutionMonitoringService.js');
      vi.mocked(ExecutionMonitoringService.prototype.triggerReplanningForGaps).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/execution-monitoring/replanning')
        .send({
          planId: 'plan-1',
          gapDemandIds: ['demand-1', 'demand-2']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCoverage.coveragePercentage).toBe(80);
    });
  });

  describe('GET /api/execution-monitoring/stats', () => {
    it('should return execution statistics', async () => {
      const mockStats = {
        totalAssignments: 100,
        completionRate: 85,
        onTimeRate: 90,
        noShowRate: 5,
        byStatus: [
          { status: 'completed', count: 85 },
          { status: 'in_progress', count: 10 },
          { status: 'no_show', count: 5 }
        ]
      };

      const { ExecutionStatusRepository } = await import('../../repositories/execution-status.repository.js');
      vi.mocked(ExecutionStatusRepository.prototype.getExecutionStats).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/execution-monitoring/stats?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.completionRate).toBe(85);
    });

    it('should require date parameters', async () => {
      const response = await request(app)
        .get('/api/execution-monitoring/stats')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('startDate and endDate are required');
    });
  });
});