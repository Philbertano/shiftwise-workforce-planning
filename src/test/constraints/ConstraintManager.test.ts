import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConstraintManager } from '../../constraints/ConstraintManager.js';
import { Constraint } from '../../constraints/base/Constraint.js';
import { BaseConstraintValidator } from '../../constraints/base/ConstraintValidator.js';
import { ConstraintViolation } from '../../constraints/base/ConstraintViolation.js';
import { ValidationContext } from '../../constraints/base/ValidationContext.js';
import { Assignment } from '../../models/Assignment.js';
import { Employee, ShiftDemand, ConstraintType, Severity, AssignmentStatus } from '../../types/index.js';

// Mock constraint for testing
class MockConstraint extends Constraint {
  constructor(
    id: string,
    type: ConstraintType = ConstraintType.HARD,
    priority: number = 100,
    violations: ConstraintViolation[] = [],
    enabled: boolean = true
  ) {
    const validator = new MockValidator(id, violations);
    super(id, `Mock ${id}`, type, priority, `Mock constraint ${id}`, validator);
    this._enabled = enabled;
  }

  private _enabled: boolean;

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  getSeverity(): Severity {
    return Severity.ERROR;
  }
}

class MockValidator extends BaseConstraintValidator {
  constructor(
    private constraintId: string,
    private violations: ConstraintViolation[]
  ) {
    super(constraintId, `Mock ${constraintId}`);
  }

  validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[] {
    return this.violations;
  }
}

