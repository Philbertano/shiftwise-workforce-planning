import { describe, it, expect, beforeEach } from 'vitest';
import { Absence } from '../../models/Absence.js';
import { AbsenceType } from '../../types/index.js';
import { addDays, subDays } from 'date-fns';

describe('Absence Model', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  const validAbsenceData = {
    id: 'absence-001',
    employeeId: 'employee-001',
    type: AbsenceType.VACATION,
    dateStart: tomorrow,
    dateEnd: addDays(tomorrow, 2), // 3-day vacation
    approved: false,
    reason: 'Family vacation'
  };

  describe('Constructor and Validation', () => {
    it('should create a valid absence', () => {
      const absence = new Absence(validAbsenceData);
      
      expect(absence.id).toBe('absence-001');
      expect(absence.employeeId).toBe('employee-001');
      expect(absence.type).toBe(AbsenceType.VACATION);
      expect(absence.dateStart).toEqual(tomorrow);
      expect(absence.dateEnd).toEqual(addDays(tomorrow, 2));
      expect(absence.approved).toBe(false);
      expect(absence.reason).toBe('Family vacation');
      expect(absence.createdAt).toBeInstanceOf(Date);
      expect(absence.updatedAt).toBeInstanceOf(Date);
    });

    it('should create absence without reason', () => {
      const data = { ...validAbsenceData };
      delete data.reason;
      
      const absence = new Absence(data);
      expect(absence.reason).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new Absence({ ...validAbsenceData, id: '' }))
        .toThrow('Absence ID is required');
    });

    it('should throw error for empty employee ID', () => {
      expect(() => new Absence({ ...validAbsenceData, employeeId: '' }))
        .toThrow('Employee ID is required');
    });

    it('should throw error for reason too long', () => {
      const longReason = 'a'.repeat(501);
      expect(() => new Absence({ ...validAbsenceData, reason: longReason }))
        .toThrow('Reason too long');
    });
  });

  describe('Business Rule Validation', () => {
    it('should throw error for start date after end date', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        dateStart: nextWeek,
        dateEnd: tomorrow
      })).toThrow('Start date cannot be after end date');
    });

    it('should throw error for approved absence without approver', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        approved: true,
        approvedBy: undefined
      })).toThrow('Approved by is required when absence is approved');
    });

    it('should throw error for unapproved absence with approver', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        approved: false,
        approvedBy: 'manager-001'
      })).toThrow('Cannot have approver when absence is not approved');
    });

    it('should throw error for excessive duration', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        dateEnd: addDays(validAbsenceData.dateStart, 366) // 367 days
      })).toThrow('Absence duration cannot exceed 365 days');
    });

    it('should throw error for sick leave scheduled too far in advance', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: addDays(today, 8), // 8 days in advance
        dateEnd: addDays(today, 8) // Same day to avoid date order validation
      })).toThrow('Sick leave cannot be scheduled more than 7 days in advance');
    });
  });

  describe('Type-Specific Validations', () => {
    it('should validate vacation duration limits', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        type: AbsenceType.VACATION,
        dateEnd: addDays(validAbsenceData.dateStart, 31) // 32 days
      })).toThrow('Vacation absence cannot exceed 30 days');
    });

    it('should validate sick leave duration limits', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: today, // Today to avoid advance scheduling validation
        dateEnd: addDays(today, 91) // 92 days
      })).toThrow('Sick leave absence cannot exceed 90 days');
    });

    it('should validate training duration and reason requirements', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        type: AbsenceType.TRAINING,
        dateEnd: addDays(validAbsenceData.dateStart, 15) // 16 days
      })).toThrow('Training absence cannot exceed 14 days');

      expect(() => new Absence({
        ...validAbsenceData,
        type: AbsenceType.TRAINING,
        reason: undefined
      })).toThrow('Training absences must include a reason');
    });

    it('should validate personal leave duration limits', () => {
      expect(() => new Absence({
        ...validAbsenceData,
        type: AbsenceType.PERSONAL,
        dateEnd: addDays(validAbsenceData.dateStart, 6) // 7 days
      })).toThrow('Personal absence cannot exceed 5 days');
    });
  });

  describe('Duration Calculations', () => {
    let absence: Absence;

    beforeEach(() => {
      absence = new Absence(validAbsenceData);
    });

    it('should calculate duration correctly', () => {
      expect(absence.getDurationDays()).toBe(3); // Start day + 2 more days
    });

    it('should handle single-day absence', () => {
      const singleDayAbsence = new Absence({
        ...validAbsenceData,
        dateEnd: validAbsenceData.dateStart // Same day
      });
      expect(singleDayAbsence.getDurationDays()).toBe(1);
    });
  });

  describe('Status Checks', () => {
    it('should check if absence is active', () => {
      const activeAbsence = new Absence({
        ...validAbsenceData,
        dateStart: subDays(today, 1),
        dateEnd: addDays(today, 1)
      });
      expect(activeAbsence.isActive()).toBe(true);
      expect(activeAbsence.isActive(today)).toBe(true);
    });

    it('should check if absence is future', () => {
      const futureAbsence = new Absence(validAbsenceData);
      expect(futureAbsence.isFuture()).toBe(true);
    });

    it('should check if absence is past', () => {
      const pastAbsence = new Absence({
        ...validAbsenceData,
        dateStart: subDays(today, 5),
        dateEnd: subDays(today, 2)
      });
      expect(pastAbsence.isPast()).toBe(true);
    });

    it('should check approval status', () => {
      const absence = new Absence(validAbsenceData);
      expect(absence.isPendingApproval()).toBe(true);
      
      const approvedAbsence = new Absence({
        ...validAbsenceData,
        approved: true,
        approvedBy: 'manager-001'
      });
      expect(approvedAbsence.isPendingApproval()).toBe(false);
    });
  });

  describe('Approval Requirements', () => {
    it('should determine if absence requires approval', () => {
      const vacationAbsence = new Absence(validAbsenceData);
      expect(vacationAbsence.requiresApproval()).toBe(true);
      
      const singleDaySick = new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: today,
        dateEnd: today
      });
      expect(singleDaySick.requiresApproval()).toBe(false);
      
      const multiDaySick = new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: today,
        dateEnd: addDays(today, 1)
      });
      expect(multiDaySick.requiresApproval()).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    let absence1: Absence;
    let absence2: Absence;

    beforeEach(() => {
      absence1 = new Absence(validAbsenceData);
      absence2 = new Absence({
        ...validAbsenceData,
        id: 'absence-002',
        dateStart: addDays(tomorrow, 1),
        dateEnd: addDays(tomorrow, 3)
      });
    });

    it('should detect conflicts with specific dates', () => {
      expect(absence1.conflictsWithDate(tomorrow)).toBe(true);
      expect(absence1.conflictsWithDate(addDays(tomorrow, 1))).toBe(true);
      expect(absence1.conflictsWithDate(addDays(tomorrow, 2))).toBe(true);
      expect(absence1.conflictsWithDate(addDays(tomorrow, 3))).toBe(false);
    });

    it('should detect conflicts between absences', () => {
      expect(absence1.conflictsWith(absence2)).toBe(true); // Overlapping dates
    });

    it('should not detect conflicts for different employees', () => {
      const differentEmployeeAbsence = new Absence({
        ...validAbsenceData,
        id: 'absence-003',
        employeeId: 'employee-002'
      });
      expect(absence1.conflictsWith(differentEmployeeAbsence)).toBe(false);
    });

    it('should not detect conflicts for non-overlapping dates', () => {
      const nonOverlappingAbsence = new Absence({
        ...validAbsenceData,
        id: 'absence-004',
        dateStart: addDays(tomorrow, 5),
        dateEnd: addDays(tomorrow, 7)
      });
      expect(absence1.conflictsWith(nonOverlappingAbsence)).toBe(false);
    });
  });

  describe('Notice Requirements', () => {
    it('should return correct notice periods for different types', () => {
      const vacation = new Absence(validAbsenceData);
      expect(vacation.getRequiredNoticeDays()).toBe(7); // Short vacation

      const longVacation = new Absence({
        ...validAbsenceData,
        dateEnd: addDays(validAbsenceData.dateStart, 6) // 7 days
      });
      expect(longVacation.getRequiredNoticeDays()).toBe(14); // Long vacation

      const training = new Absence({
        ...validAbsenceData,
        type: AbsenceType.TRAINING
      });
      expect(training.getRequiredNoticeDays()).toBe(7);

      const personal = new Absence({
        ...validAbsenceData,
        type: AbsenceType.PERSONAL
      });
      expect(personal.getRequiredNoticeDays()).toBe(3);

      const sick = new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: today
      });
      expect(sick.getRequiredNoticeDays()).toBe(0);
    });

    it('should check if adequate notice was given', () => {
      const submissionDate = subDays(tomorrow, 10); // 10 days notice
      const absence = new Absence(validAbsenceData);
      expect(absence.hasAdequateNotice(submissionDate)).toBe(true);

      const lateSubmission = subDays(tomorrow, 3); // Only 3 days notice
      expect(absence.hasAdequateNotice(lateSubmission)).toBe(false);
    });
  });

  describe('Priority and Cancellation', () => {
    it('should return correct priorities', () => {
      const sick = new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: today
      });
      expect(sick.getPriority()).toBe(1);

      const training = new Absence({
        ...validAbsenceData,
        type: AbsenceType.TRAINING
      });
      expect(training.getPriority()).toBe(2);

      const vacation = new Absence(validAbsenceData);
      expect(vacation.getPriority()).toBe(3);

      const personal = new Absence({
        ...validAbsenceData,
        type: AbsenceType.PERSONAL
      });
      expect(personal.getPriority()).toBe(4);
    });

    it('should check if absence can be cancelled', () => {
      const futureAbsence = new Absence({
        ...validAbsenceData,
        dateStart: addDays(today, 2) // 2 days in future
      });
      expect(futureAbsence.canBeCancelled()).toBe(true);

      const soonAbsence = new Absence({
        ...validAbsenceData,
        dateStart: addDays(today, 0.5) // 12 hours in future
      });
      expect(soonAbsence.canBeCancelled()).toBe(false);

      const activeAbsence = new Absence({
        ...validAbsenceData,
        dateStart: subDays(today, 1),
        dateEnd: addDays(today, 1)
      });
      expect(activeAbsence.canBeCancelled()).toBe(false);
    });
  });

  describe('Absence Management', () => {
    let absence: Absence;

    beforeEach(() => {
      absence = new Absence(validAbsenceData);
    });

    it('should approve absence', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      const approved = absence.approve('manager-001');
      
      expect(approved.approved).toBe(true);
      expect(approved.approvedBy).toBe('manager-001');
      expect(approved.updatedAt.getTime()).toBeGreaterThan(absence.updatedAt.getTime());
    });

    it('should throw error when approving already approved absence', () => {
      const approvedAbsence = new Absence({
        ...validAbsenceData,
        approved: true,
        approvedBy: 'manager-001'
      });
      
      expect(() => approvedAbsence.approve('manager-002'))
        .toThrow('Absence is already approved');
    });

    it('should reject absence', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      const approvedAbsence = new Absence({
        ...validAbsenceData,
        approved: true,
        approvedBy: 'manager-001'
      });
      
      const rejected = approvedAbsence.reject();
      expect(rejected.approved).toBe(false);
      expect(rejected.approvedBy).toBeUndefined();
    });

    it('should update dates', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      const newStart = addDays(tomorrow, 1);
      const newEnd = addDays(tomorrow, 3);
      
      const updated = absence.updateDates(newStart, newEnd);
      expect(updated.dateStart).toEqual(newStart);
      expect(updated.dateEnd).toEqual(newEnd);
      expect(updated.approved).toBe(false); // Should reset approval
      expect(updated.approvedBy).toBeUndefined();
    });

    it('should update reason', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = absence.updateReason('Updated vacation reason');
      
      expect(updated.reason).toBe('Updated vacation reason');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(absence.updatedAt.getTime());
    });
  });

  describe('Serialization', () => {
    let absence: Absence;

    beforeEach(() => {
      absence = new Absence(validAbsenceData);
    });

    it('should serialize to JSON correctly', () => {
      const json = absence.toJSON();
      
      expect(json).toHaveProperty('id', 'absence-001');
      expect(json).toHaveProperty('employeeId', 'employee-001');
      expect(json).toHaveProperty('type', AbsenceType.VACATION);
      expect(json).toHaveProperty('dateStart');
      expect(json).toHaveProperty('dateEnd');
      expect(json).toHaveProperty('approved', false);
      expect(json).toHaveProperty('reason', 'Family vacation');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle same-day absence', () => {
      const sameDayAbsence = new Absence({
        ...validAbsenceData,
        dateEnd: validAbsenceData.dateStart
      });
      expect(sameDayAbsence.getDurationDays()).toBe(1);
    });

    it('should handle maximum allowed durations', () => {
      const maxVacation = new Absence({
        ...validAbsenceData,
        type: AbsenceType.VACATION,
        dateEnd: addDays(validAbsenceData.dateStart, 29) // 30 days
      });
      expect(maxVacation.getDurationDays()).toBe(30);

      const maxSick = new Absence({
        ...validAbsenceData,
        type: AbsenceType.SICK,
        dateStart: today,
        dateEnd: addDays(today, 89) // Should be exactly 90 days (89 days difference + 1 for inclusion)
      });
      expect(maxSick.getDurationDays()).toBe(90);
    });

    it('should handle absence conflicts with itself', () => {
      const absence = new Absence(validAbsenceData);
      expect(absence.conflictsWith(absence)).toBe(false);
    });

    it('should handle boundary date conflicts', () => {
      const absence1 = new Absence({
        ...validAbsenceData,
        dateStart: tomorrow,
        dateEnd: addDays(tomorrow, 2)
      });
      
      const absence2 = new Absence({
        ...validAbsenceData,
        id: 'absence-002',
        dateStart: addDays(tomorrow, 2), // Starts when first ends
        dateEnd: addDays(tomorrow, 4)
      });
      
      expect(absence1.conflictsWith(absence2)).toBe(true); // Same day counts as conflict
    });
  });
});