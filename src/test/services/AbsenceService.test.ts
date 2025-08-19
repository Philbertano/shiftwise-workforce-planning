import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AbsenceService } from '../../services/AbsenceService.js';
import { IAbsenceRepository } from '../../repositories/absence.repository.js';
import { AssignmentRepository } from '../../repositories/assignment.repository.js';
import { EmployeeRepository } from '../../repositories/employee.repository.js';
import { ShiftDemandRepository } from '../../repositories/shift-demand.repository.js';
import {
  Absence,
  Employee,
  Assignment,
  ShiftDemand,
  AbsenceType,
  ContractType,
  AssignmentStatus,
  Priority
} from '../../types/index.js';
import { addDays, subDays } from 'date-fns';

describe('AbsenceService', () => {
  let absenceService: AbsenceService;
  let mockAbsenceRepo: IAbsenceRepository;
  let mockAssignmentRepo: AssignmentRepository;
  let mockEmployeeRepo: EmployeeRepository;
  let mockDemandRepo: ShiftDemandRepository;

  const baseDate = new Date('2024-01-15');
  const mockEmployee: Employee = {
    id: 'emp-1',
    name: 'John Doe',
    contractType: ContractType.FULL_TIME,
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 12,
    team: 'Production',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAbsence: Absence = {
    id: 'abs-1',
    employeeId: 'emp-1',
    type: AbsenceType.VACATION,
    dateStart: baseDate,
    dateEnd: addDays(baseDate, 2),
    approved: false,
    reason: 'Family vacation',
    createdAt: subDays(baseDate, 14), // 14 days notice
    updatedAt: subDays(baseDate, 14)
  };

  beforeEach(() => {
    // Mock repositories
    mockAbsenceRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByEmployee: vi.fn(),
      findByType: vi.fn(),
      findByDateRange: vi.fn(),
      findPendingApproval: vi.fn(),
      findConflicting: vi.fn(),
      findActiveAbsences: vi.fn(),
      approveAbsence: vi.fn(),
      rejectAbsence: vi.fn(),
      findByApprovalStatus: vi.fn(),
      findOverlapping: vi.fn(),
      updateApproval: vi.fn(),
      getAbsenceStats: vi.fn(),
      getUpcomingAbsences: vi.fn(),
      checkAbsenceImpact: vi.fn()
    };

    mockAssignmentRepo = {
      findByEmployeeAndDateRange: vi.fn()
    } as any;

    mockEmployeeRepo = {
      findById: vi.fn(),
      findAll: vi.fn()
    } as any;

    mockDemandRepo = {
      findById: vi.fn(),
      findByDateRange: vi.fn()
    } as any;

    absenceService = new AbsenceService(
      mockAbsenceRepo,
      mockAssignmentRepo,
      mockEmployeeRepo,
      mockDemandRepo
    );
  });

  describe('createAbsence', () => {
    it('should create absence successfully with valid data', async () => {
      const futureDate = addDays(new Date(), 20); // 20 days in future for adequate notice
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.VACATION,
        dateStart: futureDate,
        dateEnd: addDays(futureDate, 2),
        approved: false,
        reason: 'Family vacation'
      };

      const futureAbsence = {
        ...mockAbsence,
        dateStart: futureDate,
        dateEnd: addDays(futureDate, 2),
        createdAt: new Date() // Current time for adequate notice
      };

      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(mockEmployee);
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);
      vi.mocked(mockAbsenceRepo.create).mockResolvedValue(futureAbsence);

      const result = await absenceService.createAbsence(absenceData);

      expect(result).toEqual(futureAbsence);
      expect(mockAbsenceRepo.create).toHaveBeenCalledWith(absenceData);
    });

    it('should reject absence for inactive employee', async () => {
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.VACATION,
        dateStart: baseDate,
        dateEnd: addDays(baseDate, 2),
        approved: false,
        reason: 'Family vacation'
      };

      const inactiveEmployee = { ...mockEmployee, active: false };
      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(inactiveEmployee);

      await expect(absenceService.createAbsence(absenceData))
        .rejects.toThrow('Cannot create absence for inactive employee');
    });

    it('should reject absence with invalid date range', async () => {
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.VACATION,
        dateStart: addDays(baseDate, 2),
        dateEnd: baseDate, // End before start
        approved: false,
        reason: 'Invalid dates'
      };

      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(mockEmployee);

      await expect(absenceService.createAbsence(absenceData))
        .rejects.toThrow('Start date cannot be after end date');
    });

    it('should reject absence exceeding maximum duration', async () => {
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.PERSONAL,
        dateStart: baseDate,
        dateEnd: addDays(baseDate, 10), // 11 days, exceeds 5-day limit
        approved: false,
        reason: 'Too long'
      };

      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(mockEmployee);

      await expect(absenceService.createAbsence(absenceData))
        .rejects.toThrow('personal absence cannot exceed 5 days');
    });

    it('should reject absence with overlapping existing absence', async () => {
      const futureDate = addDays(new Date(), 20);
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.VACATION,
        dateStart: futureDate,
        dateEnd: addDays(futureDate, 2),
        approved: false,
        reason: 'Overlapping'
      };

      const existingAbsence = { ...mockAbsence, id: 'abs-2' };

      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(mockEmployee);
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([existingAbsence]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      await expect(absenceService.createAbsence(absenceData))
        .rejects.toThrow('Cannot create absence: Overlaps with 1 existing absence(s)');
    });

    it('should handle insufficient notice for non-sick leave', async () => {
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.VACATION,
        dateStart: addDays(new Date(), 5), // Only 5 days notice, needs 14
        dateEnd: addDays(new Date(), 7),
        approved: false,
        reason: 'Short notice'
      };

      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(mockEmployee);
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      await expect(absenceService.createAbsence(absenceData))
        .rejects.toThrow('Insufficient notice');
    });

    it('should allow sick leave with short notice', async () => {
      const absenceData = {
        employeeId: 'emp-1',
        type: AbsenceType.SICK,
        dateStart: new Date(), // Today
        dateEnd: addDays(new Date(), 1),
        approved: false,
        reason: 'Flu'
      };

      vi.mocked(mockEmployeeRepo.findById).mockResolvedValue(mockEmployee);
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);
      vi.mocked(mockAbsenceRepo.create).mockResolvedValue({
        ...mockAbsence,
        type: AbsenceType.SICK,
        dateStart: new Date(),
        dateEnd: addDays(new Date(), 1)
      });

      const result = await absenceService.createAbsence(absenceData);

      expect(result).toBeDefined();
      expect(mockAbsenceRepo.create).toHaveBeenCalled();
    });
  });

  describe('approveAbsence', () => {
    it('should approve absence successfully', async () => {
      const approvedAbsence = { ...mockAbsence, approved: true, approvedBy: 'manager-1' };

      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(mockAbsence);
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);
      vi.mocked(mockAbsenceRepo.approveAbsence).mockResolvedValue(approvedAbsence);

      const result = await absenceService.approveAbsence('abs-1', 'manager-1');

      expect(result).toEqual(approvedAbsence);
      expect(mockAbsenceRepo.approveAbsence).toHaveBeenCalledWith('abs-1', 'manager-1');
    });

    it('should reject approval for non-existent absence', async () => {
      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(null);

      await expect(absenceService.approveAbsence('abs-999', 'manager-1'))
        .rejects.toThrow('Absence not found');
    });

    it('should reject approval for already approved absence', async () => {
      const approvedAbsence = { ...mockAbsence, approved: true };
      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(approvedAbsence);

      await expect(absenceService.approveAbsence('abs-1', 'manager-1'))
        .rejects.toThrow('Absence is already approved');
    });

    it('should reject approval if new conflicts exist', async () => {
      const conflictingAbsence = { ...mockAbsence, id: 'abs-2' };

      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(mockAbsence);
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([conflictingAbsence]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      await expect(absenceService.approveAbsence('abs-1', 'manager-1'))
        .rejects.toThrow('Cannot approve absence due to conflicts');
    });
  });

  describe('checkConflicts', () => {
    it('should detect overlapping absences', async () => {
      const conflictingAbsence = { ...mockAbsence, id: 'abs-2' };

      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([conflictingAbsence]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      const result = await absenceService.checkConflicts(mockAbsence);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('assignment_overlap');
      expect(result.conflicts[0].severity).toBe('error');
    });

    it('should detect insufficient notice', async () => {
      const shortNoticeAbsence = {
        ...mockAbsence,
        type: AbsenceType.VACATION,
        createdAt: subDays(baseDate, 5) // Only 5 days notice, needs 14
      };

      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      const result = await absenceService.checkConflicts(shortNoticeAbsence);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some(c => c.type === 'insufficient_notice')).toBe(true);
    });

    it('should detect blackout period conflicts', async () => {
      const decemberAbsence = {
        ...mockAbsence,
        dateStart: new Date('2024-12-20'),
        dateEnd: new Date('2024-12-25')
      };

      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      const result = await absenceService.checkConflicts(decemberAbsence);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some(c => c.type === 'blackout_period')).toBe(true);
    });

    it('should return no conflicts for valid absence', async () => {
      vi.mocked(mockAbsenceRepo.findConflicting).mockResolvedValue([]);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue([]);

      const result = await absenceService.checkConflicts(mockAbsence);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('getAbsenceImpact', () => {
    it('should calculate impact for absence with assignments', async () => {
      const mockAssignments: Assignment[] = [
        {
          id: 'assign-1',
          demandId: 'demand-1',
          employeeId: 'emp-1',
          status: AssignmentStatus.CONFIRMED,
          score: 85,
          createdAt: new Date(),
          createdBy: 'system',
          updatedAt: new Date()
        }
      ];

      const mockDemand: ShiftDemand = {
        id: 'demand-1',
        date: baseDate,
        stationId: 'station-1',
        shiftTemplateId: 'shift-1',
        requiredCount: 1,
        priority: Priority.HIGH,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAlternatives = [
        { ...mockEmployee, id: 'emp-2', name: 'Jane Smith' }
      ];

      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(mockAbsence);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue(mockAssignments);
      vi.mocked(mockDemandRepo.findById).mockResolvedValue(mockDemand);
      vi.mocked(mockDemandRepo.findByDateRange).mockResolvedValue([mockDemand]);
      vi.mocked(mockEmployeeRepo.findAll).mockResolvedValue(mockAlternatives);

      const result = await absenceService.getAbsenceImpact('abs-1');

      expect(result.affectedDemands).toHaveLength(1);
      expect(result.coverageReduction).toBe(100); // 1 affected out of 1 total
      expect(result.alternativeEmployees).toHaveLength(1);
      expect(result.riskAssessment).toContain('MEDIUM'); // Only 1 alternative, so limited alternatives
    });

    it('should calculate low impact for absence without critical assignments', async () => {
      const mockAssignments: Assignment[] = [
        {
          id: 'assign-1',
          demandId: 'demand-1',
          employeeId: 'emp-1',
          status: AssignmentStatus.CONFIRMED,
          score: 85,
          createdAt: new Date(),
          createdBy: 'system',
          updatedAt: new Date()
        }
      ];

      const mockDemand: ShiftDemand = {
        id: 'demand-1',
        date: baseDate,
        stationId: 'station-1',
        shiftTemplateId: 'shift-1',
        requiredCount: 1,
        priority: Priority.LOW,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAlternatives = [
        { ...mockEmployee, id: 'emp-2', name: 'Jane Smith' },
        { ...mockEmployee, id: 'emp-3', name: 'Bob Johnson' }
      ];

      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(mockAbsence);
      vi.mocked(mockAssignmentRepo.findByEmployeeAndDateRange).mockResolvedValue(mockAssignments);
      vi.mocked(mockDemandRepo.findById).mockResolvedValue(mockDemand);
      vi.mocked(mockDemandRepo.findByDateRange).mockResolvedValue([mockDemand, mockDemand, mockDemand]); // 3 total demands
      vi.mocked(mockEmployeeRepo.findAll).mockResolvedValue(mockAlternatives);

      const result = await absenceService.getAbsenceImpact('abs-1');

      expect(result.affectedDemands).toHaveLength(1);
      expect(result.coverageReduction).toBeCloseTo(33.33, 1); // 1 affected out of 3 total
      expect(result.alternativeEmployees).toHaveLength(2);
      expect(result.riskAssessment).toContain('LOW');
    });

    it('should handle absence not found', async () => {
      vi.mocked(mockAbsenceRepo.findById).mockResolvedValue(null);

      await expect(absenceService.getAbsenceImpact('abs-999'))
        .rejects.toThrow('Absence not found');
    });
  });

  describe('getAbsences', () => {
    it('should return absences for employee in date range', async () => {
      const dateRange = {
        start: baseDate,
        end: addDays(baseDate, 7)
      };

      const mockAbsences = [mockAbsence];

      vi.mocked(mockAbsenceRepo.findByDateRange).mockResolvedValue(mockAbsences);

      const result = await absenceService.getAbsences('emp-1', dateRange);

      expect(result).toEqual(mockAbsences);
      expect(mockAbsenceRepo.findByDateRange).toHaveBeenCalledWith(dateRange.start, dateRange.end);
    });

    it('should filter absences by employee ID', async () => {
      const dateRange = {
        start: baseDate,
        end: addDays(baseDate, 7)
      };

      const mockAbsences = [
        mockAbsence,
        { ...mockAbsence, id: 'abs-2', employeeId: 'emp-2' }
      ];

      vi.mocked(mockAbsenceRepo.findByDateRange).mockResolvedValue(mockAbsences);

      const result = await absenceService.getAbsences('emp-1', dateRange);

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-1');
    });
  });
});