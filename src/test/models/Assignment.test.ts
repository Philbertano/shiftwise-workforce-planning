import { describe, it, expect, beforeEach } from 'vitest';
import { Assignment } from '../../models/Assignment.js';
import { AssignmentStatus } from '../../types/index.js';

describe('Assignment Model', () => {
  const validAssignmentData = {
    id: 'assignment-001',
    demandId: 'demand-001',
    employeeId: 'employee-001',
    status: AssignmentStatus.PROPOSED,
    score: 85,
    explanation: 'Employee has required skills and good availability',
    createdBy: 'user-001'
  };

  describe('Constructor and Validation', () => {
    it('should create a valid assignment', () => {
      const assignment = new Assignment(validAssignmentData);
      
      expect(assignment.id).toBe('assignment-001');
      expect(assignment.demandId).toBe('demand-001');
      expect(assignment.employeeId).toBe('employee-001');
      expect(assignment.status).toBe(AssignmentStatus.PROPOSED);
      expect(assignment.score).toBe(85);
      expect(assignment.explanation).toBe('Employee has required skills and good availability');
      expect(assignment.createdBy).toBe('user-001');
      expect(assignment.createdAt).toBeInstanceOf(Date);
      expect(assignment.updatedAt).toBeInstanceOf(Date);
    });

    it('should create assignment without explanation', () => {
      const data = { ...validAssignmentData };
      delete data.explanation;
      
      const assignment = new Assignment(data);
      expect(assignment.explanation).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new Assignment({ ...validAssignmentData, id: '' }))
        .toThrow('Assignment ID is required');
    });

    it('should throw error for empty demand ID', () => {
      expect(() => new Assignment({ ...validAssignmentData, demandId: '' }))
        .toThrow('Demand ID is required');
    });

    it('should throw error for empty employee ID', () => {
      expect(() => new Assignment({ ...validAssignmentData, employeeId: '' }))
        .toThrow('Employee ID is required');
    });

    it('should throw error for invalid score', () => {
      expect(() => new Assignment({ ...validAssignmentData, score: -1 }))
        .toThrow('Score must be non-negative');
      
      expect(() => new Assignment({ ...validAssignmentData, score: 101 }))
        .toThrow('Score cannot exceed 100');
    });

    it('should throw error for explanation too long', () => {
      const longExplanation = 'a'.repeat(1001);
      expect(() => new Assignment({ ...validAssignmentData, explanation: longExplanation }))
        .toThrow('Explanation too long');
    });

    it('should throw error for empty created by', () => {
      expect(() => new Assignment({ ...validAssignmentData, createdBy: '' }))
        .toThrow('Created by is required');
    });
  });

  describe('Business Rule Validation', () => {
    it('should throw error for low score without explanation', () => {
      expect(() => new Assignment({
        ...validAssignmentData,
        score: 40,
        explanation: undefined
      })).toThrow('Explanation is required for assignments with score below 50');
    });

    it('should allow low score with explanation', () => {
      expect(() => new Assignment({
        ...validAssignmentData,
        score: 40,
        explanation: 'Limited availability but best option available'
      })).not.toThrow();
    });

    it('should throw error for confirming low score assignment', () => {
      expect(() => new Assignment({
        ...validAssignmentData,
        status: AssignmentStatus.CONFIRMED,
        score: 25
      })).toThrow('Cannot confirm assignment with score below 30');
    });

    it('should throw error for short explanation', () => {
      expect(() => new Assignment({
        ...validAssignmentData,
        explanation: 'short'
      })).toThrow('Explanation must be at least 10 characters long');
    });
  });

  describe('Status Checks', () => {
    let assignment: Assignment;

    beforeEach(() => {
      assignment = new Assignment(validAssignmentData);
    });

    it('should check if assignment is active', () => {
      expect(assignment.isActive()).toBe(true);
      
      const confirmedAssignment = new Assignment({
        ...validAssignmentData,
        status: AssignmentStatus.CONFIRMED
      });
      expect(confirmedAssignment.isActive()).toBe(true);
      
      const rejectedAssignment = new Assignment({
        ...validAssignmentData,
        status: AssignmentStatus.REJECTED,
        score: 30 // Higher score to avoid confirmation validation
      });
      expect(rejectedAssignment.isActive()).toBe(false);
    });

    it('should check specific status types', () => {
      expect(assignment.isProposed()).toBe(true);
      expect(assignment.isConfirmed()).toBe(false);
      expect(assignment.isRejected()).toBe(false);
    });
  });

  describe('Score Analysis', () => {
    it('should check if assignment has good score', () => {
      const highScoreAssignment = new Assignment({ ...validAssignmentData, score: 85 });
      expect(highScoreAssignment.hasGoodScore()).toBe(true);
      expect(highScoreAssignment.hasGoodScore(80)).toBe(true);
      expect(highScoreAssignment.hasGoodScore(90)).toBe(false);
    });

    it('should identify assignments needing attention', () => {
      const lowScoreAssignment = new Assignment({
        ...validAssignmentData,
        score: 40,
        explanation: 'Limited options available'
      });
      expect(lowScoreAssignment.needsAttention()).toBe(true);
      
      const mediumScoreNoExplanation = new Assignment({
        ...validAssignmentData,
        score: 65,
        explanation: undefined
      });
      expect(mediumScoreNoExplanation.needsAttention()).toBe(true);
      
      const goodScoreAssignment = new Assignment({
        ...validAssignmentData,
        score: 85
      });
      expect(goodScoreAssignment.needsAttention()).toBe(false);
    });

    it('should categorize scores correctly', () => {
      const excellentAssignment = new Assignment({ ...validAssignmentData, score: 95 });
      expect(excellentAssignment.getScoreCategory()).toBe('excellent');
      
      const goodAssignment = new Assignment({ ...validAssignmentData, score: 75 });
      expect(goodAssignment.getScoreCategory()).toBe('good');
      
      const fairAssignment = new Assignment({
        ...validAssignmentData,
        score: 55,
        explanation: 'Adequate match'
      });
      expect(fairAssignment.getScoreCategory()).toBe('fair');
      
      const poorAssignment = new Assignment({
        ...validAssignmentData,
        score: 35,
        explanation: 'Best available option'
      });
      expect(poorAssignment.getScoreCategory()).toBe('poor');
    });
  });

  describe('Status Updates', () => {
    let assignment: Assignment;

    beforeEach(() => {
      assignment = new Assignment(validAssignmentData);
    });

    it('should update status with valid transitions', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const confirmed = assignment.updateStatus(AssignmentStatus.CONFIRMED, 'user-002');
      expect(confirmed.status).toBe(AssignmentStatus.CONFIRMED);
      expect(confirmed.updatedAt.getTime()).toBeGreaterThan(assignment.updatedAt.getTime());
      
      const rejected = assignment.updateStatus(AssignmentStatus.REJECTED, 'user-002', 'Better option found');
      expect(rejected.status).toBe(AssignmentStatus.REJECTED);
      expect(rejected.explanation).toBe('Better option found');
    });

    it('should throw error for invalid status transitions', () => {
      const rejectedAssignment = new Assignment({
        ...validAssignmentData,
        status: AssignmentStatus.REJECTED,
        score: 30
      });
      
      expect(() => rejectedAssignment.updateStatus(AssignmentStatus.CONFIRMED, 'user-002'))
        .toThrow('Invalid status transition from rejected to confirmed');
    });

    it('should update score', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = assignment.updateScore(90, 'Improved match after review');
      expect(updated.score).toBe(90);
      expect(updated.explanation).toBe('Improved match after review');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(assignment.updatedAt.getTime());
    });

    it('should throw error for invalid score update', () => {
      expect(() => assignment.updateScore(-5))
        .toThrow('Score must be between 0 and 100');
      
      expect(() => assignment.updateScore(105))
        .toThrow('Score must be between 0 and 100');
    });
  });

  describe('Conflict Detection', () => {
    let assignment1: Assignment;
    let assignment2: Assignment;

    beforeEach(() => {
      assignment1 = new Assignment(validAssignmentData);
      assignment2 = new Assignment({
        ...validAssignmentData,
        id: 'assignment-002',
        demandId: 'demand-002'
      });
    });

    it('should detect conflicts for same employee on same day', () => {
      const date = new Date('2024-01-15');
      const conflicts = assignment1.conflictsWith(
        assignment2,
        date, '08:00', '16:00',
        date, '14:00', '22:00'
      );
      expect(conflicts).toBe(true); // 2-hour overlap
    });

    it('should not detect conflicts for different employees', () => {
      const assignment3 = new Assignment({
        ...validAssignmentData,
        id: 'assignment-003',
        employeeId: 'employee-002'
      });
      
      const date = new Date('2024-01-15');
      const conflicts = assignment1.conflictsWith(
        assignment3,
        date, '08:00', '16:00',
        date, '14:00', '22:00'
      );
      expect(conflicts).toBe(false);
    });

    it('should not detect conflicts for non-overlapping times', () => {
      const date = new Date('2024-01-15');
      const conflicts = assignment1.conflictsWith(
        assignment2,
        date, '08:00', '16:00',
        date, '16:00', '24:00'
      );
      expect(conflicts).toBe(false); // No overlap (end time = start time)
    });

    it('should not detect conflicts for inactive assignments', () => {
      const rejectedAssignment = new Assignment({
        ...validAssignmentData,
        id: 'assignment-003',
        status: AssignmentStatus.REJECTED,
        score: 30
      });
      
      const date = new Date('2024-01-15');
      const conflicts = assignment1.conflictsWith(
        rejectedAssignment,
        date, '08:00', '16:00',
        date, '14:00', '22:00'
      );
      expect(conflicts).toBe(false);
    });
  });

  describe('Serialization', () => {
    let assignment: Assignment;

    beforeEach(() => {
      assignment = new Assignment(validAssignmentData);
    });

    it('should serialize to JSON correctly', () => {
      const json = assignment.toJSON();
      
      expect(json).toHaveProperty('id', 'assignment-001');
      expect(json).toHaveProperty('demandId', 'demand-001');
      expect(json).toHaveProperty('employeeId', 'employee-001');
      expect(json).toHaveProperty('status', AssignmentStatus.PROPOSED);
      expect(json).toHaveProperty('score', 85);
      expect(json).toHaveProperty('explanation');
      expect(json).toHaveProperty('createdBy', 'user-001');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid score', () => {
      const minScoreAssignment = new Assignment({
        ...validAssignmentData,
        score: 0,
        explanation: 'No better options available'
      });
      expect(minScoreAssignment.score).toBe(0);
      expect(minScoreAssignment.getScoreCategory()).toBe('poor');
    });

    it('should handle maximum valid score', () => {
      const maxScoreAssignment = new Assignment({
        ...validAssignmentData,
        score: 100
      });
      expect(maxScoreAssignment.score).toBe(100);
      expect(maxScoreAssignment.getScoreCategory()).toBe('excellent');
    });

    it('should handle overnight shift conflicts', () => {
      const assignment1 = new Assignment(validAssignmentData);
      const assignment2 = new Assignment({
        ...validAssignmentData,
        id: 'assignment-002',
        demandId: 'demand-002'
      });
      
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      
      // This is a simplified test - full overnight logic would be more complex
      const conflicts = assignment1.conflictsWith(
        assignment2,
        date1, '22:00', '06:00', // Overnight shift
        date2, '08:00', '16:00'  // Day shift next day
      );
      expect(conflicts).toBe(false); // Should not conflict in this simple case
    });

    it('should handle same assignment comparison', () => {
      const assignment1 = new Assignment(validAssignmentData);
      const date = new Date('2024-01-15');
      const conflicts = assignment1.conflictsWith(
        assignment1, // Same assignment
        date, '08:00', '16:00',
        date, '08:00', '16:00'
      );
      expect(conflicts).toBe(false); // Same assignment cannot conflict with itself
    });
  });
});