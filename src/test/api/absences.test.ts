import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { absenceRoutes } from '../../api/routes/absences.js';
import { AbsenceRepository } from '../../repositories/absence.repository.js';
import {
  Absence,
  AbsenceType,
  UserRole
} from '../../types/index.js';
import { addDays } from 'date-fns';

// Mock the repository
vi.mock('../../repositories/absence.repository.js');

describe('Absence API Routes', () => {
  let app: express.Application;
  let mockAbsenceRepo: any;

  const baseDate = new Date('2024-01-15');
  const mockAbsence: Absence = {
    id: 'abs-1',
    employeeId: 'emp-1',
    type: AbsenceType.VACATION,
    dateStart: baseDate,
    dateEnd: addDays(baseDate, 2),
    approved: false,
    reason: 'Family vacation',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    roles: [UserRole.HR_PLANNER]
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.auth = { user: mockUser };
      next();
    });
    
    app.use('/api/absences', absenceRoutes);

    // Reset mocks
    mockAbsenceRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmployee: vi.fn(),
      findByType: vi.fn(),
      findByApprovalStatus: vi.fn(),
      findByDateRange: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateApproval: vi.fn(),
      findOverlapping: vi.fn(),
      checkAbsenceImpact: vi.fn(),
      getAbsenceStats: vi.fn(),
      getUpcomingAbsences: vi.fn(),
      approveAbsence: vi.fn()
    };

    vi.mocked(AbsenceRepository).mockImplementation(() => mockAbsenceRepo);
  });

  describe('GET /api/absences', () => {
    it('should return all absences', async () => {
      mockAbsenceRepo.findAll.mockResolvedValue([mockAbsence]);

      const response = await request(app)
        .get('/api/absences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(mockAbsence);
    });

    it('should filter absences by employee ID', async () => {
      mockAbsenceRepo.findByEmployee.mockResolvedValue([mockAbsence]);

      const response = await request(app)
        .get('/api/absences?employeeId=emp-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAbsenceRepo.findByEmployee).toHaveBeenCalledWith('emp-1');
    });

    it('should filter absences by type', async () => {
      mockAbsenceRepo.findByType.mockResolvedValue([mockAbsence]);

      const response = await request(app)
        .get('/api/absences?type=vacation')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAbsenceRepo.findByType).toHaveBeenCalledWith('vacation');
    });

    it('should filter absences by approval status', async () => {
      mockAbsenceRepo.findByApprovalStatus.mockResolvedValue([mockAbsence]);

      const response = await request(app)
        .get('/api/absences?approved=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAbsenceRepo.findByApprovalStatus).toHaveBeenCalledWith(false);
    });

    it('should apply pagination', async () => {
      const absences = Array(10).fill(mockAbsence).map((abs, i) => ({ ...abs, id: `abs-${i}` }));
      mockAbsenceRepo.findAll.mockResolvedValue(absences);

      const response = await request(app)
        .get('/api/absences?limit=5&offset=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
    });
  });

  describe('GET /api/absences/:id', () => {
    it('should return absence by ID', async () => {
      mockAbsenceRepo.findById.mockResolvedValue(mockAbsence);

      const response = await request(app)
        .get('/api/absences/abs-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAbsence);
    });

    it('should return 404 for non-existent absence', async () => {
      mockAbsenceRepo.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/absences/abs-999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/absences', () => {
    const validAbsenceData = {
      employeeId: 'emp-1',
      type: AbsenceType.VACATION,
      dateStart: baseDate.toISOString(),
      dateEnd: addDays(baseDate, 2).toISOString(),
      reason: 'Family vacation'
    };

    it('should create absence successfully', async () => {
      mockAbsenceRepo.findOverlapping.mockResolvedValue([]);
      mockAbsenceRepo.create.mockResolvedValue(mockAbsence);

      const response = await request(app)
        .post('/api/absences')
        .send(validAbsenceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAbsence);
      expect(mockAbsenceRepo.create).toHaveBeenCalledWith(validAbsenceData);
    });

    it('should reject absence with overlapping dates', async () => {
      const overlappingAbsence = { ...mockAbsence, id: 'abs-2' };
      mockAbsenceRepo.findOverlapping.mockResolvedValue([overlappingAbsence]);

      const response = await request(app)
        .post('/api/absences')
        .send(validAbsenceData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.details.overlappingAbsences).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        employeeId: 'emp-1',
        // Missing type, dateStart, dateEnd
      };

      const response = await request(app)
        .post('/api/absences')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/absences/:id/approval', () => {
    it('should approve absence successfully', async () => {
      const approvedAbsence = { ...mockAbsence, approved: true, approvedBy: 'user-1' };
      mockAbsenceRepo.updateApproval.mockResolvedValue(approvedAbsence);

      const response = await request(app)
        .patch('/api/absences/abs-1/approval')
        .send({ approved: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.approved).toBe(true);
      expect(mockAbsenceRepo.updateApproval).toHaveBeenCalledWith('abs-1', true, 'user-1');
    });

    it('should reject absence successfully', async () => {
      mockAbsenceRepo.updateApproval.mockResolvedValue(mockAbsence);

      const response = await request(app)
        .patch('/api/absences/abs-1/approval')
        .send({ approved: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAbsenceRepo.updateApproval).toHaveBeenCalledWith('abs-1', false, 'user-1');
    });

    it('should return 404 for non-existent absence', async () => {
      mockAbsenceRepo.updateApproval.mockRejectedValue(new Error('Absence abs-999 not found'));

      const response = await request(app)
        .patch('/api/absences/abs-999/approval')
        .send({ approved: true })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/absences/check-conflicts', () => {
    const conflictCheckData = {
      employeeId: 'emp-1',
      type: AbsenceType.VACATION,
      dateStart: baseDate.toISOString(),
      dateEnd: addDays(baseDate, 2).toISOString()
    };

    it('should return no conflicts for valid absence', async () => {
      mockAbsenceRepo.findConflicting.mockResolvedValue([]);
      mockAbsenceRepo.checkAbsenceImpact.mockResolvedValue({
        conflictingAssignments: 0,
        affectedStations: [],
        impactLevel: 'low'
      });

      const response = await request(app)
        .post('/api/absences/check-conflicts')
        .send(conflictCheckData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasConflicts).toBe(false);
      expect(response.body.data.canProceed).toBe(true);
    });

    it('should detect overlapping absences', async () => {
      const overlappingAbsence = { ...mockAbsence, id: 'abs-2' };
      mockAbsenceRepo.findConflicting.mockResolvedValue([overlappingAbsence]);
      mockAbsenceRepo.checkAbsenceImpact.mockResolvedValue({
        conflictingAssignments: 0,
        affectedStations: [],
        impactLevel: 'low'
      });

      const response = await request(app)
        .post('/api/absences/check-conflicts')
        .send(conflictCheckData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasConflicts).toBe(true);
      expect(response.body.data.conflicts).toHaveLength(1);
      expect(response.body.data.conflicts[0].type).toBe('absence_overlap');
      expect(response.body.data.canProceed).toBe(false);
    });

    it('should detect assignment conflicts', async () => {
      mockAbsenceRepo.findConflicting.mockResolvedValue([]);
      mockAbsenceRepo.checkAbsenceImpact.mockResolvedValue({
        conflictingAssignments: 3,
        affectedStations: ['Station A', 'Station B'],
        impactLevel: 'high'
      });

      const response = await request(app)
        .post('/api/absences/check-conflicts')
        .send(conflictCheckData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasConflicts).toBe(true);
      expect(response.body.data.conflicts).toHaveLength(1);
      expect(response.body.data.conflicts[0].type).toBe('assignment_conflict');
      expect(response.body.data.conflicts[0].severity).toBe('warning');
    });

    it('should mark critical conflicts as errors', async () => {
      mockAbsenceRepo.findConflicting.mockResolvedValue([]);
      mockAbsenceRepo.checkAbsenceImpact.mockResolvedValue({
        conflictingAssignments: 5,
        affectedStations: ['Station A', 'Station B', 'Station C'],
        impactLevel: 'critical'
      });

      const response = await request(app)
        .post('/api/absences/check-conflicts')
        .send(conflictCheckData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conflicts[0].severity).toBe('error');
      expect(response.body.data.canProceed).toBe(false);
    });
  });

  describe('GET /api/absences/:id/impact', () => {
    it('should return impact analysis for absence', async () => {
      const impactAnalysis = {
        conflictingAssignments: 2,
        affectedStations: ['Station A'],
        impactLevel: 'medium'
      };

      mockAbsenceRepo.findById.mockResolvedValue(mockAbsence);
      mockAbsenceRepo.checkAbsenceImpact.mockResolvedValue(impactAnalysis);

      const response = await request(app)
        .get('/api/absences/abs-1/impact')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.absence).toEqual(mockAbsence);
      expect(response.body.data.impactAnalysis).toEqual(impactAnalysis);
      expect(response.body.data.recommendations).toBeDefined();
    });

    it('should return 404 for non-existent absence', async () => {
      mockAbsenceRepo.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/absences/abs-999/impact')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/absences/bulk-approve', () => {
    it('should approve multiple absences successfully', async () => {
      const absenceIds = ['abs-1', 'abs-2', 'abs-3'];
      const approvedAbsences = absenceIds.map(id => ({ ...mockAbsence, id, approved: true }));

      mockAbsenceRepo.approveAbsence
        .mockResolvedValueOnce(approvedAbsences[0])
        .mockResolvedValueOnce(approvedAbsences[1])
        .mockResolvedValueOnce(approvedAbsences[2]);

      const response = await request(app)
        .post('/api/absences/bulk-approve')
        .send({ absenceIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.approved).toHaveLength(3);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data.summary.total).toBe(3);
      expect(response.body.data.summary.approved).toBe(3);
      expect(response.body.data.summary.failed).toBe(0);
    });

    it('should handle partial failures in bulk approval', async () => {
      const absenceIds = ['abs-1', 'abs-2', 'abs-3'];
      const approvedAbsence = { ...mockAbsence, id: 'abs-1', approved: true };

      mockAbsenceRepo.approveAbsence
        .mockResolvedValueOnce(approvedAbsence)
        .mockRejectedValueOnce(new Error('Absence abs-2 not found'))
        .mockResolvedValueOnce({ ...mockAbsence, id: 'abs-3', approved: true });

      const response = await request(app)
        .post('/api/absences/bulk-approve')
        .send({ absenceIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.approved).toHaveLength(2);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].absenceId).toBe('abs-2');
      expect(response.body.data.summary.approved).toBe(2);
      expect(response.body.data.summary.failed).toBe(1);
    });

    it('should validate absenceIds parameter', async () => {
      const response = await request(app)
        .post('/api/absences/bulk-approve')
        .send({ absenceIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /api/absences/stats/summary', () => {
    it('should return absence statistics', async () => {
      const stats = {
        totalAbsences: 25,
        byType: [
          { type: AbsenceType.VACATION, count: 15, days: 45 },
          { type: AbsenceType.SICK, count: 8, days: 12 },
          { type: AbsenceType.PERSONAL, count: 2, days: 3 }
        ],
        byEmployee: [
          { employeeId: 'emp-1', employeeName: 'John Doe', count: 3, days: 9 }
        ],
        pendingApproval: 5,
        avgDuration: 2.4
      };

      mockAbsenceRepo.getAbsenceStats.mockResolvedValue(stats);

      const response = await request(app)
        .get('/api/absences/stats/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAbsences).toBe(25);
      expect(response.body.data.byType).toHaveLength(3);
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should accept custom date range', async () => {
      const stats = { totalAbsences: 10, byType: [], byEmployee: [], pendingApproval: 2, avgDuration: 1.5 };
      mockAbsenceRepo.getAbsenceStats.mockResolvedValue(stats);

      const response = await request(app)
        .get('/api/absences/stats/summary?dateStart=2024-01-01&dateEnd=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAbsenceRepo.getAbsenceStats).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });
  });

  describe('GET /api/absences/upcoming/list', () => {
    it('should return upcoming absences', async () => {
      const upcomingAbsences = [
        { ...mockAbsence, dateStart: addDays(new Date(), 5) }
      ];

      mockAbsenceRepo.getUpcomingAbsences.mockResolvedValue(upcomingAbsences);

      const response = await request(app)
        .get('/api/absences/upcoming/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(upcomingAbsences);
      expect(mockAbsenceRepo.getUpcomingAbsences).toHaveBeenCalledWith(30);
    });

    it('should accept custom days parameter', async () => {
      mockAbsenceRepo.getUpcomingAbsences.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/absences/upcoming/list?days=14')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAbsenceRepo.getUpcomingAbsences).toHaveBeenCalledWith(14);
    });
  });
});