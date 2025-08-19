import { describe, it, expect, beforeEach } from 'vitest';
import { ViolationReporter } from '../../constraints/base/ViolationReporter.js';
import { ConstraintViolation } from '../../constraints/base/ConstraintViolation.js';
import { Severity } from '../../types/index.js';

describe('ViolationReporter', () => {
  let reporter: ViolationReporter;
  let criticalViolation: ConstraintViolation;
  let errorViolation: ConstraintViolation;
  let warningViolation: ConstraintViolation;
  let infoViolation: ConstraintViolation;

  beforeEach(() => {
    reporter = new ViolationReporter();
    
    criticalViolation = new ConstraintViolation(
      'skill-matching',
      Severity.CRITICAL,
      'Employee lacks required skill',
      ['assignment-1'],
      ['Reassign to qualified employee']
    );

    errorViolation = new ConstraintViolation(
      'availability',
      Severity.ERROR,
      'Employee not available',
      ['assignment-2'],
      ['Find replacement employee']
    );

    warningViolation = new ConstraintViolation(
      'fairness',
      Severity.WARNING,
      'Workload imbalance detected',
      ['assignment-3'],
      ['Balance workload across team']
    );

    infoViolation = new ConstraintViolation(
      'preference',
      Severity.INFO,
      'Assignment conflicts with preference',
      ['assignment-4'],
      ['Consider employee preferences']
    );
  });

  describe('addViolation', () => {
    it('should add a single violation', () => {
      reporter.addViolation(criticalViolation);
      
      expect(reporter.getViolations()).toHaveLength(1);
      expect(reporter.getViolations()[0]).toBe(criticalViolation);
    });

    it('should add multiple violations', () => {
      reporter.addViolation(criticalViolation);
      reporter.addViolation(errorViolation);
      
      expect(reporter.getViolations()).toHaveLength(2);
    });
  });

  describe('addViolations', () => {
    it('should add multiple violations at once', () => {
      const violations = [criticalViolation, errorViolation, warningViolation];
      reporter.addViolations(violations);
      
      expect(reporter.getViolations()).toHaveLength(3);
    });
  });

  describe('getViolationsBySeverity', () => {
    beforeEach(() => {
      reporter.addViolations([criticalViolation, errorViolation, warningViolation, infoViolation]);
    });

    it('should return critical violations', () => {
      const critical = reporter.getCriticalViolations();
      expect(critical).toHaveLength(1);
      expect(critical[0].severity).toBe(Severity.CRITICAL);
    });

    it('should return error violations', () => {
      const errors = reporter.getErrorViolations();
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe(Severity.ERROR);
    });

    it('should return warning violations', () => {
      const warnings = reporter.getWarningViolations();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe(Severity.WARNING);
    });

    it('should return info violations', () => {
      const info = reporter.getInfoViolations();
      expect(info).toHaveLength(1);
      expect(info[0].severity).toBe(Severity.INFO);
    });
  });

  describe('getBlockingViolations', () => {
    beforeEach(() => {
      reporter.addViolations([criticalViolation, errorViolation, warningViolation, infoViolation]);
    });

    it('should return only critical and error violations', () => {
      const blocking = reporter.getBlockingViolations();
      expect(blocking).toHaveLength(2);
      expect(blocking.every(v => v.isBlocking())).toBe(true);
    });

    it('should identify when blocking violations exist', () => {
      expect(reporter.hasBlockingViolations()).toBe(true);
    });

    it('should identify when no blocking violations exist', () => {
      reporter.clear();
      reporter.addViolations([warningViolation, infoViolation]);
      expect(reporter.hasBlockingViolations()).toBe(false);
    });
  });

  describe('getViolationsSortedBySeverity', () => {
    it('should sort violations by severity (most severe first)', () => {
      reporter.addViolations([infoViolation, warningViolation, criticalViolation, errorViolation]);
      
      const sorted = reporter.getViolationsSortedBySeverity();
      expect(sorted[0].severity).toBe(Severity.CRITICAL);
      expect(sorted[1].severity).toBe(Severity.ERROR);
      expect(sorted[2].severity).toBe(Severity.WARNING);
      expect(sorted[3].severity).toBe(Severity.INFO);
    });
  });

  describe('getViolationsGroupedByConstraint', () => {
    it('should group violations by constraint ID', () => {
      const anotherSkillViolation = new ConstraintViolation(
        'skill-matching',
        Severity.ERROR,
        'Another skill violation',
        ['assignment-5'],
        ['Action']
      );

      reporter.addViolations([criticalViolation, errorViolation, anotherSkillViolation]);
      
      const grouped = reporter.getViolationsGroupedByConstraint();
      expect(grouped.size).toBe(2);
      expect(grouped.get('skill-matching')).toHaveLength(2);
      expect(grouped.get('availability')).toHaveLength(1);
    });
  });

  describe('getViolationsForAssignments', () => {
    beforeEach(() => {
      reporter.addViolations([criticalViolation, errorViolation, warningViolation]);
    });

    it('should return violations affecting specific assignments', () => {
      const violations = reporter.getViolationsForAssignments(['assignment-1', 'assignment-3']);
      expect(violations).toHaveLength(2);
      expect(violations.some(v => v.affectedAssignments.includes('assignment-1'))).toBe(true);
      expect(violations.some(v => v.affectedAssignments.includes('assignment-3'))).toBe(true);
    });

    it('should return empty array for non-existent assignments', () => {
      const violations = reporter.getViolationsForAssignments(['non-existent']);
      expect(violations).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      reporter.addViolations([criticalViolation, errorViolation, warningViolation, infoViolation]);
    });

    it('should provide accurate summary statistics', () => {
      const summary = reporter.getSummary();
      
      expect(summary.total).toBe(4);
      expect(summary.critical).toBe(1);
      expect(summary.error).toBe(1);
      expect(summary.warning).toBe(1);
      expect(summary.info).toBe(1);
      expect(summary.blocking).toBe(2);
      expect(summary.affectedAssignmentCount).toBe(4);
      expect(summary.uniqueConstraintCount).toBe(4);
      expect(summary.hasBlockingViolations).toBe(true);
    });

    it('should handle empty violations', () => {
      reporter.clear();
      const summary = reporter.getSummary();
      
      expect(summary.total).toBe(0);
      expect(summary.hasBlockingViolations).toBe(false);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      reporter.addViolations([criticalViolation, errorViolation, warningViolation]);
    });

    it('should generate comprehensive report', () => {
      const report = reporter.generateReport();
      
      expect(report.summary).toBeDefined();
      expect(report.violations).toHaveLength(3);
      expect(report.violationsByConstraint).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should sort violations by severity in report', () => {
      const report = reporter.generateReport();
      
      // Should be sorted: critical, error, warning
      expect(report.violations[0].severity).toBe(Severity.CRITICAL);
      expect(report.violations[1].severity).toBe(Severity.ERROR);
      expect(report.violations[2].severity).toBe(Severity.WARNING);
    });
  });

  describe('getUserFriendlyMessages', () => {
    beforeEach(() => {
      reporter.addViolations([criticalViolation, errorViolation]);
    });

    it('should generate user-friendly messages', () => {
      const messages = reporter.getUserFriendlyMessages();
      
      expect(messages).toHaveLength(2);
      expect(messages[0].title).toContain('Critical');
      expect(messages[0].severity).toBe(Severity.CRITICAL);
      expect(messages[0].suggestedActions).toBeDefined();
    });

    it('should include all required fields in messages', () => {
      const messages = reporter.getUserFriendlyMessages();
      
      for (const message of messages) {
        expect(message.id).toBeDefined();
        expect(message.severity).toBeDefined();
        expect(message.title).toBeDefined();
        expect(message.message).toBeDefined();
        expect(message.suggestedActions).toBeDefined();
        expect(message.affectedCount).toBeDefined();
        expect(message.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('getAutoResolvableViolations', () => {
    it('should identify auto-resolvable violations', () => {
      const autoResolvable = new ConstraintViolation(
        'test',
        Severity.ERROR,
        'Test violation',
        ['assignment-1'],
        ['Reassign to another employee', 'Swap with available employee']
      );

      const manualOnly = new ConstraintViolation(
        'test2',
        Severity.ERROR,
        'Test violation 2',
        ['assignment-2'],
        ['Contact supervisor', 'Review manually']
      );

      reporter.addViolations([autoResolvable, manualOnly]);
      
      const autoResolvableViolations = reporter.getAutoResolvableViolations();
      expect(autoResolvableViolations).toHaveLength(1);
      expect(autoResolvableViolations[0]).toBe(autoResolvable);
    });
  });

  describe('getManualInterventionViolations', () => {
    it('should identify violations requiring manual intervention', () => {
      const autoResolvable = new ConstraintViolation(
        'test',
        Severity.ERROR,
        'Test violation',
        ['assignment-1'],
        ['Reassign to another employee']
      );

      const manualOnly = new ConstraintViolation(
        'test2',
        Severity.ERROR,
        'Test violation 2',
        ['assignment-2'],
        ['Contact supervisor for approval']
      );

      reporter.addViolations([autoResolvable, manualOnly]);
      
      const manualViolations = reporter.getManualInterventionViolations();
      expect(manualViolations).toHaveLength(1);
      expect(manualViolations[0]).toBe(manualOnly);
    });
  });

  describe('clear', () => {
    it('should clear all violations', () => {
      reporter.addViolations([criticalViolation, errorViolation]);
      expect(reporter.getViolations()).toHaveLength(2);
      
      reporter.clear();
      expect(reporter.getViolations()).toHaveLength(0);
    });
  });
});