describe('ConstraintManager', () => {
  let manager: ConstraintManager;
  let mockAssignment: Assignment;
  let mockContext: ValidationContext;
  let mockEmployee: Employee;
  let mockDemand: ShiftDemand;
  let hardConstraint: MockConstraint;
  let softConstraint: MockConstraint;

  beforeEach(() => {
    hardConstraint = new MockConstraint('hard-constraint', ConstraintType.HARD, 100);
    softConstraint = new MockConstraint('soft-constraint', ConstraintType.SOFT, 50);
    
    manager = new ConstraintManager([hardConstraint, softConstraint]);

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

  describe('constructor', () => {
    it('should initialize with provided constraints', () => {
      expect(manager.getConstraints()).toHaveLength(2);
      expect(manager.getConstraints().map(c => c.id)).toContain('hard-constraint');
      expect(manager.getConstraints().map(c => c.id)).toContain('soft-constraint');
    });

    it('should initialize with empty constraints', () => {
      const emptyManager = new ConstraintManager();
      expect(emptyManager.getConstraints()).toHaveLength(0);
    });
  });

  describe('constraint management', () => {
    it('should add a constraint', () => {
      const newConstraint = new MockConstraint('new-constraint');
      manager.addConstraint(newConstraint);
      
      expect(manager.getConstraints()).toHaveLength(3);
      expect(manager.getConstraints().map(c => c.id)).toContain('new-constraint');
    });

    it('should remove a constraint', () => {
      manager.removeConstraint('hard-constraint');
      
      expect(manager.getConstraints()).toHaveLength(1);
      expect(manager.getConstraints().map(c => c.id)).not.toContain('hard-constraint');
    });

    it('should get constraints by type', () => {
      const hardConstraints = manager.getHardConstraints();
      const softConstraints = manager.getSoftConstraints();
      
      expect(hardConstraints).toHaveLength(1);
      expect(hardConstraints[0].id).toBe('hard-constraint');
      expect(softConstraints).toHaveLength(1);
      expect(softConstraints[0].id).toBe('soft-constraint');
    });
  });

  describe('validation', () => {
    it('should validate a single assignment', () => {
      const violation = new ConstraintViolation(
        'hard-constraint',
        Severity.ERROR,
        'Test violation',
        ['assignment-1'],
        ['Fix it']
      );

      const constraintWithViolation = new MockConstraint('hard-constraint', ConstraintType.HARD, 100, [violation]);
      manager.removeConstraint('hard-constraint');
      manager.addConstraint(constraintWithViolation);

      const violations = manager.validateAssignment(mockAssignment, mockContext);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toBe(violation);
    });

    it('should validate multiple assignments', () => {
      const assignment2 = new Assignment({
        id: 'assignment-2',
        demandId: 'demand-1',
        employeeId: 'emp-2',
        status: AssignmentStatus.PROPOSED,
        score: 70,
        explanation: 'Test assignment 2',
        createdBy: 'user-1'
      });

      const violations = manager.validateAssignments([mockAssignment, assignment2], mockContext);
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should check if assignments are valid', () => {
      const isValid = manager.areAssignmentsValid([mockAssignment], mockContext);
      expect(typeof isValid).toBe('boolean');
    });

    it('should generate validation summary', () => {
      const summary = manager.getValidationSummary([mockAssignment], mockContext);
      
      expect(summary.totalAssignments).toBe(1);
      expect(summary.validAssignments).toBeGreaterThanOrEqual(0);
      expect(summary.invalidAssignments).toBeGreaterThanOrEqual(0);
      expect(summary.violationSummary).toBeDefined();
      expect(typeof summary.isValid).toBe('boolean');
      expect(typeof summary.canProceed).toBe('boolean');
    });
  });

  describe('violation reporting', () => {
    it('should generate violation report', () => {
      const reporter = manager.generateViolationReport([mockAssignment], mockContext);
      
      expect(reporter).toBeDefined();
      expect(typeof reporter.getSummary).toBe('function');
      expect(typeof reporter.getViolations).toBe('function');
    });

    it('should create user-friendly violation', () => {
      const violation = manager.createUserFriendlyViolation(
        'skill-matching',
        Severity.CRITICAL,
        ['assignment-1'],
        {
          employee: mockEmployee,
          skill: { name: 'Welding', requiredLevel: 3 }
        }
      );

      expect(violation.constraintId).toBe('skill-matching');
      expect(violation.severity).toBe(Severity.CRITICAL);
      expect(violation.affectedAssignments).toEqual(['assignment-1']);
      expect(violation.message).toContain('John Doe');
    });

    it('should format violations for display', () => {
      const violations = [
        new ConstraintViolation(
          'test-constraint',
          Severity.ERROR,
          'Test violation',
          ['assignment-1'],
          ['Fix it']
        )
      ];

      const formatted = manager.formatViolationsForDisplay(violations);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0].id).toBeDefined();
      expect(formatted[0].title).toBeDefined();
      expect(formatted[0].message).toBeDefined();
      expect(formatted[0].severity).toBe(Severity.ERROR);
    });

    it('should get suggested fixes', () => {
      const violations = [
        new ConstraintViolation(
          'skill-matching',
          Severity.CRITICAL,
          'Missing skill',
          ['assignment-1'],
          ['Reassign to qualified employee']
        )
      ];

      const fixes = manager.getSuggestedFixes(violations);
      
      expect(Array.isArray(fixes)).toBe(true);
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].violationId).toBeDefined();
      expect(fixes[0].actions).toBeDefined();
    });
  });

  describe('validateAndFormat', () => {
    it('should validate and format results', () => {
      const result = manager.validateAndFormat([mockAssignment], mockContext);
      
      expect(result.summary).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(result.suggestedFixes).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.canProceed).toBe('boolean');
    });

    it('should include message context in formatting', () => {
      const messageContext = {
        employee: mockEmployee,
        skill: { name: 'Welding', requiredLevel: 3 }
      };

      const result = manager.validateAndFormat([mockAssignment], mockContext, messageContext);
      
      expect(result.summary).toBeDefined();
      expect(result.violations).toBeDefined();
    });
  });

  describe('constraint queries', () => {
    it('should get violations by severity', () => {
      const violation = new ConstraintViolation(
        'test-constraint',
        Severity.CRITICAL,
        'Critical violation',
        ['assignment-1'],
        ['Fix immediately']
      );

      const constraintWithViolation = new MockConstraint('test-constraint', ConstraintType.HARD, 100, [violation]);
      manager.addConstraint(constraintWithViolation);

      const criticalViolations = manager.getViolationsBySeverity([mockAssignment], mockContext, Severity.CRITICAL);
      expect(criticalViolations.some(v => v.severity === Severity.CRITICAL)).toBe(true);
    });

    it('should get blocking violations only', () => {
      const criticalViolation = new ConstraintViolation(
        'critical-constraint',
        Severity.CRITICAL,
        'Critical violation',
        ['assignment-1'],
        ['Fix immediately']
      );

      const warningViolation = new ConstraintViolation(
        'warning-constraint',
        Severity.WARNING,
        'Warning violation',
        ['assignment-1'],
        ['Consider fixing']
      );

      const criticalConstraint = new MockConstraint('critical-constraint', ConstraintType.HARD, 100, [criticalViolation]);
      const warningConstraint = new MockConstraint('warning-constraint', ConstraintType.SOFT, 50, [warningViolation]);
      
      manager.addConstraint(criticalConstraint);
      manager.addConstraint(warningConstraint);

      const blockingViolations = manager.getBlockingViolations([mockAssignment], mockContext);
      expect(blockingViolations.every(v => v.isBlocking())).toBe(true);
    });

    it('should check if specific constraint is violated', () => {
      const violation = new ConstraintViolation(
        'specific-constraint',
        Severity.ERROR,
        'Specific violation',
        ['assignment-1'],
        ['Fix it']
      );

      const constraintWithViolation = new MockConstraint('specific-constraint', ConstraintType.HARD, 100, [violation]);
      manager.addConstraint(constraintWithViolation);

      const isViolated = manager.isConstraintViolated('specific-constraint', [mockAssignment], mockContext);
      expect(isViolated).toBe(true);

      const isNotViolated = manager.isConstraintViolated('non-existent-constraint', [mockAssignment], mockContext);
      expect(isNotViolated).toBe(false);
    });

    it('should get violations for specific assignments', () => {
      const violation1 = new ConstraintViolation(
        'constraint-1',
        Severity.ERROR,
        'Violation 1',
        ['assignment-1'],
        ['Fix 1']
      );

      const violation2 = new ConstraintViolation(
        'constraint-2',
        Severity.ERROR,
        'Violation 2',
        ['assignment-2'],
        ['Fix 2']
      );

      const constraint1 = new MockConstraint('constraint-1', ConstraintType.HARD, 100, [violation1]);
      const constraint2 = new MockConstraint('constraint-2', ConstraintType.HARD, 100, [violation2]);
      
      manager.addConstraint(constraint1);
      manager.addConstraint(constraint2);

      const assignment2 = new Assignment({
        id: 'assignment-2',
        demandId: 'demand-1',
        employeeId: 'emp-2',
        status: AssignmentStatus.PROPOSED,
        score: 70,
        explanation: 'Test assignment 2',
        createdBy: 'user-1'
      });

      const violations = manager.getViolationsForAssignments(
        ['assignment-1'],
        [mockAssignment, assignment2],
        mockContext
      );

      expect(violations.some(v => v.affectedAssignments.includes('assignment-1'))).toBe(true);
    });
  });

  describe('constraint statistics', () => {
    it('should get constraint statistics', () => {
      const stats = manager.getConstraintStatistics();
      
      expect(stats.total).toBe(2);
      expect(stats.hard).toBe(1);
      expect(stats.soft).toBe(1);
      expect(stats.enabled).toBe(2);
      expect(stats.byPriority).toBeDefined();
      expect(stats.byPriority[100]).toBe(1); // hard constraint priority
      expect(stats.byPriority[50]).toBe(1);  // soft constraint priority
    });

    it('should handle empty constraints', () => {
      const emptyManager = new ConstraintManager();
      const stats = emptyManager.getConstraintStatistics();
      
      expect(stats.total).toBe(0);
      expect(stats.hard).toBe(0);
      expect(stats.soft).toBe(0);
      expect(stats.enabled).toBe(0);
    });
  });

  describe('constraint metadata', () => {
    it('should get constraint metadata', () => {
      const metadata = manager.getConstraintMetadata();
      
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata.length).toBe(2);
      
      // Each metadata should have constraint information
      for (const meta of metadata) {
        expect(meta.id).toBeDefined();
        expect(meta.name).toBeDefined();
        expect(meta.type).toBeDefined();
        expect(meta.priority).toBeDefined();
      }
    });
  });

  describe('constraint enable/disable', () => {
    it('should enable/disable constraints', () => {
      const result = manager.setConstraintEnabled('hard-constraint', false);
      expect(result).toBe(true);

      const enableResult = manager.setConstraintEnabled('hard-constraint', true);
      expect(enableResult).toBe(true);
    });

    it('should return false for non-existent constraint', () => {
      const result = manager.setConstraintEnabled('non-existent', false);
      expect(result).toBe(false);
    });
  });
});