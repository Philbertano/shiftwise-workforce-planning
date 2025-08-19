import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViolationDetector } from '../../constraints/base/ViolationDetector.js';
import { ConstraintViolation } from '../../constraints/base/ConstraintViolation.js';
import { Constraint } from '../../constraints/base/Constraint.js';
import { BaseConstraintValidator } from '../../constraints/base/ConstraintValidator.js';
import { ValidationContext } from '../../constraints/base/ValidationContext.js';
import { Assignment } from '../../models/Assignment.js';
import { Employee, ShiftDemand, Absence, ConstraintType, Severity, AssignmentStatus } from '../../types/index.js';

// Mock constraint for testing
class MockConstraint extends Constraint {
  constructor(
    id: string,
    violations: ConstraintViolation[] = [],
    shouldThrow: boolean = false
  ) {
    const validator = new MockValidator(id, violations, shouldThrow);
    super(id, `Mock ${id}`, ConstraintType.HARD, 100, `Mock constraint ${id}`, validator);
  }

  getSeverity(): Severity {
    return Severity.ERROR;
  }
}

class MockValidator extends BaseConstraintValidator {
  constructor(
    private constraintId: string,
    private violations: ConstraintViolation[],
    private shouldThrow: boolean = false
  ) {
    super(constraintId, `Mock ${constraintId}`);
  }

  validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[] {
    if (this.shouldThrow) {
      throw new Error('Mock validation error');
    }
    return this.violations;
  }
}

