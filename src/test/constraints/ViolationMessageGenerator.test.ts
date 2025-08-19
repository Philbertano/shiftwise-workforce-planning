import { describe, it, expect, beforeEach } from 'vitest';
import { ViolationMessageGenerator, MessageContext } from '../../constraints/base/ViolationMessageGenerator.js';
import { ConstraintViolation } from '../../constraints/base/ConstraintViolation.js';
import { Severity } from '../../types/index.js';

describe('ViolationMessageGenerator', () => {
  let mockContext: MessageContext;

  beforeEach(() => {
    mockContext = {
      employee: {
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
      },
      skill: {
        name: 'Welding',
        requiredLevel: 3,
        currentLevel: 2
      },
      station: {
        name: 'Assembly Line 1',
        capacity: 5
      },
      date: new Date('2024-01-15'),
      reason: 'vacation',
      values: {
        currentHours: 45,
        averageHours: 40,
        totalHours: 50,
        restHours: 8,
        consecutiveDays: 7,
        assignedCount: 6,
        maxCapacity: 5,
        coveragePercentage: 75
      }
    };
  });

  describe('generateUserFriendlyMessage', () => {
    it('should generate user-friendly message for skill matching violation', () => {
      const violation = new ConstraintViolation(
        'skill-matching',
        Severity.CRITICAL,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation, mockContext);
      
      expect(message).toContain('John Doe');
      expect(message).toContain('Welding');
      expect(message).toContain('Level 3');
      expect(message).toContain('Assembly Line 1');
    });

    it('should generate user-friendly message for availability violation', () => {
      const violation = new ConstraintViolation(
        'availability',
        Severity.ERROR,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation, mockContext);
      
      expect(message).toContain('John Doe');
      expect(message).toContain('1/15/2024'); // Date format is localized
      expect(message).toContain('vacation');
    });

    it('should generate user-friendly message for labor law violation', () => {
      const violation = new ConstraintViolation(
        'labor-law',
        Severity.CRITICAL,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation, mockContext);
      
      expect(message).toContain('John Doe');
      expect(message).toContain('labor law');
    });

    it('should return original message when no template exists', () => {
      const violation = new ConstraintViolation(
        'unknown-constraint',
        Severity.ERROR,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation);
      expect(message).toBe('Original message');
    });

    it('should handle missing context gracefully', () => {
      const violation = new ConstraintViolation(
        'skill-matching',
        Severity.ERROR,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation);
      expect(message).toContain('{{employeeName}}'); // Template placeholders remain when no context
    });
  });

  describe('generateSuggestedActions', () => {
    it('should generate actions for skill matching violations', () => {
      const actions = ViolationMessageGenerator.generateSuggestedActions(
        'skill-matching',
        Severity.CRITICAL,
        mockContext
      );

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(action => action.includes('Reassign') || action.includes('qualified'))).toBe(true);
    });

    it('should generate actions for availability violations', () => {
      const actions = ViolationMessageGenerator.generateSuggestedActions(
        'availability',
        Severity.ERROR,
        mockContext
      );

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(action => action.includes('Reassign') || action.includes('available'))).toBe(true);
    });

    it('should generate actions for labor law violations', () => {
      const actions = ViolationMessageGenerator.generateSuggestedActions(
        'labor-law',
        Severity.CRITICAL,
        mockContext
      );

      expect(actions).toContain('Remove assignment immediately');
      expect(actions).toContain('Review labor law compliance');
      expect(actions).toContain('Contact legal department');
    });

    it('should return default actions for unknown constraints', () => {
      const actions = ViolationMessageGenerator.generateSuggestedActions(
        'unknown-constraint',
        Severity.ERROR
      );

      expect(actions).toContain('Review assignment manually');
      expect(actions).toContain('Contact system administrator');
    });

    it('should use default actions when severity not found', () => {
      const actions = ViolationMessageGenerator.generateSuggestedActions(
        'fairness',
        Severity.CRITICAL // Not defined for fairness constraint
      );

      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('createUserFriendlyViolation', () => {
    it('should create violation with user-friendly message and actions', () => {
      const violation = ViolationMessageGenerator.createUserFriendlyViolation(
        'skill-matching',
        Severity.CRITICAL,
        ['assignment-1'],
        mockContext
      );

      expect(violation.constraintId).toBe('skill-matching');
      expect(violation.severity).toBe(Severity.CRITICAL);
      expect(violation.affectedAssignments).toEqual(['assignment-1']);
      expect(violation.message).toContain('John Doe');
      expect(violation.suggestedActions.length).toBeGreaterThan(0);
    });
  });

  describe('getSeverityPrefix', () => {
    it('should return correct prefixes for all severities', () => {
      expect(ViolationMessageGenerator.getSeverityPrefix(Severity.CRITICAL)).toBe('🚨 CRITICAL');
      expect(ViolationMessageGenerator.getSeverityPrefix(Severity.ERROR)).toBe('❌ ERROR');
      expect(ViolationMessageGenerator.getSeverityPrefix(Severity.WARNING)).toBe('⚠️ WARNING');
      expect(ViolationMessageGenerator.getSeverityPrefix(Severity.INFO)).toBe('ℹ️ INFO');
    });
  });

  describe('getSeverityColor', () => {
    it('should return correct colors for all severities', () => {
      expect(ViolationMessageGenerator.getSeverityColor(Severity.CRITICAL)).toBe('#dc2626');
      expect(ViolationMessageGenerator.getSeverityColor(Severity.ERROR)).toBe('#ea580c');
      expect(ViolationMessageGenerator.getSeverityColor(Severity.WARNING)).toBe('#ca8a04');
      expect(ViolationMessageGenerator.getSeverityColor(Severity.INFO)).toBe('#2563eb');
    });
  });

  describe('formatViolationForDisplay', () => {
    it('should format violation with all display properties', () => {
      const violation = new ConstraintViolation(
        'skill-matching',
        Severity.CRITICAL,
        'Test violation',
        ['assignment-1'],
        ['Reassign employee', 'Provide training']
      );

      const formatted = ViolationMessageGenerator.formatViolationForDisplay(violation, mockContext);

      expect(formatted.id).toBeDefined();
      expect(formatted.title).toContain('CRITICAL');
      expect(formatted.title).toContain('Skill Requirements');
      expect(formatted.message).toContain('John Doe');
      expect(formatted.severity).toBe(Severity.CRITICAL);
      expect(formatted.color).toBe('#dc2626');
      expect(formatted.affectedAssignments).toEqual(['assignment-1']);
      expect(formatted.suggestedActions).toEqual(['Reassign employee', 'Provide training']);
      expect(formatted.canAutoResolve).toBe(true); // Contains 'reassign'
      expect(formatted.priority).toBe(4); // Critical = 4
    });

    it('should identify auto-resolvable violations correctly', () => {
      const autoResolvableViolation = new ConstraintViolation(
        'test',
        Severity.ERROR,
        'Test',
        ['assignment-1'],
        ['Reassign to another employee']
      );

      const manualViolation = new ConstraintViolation(
        'test',
        Severity.ERROR,
        'Test',
        ['assignment-1'],
        ['Contact supervisor']
      );

      const autoFormatted = ViolationMessageGenerator.formatViolationForDisplay(autoResolvableViolation);
      const manualFormatted = ViolationMessageGenerator.formatViolationForDisplay(manualViolation);

      expect(autoFormatted.canAutoResolve).toBe(true);
      expect(manualFormatted.canAutoResolve).toBe(false);
    });

    it('should set correct priority based on severity', () => {
      const violations = [
        new ConstraintViolation('test', Severity.CRITICAL, 'Test', [], []),
        new ConstraintViolation('test', Severity.ERROR, 'Test', [], []),
        new ConstraintViolation('test', Severity.WARNING, 'Test', [], []),
        new ConstraintViolation('test', Severity.INFO, 'Test', [], [])
      ];

      const formatted = violations.map(v => ViolationMessageGenerator.formatViolationForDisplay(v));

      expect(formatted[0].priority).toBe(4); // Critical
      expect(formatted[1].priority).toBe(3); // Error
      expect(formatted[2].priority).toBe(2); // Warning
      expect(formatted[3].priority).toBe(1); // Info
    });
  });

  describe('template interpolation', () => {
    it('should handle all placeholder types', () => {
      const violation = new ConstraintViolation(
        'fairness',
        Severity.WARNING,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation, mockContext);
      
      expect(message).toContain('John Doe');
      expect(message).toContain('45'); // currentHours
      expect(message).toContain('40'); // averageHours
    });

    it('should handle missing context values gracefully', () => {
      const partialContext: MessageContext = {
        employee: {
          id: 'emp-1',
          name: 'Jane Doe',
          contractType: 'part_time' as any,
          weeklyHours: 20,
          maxHoursPerDay: 4,
          minRestHours: 8,
          team: 'Team B',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        // Missing other context properties
      };

      const violation = new ConstraintViolation(
        'skill-matching',
        Severity.ERROR,
        'Original message',
        ['assignment-1'],
        []
      );

      const message = ViolationMessageGenerator.generateUserFriendlyMessage(violation, partialContext);
      expect(message).toContain('Jane Doe');
      // Should not throw error for missing context
    });
  });

  describe('constraint display names', () => {
    it('should convert constraint IDs to readable names', () => {
      const testCases = [
        { id: 'skill-matching', expected: 'Skill Requirements' },
        { id: 'availability', expected: 'Employee Availability' },
        { id: 'labor-law', expected: 'Labor Law Compliance' },
        { id: 'double-booking', expected: 'Schedule Conflict' },
        { id: 'unknown-constraint', expected: 'Unknown Constraint' }
      ];

      testCases.forEach(({ id, expected }) => {
        const violation = new ConstraintViolation(id, Severity.ERROR, 'Test', [], []);
        const formatted = ViolationMessageGenerator.formatViolationForDisplay(violation);
        expect(formatted.title).toContain(expected);
      });
    });
  });
});