describe('ViolationDetector', () => {
  let detector: ViolationDetector;
  let mockAssignment: Assignment;
  let mockContext: ValidationContext;
  let mockEmployee: Employee;
  let mockDemand: ShiftDemand;

  beforeEach(() => {
    detector = new ViolationDetector();

    mockEmployee = {
      id: 'emp-1',
      name: 'John Doe',
      contractType: 'full_time' as any,
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 12,
      team: 'Team A',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockDemand = {
      id: 'demand-1',
      date: new Date('2024-01-15'),
      stationId: 'station-1',
      shiftTemplateId: 'shift-1',
      requiredCount: 1,
      priority: 'high' as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockAssignment = new Assignment({
      id: 'assignment-1',
      demandId: 'demand-1',
      employeeId: 'emp-1',
      status: AssignmentStatus.PROPOSED,
      score: 80,
      explanation: 'Test assignment',
      createdBy: 'user-1'
    });

    mockContext = {
      employees: [mockEmployee],
      assignments: [mockAssignment],
      demands: [mockDemand],
      absences: [],
      date: new Date('2024-01-15')
    };
  });

  describe('addConstraint', () => {
    it('should add a constraint to the detector', () => {
      const constraint = new MockConstraint('test-constraint');
      detector.addConstraint(constraint);
      
      expect(detector.getConstraints()).toHaveLength(1);
      expect(detector.getConstraints()[0]).toBe(constraint);
    });
  });

  describe('addConstraints', () => {
    it('should add multiple constraints', () => {
      const constraints = [
        new MockConstraint('constraint-1'),
        new MockConstraint('constraint-2')
      ];
      
      detector.addConstraints(constraints);
      expect(detector.getConstraints()).toHaveLength(2);
    });
  });

  describe('removeConstraint', () => {
    it('should remove a constraint by ID', () => {
      const constraint = new MockConstraint('test-constraint');
      detector.addConstraint(constraint);
      expect(detector.getConstraints()).toHaveLength(1);
      
      detector.removeConstraint('test-constraint');
      expect(detector.getConstraints()).toHaveLength(0);
    });
  });

  describe('detectViolationsForAssignment', () => {
    it('should detect violations for a single assignment', () => {
      const violation = new ConstraintViolation(
        'test-constraint',
        Severity.ERROR,
        'Test violation',
        ['assignment-1'],
        ['Fix it']
      );
      
      const constraint = new MockConstraint('test-constraint', [violation]);
      detector.addConstraint(constraint);
      
      const violations = detector.detectViolationsForAssignment(mockAssignment, mockContext);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toBe(violation);
    });

    it('should handle constraint validation errors', () => {
      const constraint = new MockConstraint('test-constraint', [], true);
      detector.addConstraint(constraint);
      
      const violations = detector.detectViolationsForAssignment(mockAssignment, mockContext);
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe(Severity.ERROR);
      expect(violations[0].message).toContain('Constraint validation failed');
    });

    it('should skip disabled constraints', () => {
      const constraint = new MockConstraint('test-constraint', [
        new ConstraintViolation('test', Severity.ERROR, 'Test', [], [])
      ]);
      
      // Mock isEnabled to return false
      vi.spyOn(constraint, 'isEnabled').mockReturnValue(false);
      
      detector.addConstraint(constraint);
      
      const violations = detector.detectViolationsForAssignment(mockAssignment, mockContext);
      expect(violations).toHaveLength(0);
    });
  });

  describe('detectViolationsForAssignments', () => {
    it('should detect violations for multiple assignments', () => {
      const assignment2 = new Assignment({
        id: 'assignment-2',
        demandId: 'demand-1',
        employeeId: 'emp-2',
        status: AssignmentStatus.PROPOSED,
        score: 70,
        explanation: 'Test assignment 2',
        createdBy: 'user-1'
      });

      const violation1 = new ConstraintViolation(
        'test-constraint',
        Severity.ERROR,
        'Violation 1',
        ['assignment-1'],
        ['Fix 1']
      );

      const violation2 = new ConstraintViolation(
        'test-constraint',
        Severity.WARNING,
        'Violation 2',
        ['assignment-2'],
        ['Fix 2']
      );

      const constraint = new MockConstraint('test-constraint', [violation1, violation2]);
      detector.addConstraint(constraint);

      const violations = detector.detectViolationsForAssignments(
        [mockAssignment, assignment2],
        mockContext
      );

      // Should have violations from both assignments (2) plus any cross-assignment violations
      expect(violations.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect cross-assignment violations (double booking)', () => {
      // Create two assignments for the same employee on the same date
      const assignment2 = new Assignment({
        id: 'assignment-2',
        demandId: 'demand-1', // Same demand (same date)
        employeeId: 'emp-1',    // Same employee
        status: AssignmentStatus.PROPOSED,
        score: 70,
        explanation: 'Conflicting assignment',
        createdBy: 'user-1'
      });

      const violations = detector.detectViolationsForAssignments(
        [mockAssignment, assignment2],
        mockContext
      );

      // Should detect double booking
      const doubleBookingViolations = violations.filter(v => v.constraintId === 'double-booking');
      expect(doubleBookingViolations).toHaveLength(1);
      expect(doubleBookingViolations[0].severity).toBe(Severity.CRITICAL);
      expect(doubleBookingViolations[0].affectedAssignments).toContain('assignment-1');
      expect(doubleBookingViolations[0].affectedAssignments).toContain('assignment-2');
    });
  });

  describe('generateViolationReport', () => {
    it('should generate a comprehensive violation report', () => {
      const violation = new ConstraintViolation(
        'test-constraint',
        Severity.ERROR,
        'Test violation',
        ['assignment-1'],
        ['Fix it']
      );

      const constraint = new MockConstraint('test-constraint', [violation]);
      detector.addConstraint(constraint);

      const reporter = detector.generateViolationReport([mockAssignment], mockContext);
      
      expect(reporter.getViolations()).toHaveLength(1);
      expect(reporter.getSummary().total).toBe(1);
    });
  });

  describe('areAssignmentsValid', () => {
    it('should return true when no blocking violations exist', () => {
      const warningViolation = new ConstraintViolation(
        'test-constraint',
        Severity.WARNING,
        'Warning violation',
        ['assignment-1'],
        ['Consider fixing']
      );

      const constraint = new MockConstraint('test-constraint', [warningViolation]);
      detector.addConstraint(constraint);

      const isValid = detector.areAssignmentsValid([mockAssignment], mockContext);
      expect(isValid).toBe(true);
    });

    it('should return false when blocking violations exist', () => {
      const criticalViolation = new ConstraintViolation(
        'test-constraint',
        Severity.CRITICAL,
        'Critical violation',
        ['assignment-1'],
        ['Must fix']
      );

      const constraint = new MockConstraint('test-constraint', [criticalViolation]);
      detector.addConstraint(constraint);

      const isValid = detector.areAssignmentsValid([mockAssignment], mockContext);
      expect(isValid).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('should provide comprehensive validation summary', () => {
      const errorViolation = new ConstraintViolation(
        'test-constraint',
        Severity.ERROR,
        'Error violation',
        ['assignment-1'],
        ['Fix error']
      );

      const constraint = new MockConstraint('test-constraint', [errorViolation]);
      detector.addConstraint(constraint);

      const summary = detector.getValidationSummary([mockAssignment], mockContext);
      
      expect(summary.totalAssignments).toBe(1);
      expect(summary.validAssignments).toBe(0); // Error is blocking
      expect(summary.invalidAssignments).toBe(1);
      expect(summary.violationSummary.total).toBe(1);
      expect(summary.violationSummary.error).toBe(1);
      expect(summary.isValid).toBe(false);
      expect(summary.canProceed).toBe(true); // No critical violations
    });

    it('should handle assignments with no violations', () => {
      const summary = detector.getValidationSummary([mockAssignment], mockContext);
      
      expect(summary.totalAssignments).toBe(1);
      expect(summary.validAssignments).toBe(1);
      expect(summary.invalidAssignments).toBe(0);
      expect(summary.isValid).toBe(true);
      expect(summary.canProceed).toBe(true);
    });
  });

  describe('getSuggestedFixes', () => {
    it('should generate suggested fixes for violations', () => {
      const violations = [
        new ConstraintViolation(
          'skill-matching',
          Severity.CRITICAL,
          'Missing skill',
          ['assignment-1'],
          ['Reassign to qualified employee', 'Provide training']
        ),
        new ConstraintViolation(
          'availability',
          Severity.WARNING,
          'Preference conflict',
          ['assignment-2'],
          ['Consider preferences', 'Discuss with employee']
        )
      ];

      const fixes = detector.getSuggestedFixes(violations);
      
      expect(fixes).toHaveLength(2);
      expect(fixes[0].severity).toBe(Severity.CRITICAL); // Should be sorted by severity
      expect(fixes[0].actions).toHaveLength(2);
      expect(fixes[0].canAutoResolve).toBe(true); // Contains 'reassign'
      expect(fixes[1].canAutoResolve).toBe(false); // No automated actions
    });

    it('should categorize actions correctly', () => {
      const violations = [
        new ConstraintViolation(
          'test',
          Severity.ERROR,
          'Test',
          ['assignment-1'],
          [
            'Reassign to another employee',
            'Remove assignment',
            'Contact supervisor',
            'Approve manually',
            'Adjust timing'
          ]
        )
      ];

      const fixes = detector.getSuggestedFixes(violations);
      const actions = fixes[0].actions;
      
      expect(actions.find(a => a.description.includes('Reassign'))?.type).toBe('reassignment');
      expect(actions.find(a => a.description.includes('Remove'))?.type).toBe('removal');
      expect(actions.find(a => a.description.includes('Contact'))?.type).toBe('communication');
      expect(actions.find(a => a.description.includes('Approve'))?.type).toBe('approval');
      expect(actions.find(a => a.description.includes('Adjust'))?.type).toBe('modification');
    });
  });
});