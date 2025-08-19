import { ConstraintViolation } from './ConstraintViolation.js';
import { Severity } from '../../types/index.js';
import { Employee, Assignment, ShiftDemand } from '../../types/index.js';

/**
 * Generates user-friendly messages and suggested actions for constraint violations
 */
export class ViolationMessageGenerator {
  /**
   * Generate user-friendly message for a violation
   */
  public static generateUserFriendlyMessage(
    violation: ConstraintViolation,
    context?: MessageContext
  ): string {
    const templates = this.getMessageTemplates();
    const template = templates[violation.constraintId];
    
    if (!template) {
      return violation.message;
    }

    return this.interpolateTemplate(template, violation, context);
  }

  /**
   * Generate suggested actions for a violation
   */
  public static generateSuggestedActions(
    constraintId: string,
    severity: Severity,
    context?: MessageContext
  ): string[] {
    const actionTemplates = this.getActionTemplates();
    const template = actionTemplates[constraintId];
    
    if (!template) {
      return ['Review assignment manually', 'Contact system administrator'];
    }

    const actions = template[severity] || template.default || [];
    return actions.map(action => this.interpolateActionTemplate(action, context));
  }

  /**
   * Create a violation with user-friendly message and actions
   */
  public static createUserFriendlyViolation(
    constraintId: string,
    severity: Severity,
    affectedAssignments: string[],
    context?: MessageContext
  ): ConstraintViolation {
    const message = this.generateConstraintMessage(constraintId, severity, context);
    const actions = this.generateSuggestedActions(constraintId, severity, context);
    
    return new ConstraintViolation(
      constraintId,
      severity,
      message,
      affectedAssignments,
      actions
    );
  }

  /**
   * Get message templates for different constraint types
   */
  private static getMessageTemplates(): Record<string, string> {
    return {
      'skill-matching': 'Employee {{employeeName}} lacks required {{skillName}} (Level {{requiredLevel}}) for {{stationName}}',
      'availability': 'Employee {{employeeName}} is not available on {{date}} due to {{reason}}',
      'labor-law': 'Assignment violates labor law: {{violation}} for employee {{employeeName}}',
      'fairness': 'Assignment creates unfair workload distribution for employee {{employeeName}} ({{currentHours}} hours vs {{averageHours}} average)',
      'preference': 'Assignment conflicts with {{employeeName}}\'s preferences: {{preferenceType}}',
      'continuity': 'Assignment breaks shift continuity for {{employeeName}} on {{date}}',
      'double-booking': 'Employee {{employeeName}} has conflicting assignments on {{date}}',
      'overtime': 'Assignment would cause overtime violation for {{employeeName}} ({{totalHours}} hours)',
      'rest-period': 'Insufficient rest period for {{employeeName}} between shifts ({{restHours}} hours)',
      'qualification-expired': 'Employee {{employeeName}}\'s {{skillName}} qualification expired on {{expiryDate}}',
      'absence-conflict': 'Assignment conflicts with approved absence for {{employeeName}} ({{absenceType}})',
      'max-consecutive': 'Assignment exceeds maximum consecutive days for {{employeeName}} ({{consecutiveDays}} days)',
      'station-capacity': 'Station {{stationName}} exceeds capacity ({{assignedCount}}/{{maxCapacity}})',
      'shift-coverage': 'Insufficient coverage for {{stationName}} on {{date}} ({{coveragePercentage}}%)'
    };
  }

  /**
   * Get action templates for different constraint types and severities
   */
  private static getActionTemplates(): Record<string, Record<string, string[]>> {
    return {
      'skill-matching': {
        [Severity.CRITICAL]: [
          'Reassign to qualified employee',
          'Provide emergency training',
          'Contact supervisor for override'
        ],
        [Severity.ERROR]: [
          'Find alternative qualified employee',
          'Schedule training session',
          'Review skill requirements'
        ],
        default: [
          'Consider skill development',
          'Review assignment criteria'
        ]
      },
      'availability': {
        [Severity.CRITICAL]: [
          'Remove assignment',
          'Find replacement employee',
          'Contact employee for availability update'
        ],
        [Severity.ERROR]: [
          'Reassign to available employee',
          'Check for schedule conflicts',
          'Update availability records'
        ],
        default: [
          'Verify employee availability',
          'Consider alternative scheduling'
        ]
      },
      'labor-law': {
        [Severity.CRITICAL]: [
          'Remove assignment immediately',
          'Review labor law compliance',
          'Contact legal department'
        ],
        [Severity.ERROR]: [
          'Adjust shift timing',
          'Redistribute workload',
          'Review compliance rules'
        ],
        default: [
          'Monitor compliance',
          'Review policies'
        ]
      },
      'fairness': {
        [Severity.WARNING]: [
          'Balance workload across team',
          'Consider rotating assignments',
          'Review fairness criteria'
        ],
        default: [
          'Monitor workload distribution',
          'Consider employee preferences'
        ]
      },
      'preference': {
        [Severity.WARNING]: [
          'Consider employee preferences',
          'Find alternative assignment',
          'Discuss with employee'
        ],
        default: [
          'Review preference settings',
          'Balance preferences with needs'
        ]
      },
      'double-booking': {
        [Severity.CRITICAL]: [
          'Remove one assignment',
          'Reassign to different employee',
          'Split shift if possible'
        ],
        default: [
          'Review scheduling conflicts',
          'Update assignment system'
        ]
      },
      'overtime': {
        [Severity.ERROR]: [
          'Reduce shift hours',
          'Reassign partial duties',
          'Get overtime approval'
        ],
        default: [
          'Monitor weekly hours',
          'Plan workload distribution'
        ]
      },
      'rest-period': {
        [Severity.CRITICAL]: [
          'Reschedule assignment',
          'Ensure minimum rest period',
          'Find alternative employee'
        ],
        default: [
          'Review shift scheduling',
          'Monitor rest periods'
        ]
      },
      'qualification-expired': {
        [Severity.ERROR]: [
          'Schedule recertification',
          'Temporarily reassign duties',
          'Update qualification records'
        ],
        default: [
          'Monitor expiry dates',
          'Plan renewal schedule'
        ]
      },
      'absence-conflict': {
        [Severity.CRITICAL]: [
          'Remove conflicting assignment',
          'Find replacement employee',
          'Update absence records'
        ],
        default: [
          'Verify absence status',
          'Coordinate with HR'
        ]
      }
    };
  }

  /**
   * Generate constraint-specific message
   */
  private static generateConstraintMessage(
    constraintId: string,
    severity: Severity,
    context?: MessageContext
  ): string {
    const templates = this.getMessageTemplates();
    const template = templates[constraintId] || `${severity.toUpperCase()} constraint violation detected: {{constraintId}}`;
    
    return this.interpolateTemplate(template, { constraintId } as any, context);
  }

  /**
   * Interpolate template with context data
   */
  private static interpolateTemplate(
    template: string,
    violation: ConstraintViolation | { constraintId: string },
    context?: MessageContext
  ): string {
    let result = template;
    
    // Replace constraint-specific placeholders
    result = result.replace(/\{\{constraintId\}\}/g, violation.constraintId);
    
    if (!context) {
      return result;
    }

    // Replace employee information
    if (context.employee) {
      result = result.replace(/\{\{employeeName\}\}/g, context.employee.name);
    }

    // Replace skill information
    if (context.skill) {
      result = result.replace(/\{\{skillName\}\}/g, context.skill.name);
      result = result.replace(/\{\{requiredLevel\}\}/g, context.skill.requiredLevel?.toString() || '');
    }

    // Replace station information
    if (context.station) {
      result = result.replace(/\{\{stationName\}\}/g, context.station.name);
    }

    // Replace date information
    if (context.date) {
      result = result.replace(/\{\{date\}\}/g, context.date.toLocaleDateString());
    }

    // Replace numeric values
    if (context.values) {
      Object.entries(context.values).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(placeholder, value.toString());
      });
    }

    // Replace reason
    if (context.reason) {
      result = result.replace(/\{\{reason\}\}/g, context.reason);
    }

    return result;
  }

  /**
   * Interpolate action template with context
   */
  private static interpolateActionTemplate(
    template: string,
    context?: MessageContext
  ): string {
    if (!context) {
      return template;
    }

    let result = template;

    // Replace employee name in actions
    if (context.employee) {
      result = result.replace(/employee/g, context.employee.name);
    }

    // Replace skill name in actions
    if (context.skill) {
      result = result.replace(/skill/g, context.skill.name);
    }

    // Replace station name in actions
    if (context.station) {
      result = result.replace(/station/g, context.station.name);
    }

    return result;
  }

  /**
   * Get severity-specific message prefix
   */
  public static getSeverityPrefix(severity: Severity): string {
    const prefixes = {
      [Severity.CRITICAL]: '🚨 CRITICAL',
      [Severity.ERROR]: '❌ ERROR',
      [Severity.WARNING]: '⚠️ WARNING',
      [Severity.INFO]: 'ℹ️ INFO'
    };

    return prefixes[severity] || '';
  }

  /**
   * Get severity-specific color for UI
   */
  public static getSeverityColor(severity: Severity): string {
    const colors = {
      [Severity.CRITICAL]: '#dc2626', // red-600
      [Severity.ERROR]: '#ea580c',     // orange-600
      [Severity.WARNING]: '#ca8a04',   // yellow-600
      [Severity.INFO]: '#2563eb'       // blue-600
    };

    return colors[severity] || '#6b7280'; // gray-500
  }

  /**
   * Format violation for display
   */
  public static formatViolationForDisplay(
    violation: ConstraintViolation,
    context?: MessageContext
  ): FormattedViolation {
    const userFriendlyMessage = this.generateUserFriendlyMessage(violation, context);
    const prefix = this.getSeverityPrefix(violation.severity);
    const color = this.getSeverityColor(violation.severity);

    return {
      id: `${violation.constraintId}-${violation.timestamp.getTime()}`,
      title: `${prefix} ${this.getConstraintDisplayName(violation.constraintId)}`,
      message: userFriendlyMessage,
      severity: violation.severity,
      color,
      affectedAssignments: violation.affectedAssignments,
      suggestedActions: violation.suggestedActions,
      timestamp: violation.timestamp,
      canAutoResolve: this.canAutoResolve(violation),
      priority: this.getPriority(violation.severity)
    };
  }

  /**
   * Get display name for constraint
   */
  private static getConstraintDisplayName(constraintId: string): string {
    const displayNames: Record<string, string> = {
      'skill-matching': 'Skill Requirements',
      'availability': 'Employee Availability',
      'labor-law': 'Labor Law Compliance',
      'fairness': 'Workload Fairness',
      'preference': 'Employee Preferences',
      'continuity': 'Shift Continuity',
      'double-booking': 'Schedule Conflict',
      'overtime': 'Overtime Violation',
      'rest-period': 'Rest Period Violation',
      'qualification-expired': 'Expired Qualification',
      'absence-conflict': 'Absence Conflict',
      'max-consecutive': 'Consecutive Days Limit',
      'station-capacity': 'Station Capacity',
      'shift-coverage': 'Coverage Shortage'
    };

    return displayNames[constraintId] || constraintId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Check if violation can be auto-resolved
   */
  private static canAutoResolve(violation: ConstraintViolation): boolean {
    const autoResolvableActions = [
      'reassign', 'swap', 'adjust', 'remove', 'redistribute'
    ];

    return violation.suggestedActions.some(action =>
      autoResolvableActions.some(keyword => 
        action.toLowerCase().includes(keyword)
      )
    );
  }

  /**
   * Get priority level for violation
   */
  private static getPriority(severity: Severity): number {
    const priorities = {
      [Severity.CRITICAL]: 4,
      [Severity.ERROR]: 3,
      [Severity.WARNING]: 2,
      [Severity.INFO]: 1
    };

    return priorities[severity] || 0;
  }
}

/**
 * Context for generating messages
 */
export interface MessageContext {
  employee?: Employee;
  assignment?: Assignment;
  demand?: ShiftDemand;
  skill?: {
    name: string;
    requiredLevel?: number;
    currentLevel?: number;
  };
  station?: {
    name: string;
    capacity?: number;
  };
  date?: Date;
  reason?: string;
  values?: Record<string, number | string>;
}

/**
 * Formatted violation for display
 */
export interface FormattedViolation {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  color: string;
  affectedAssignments: string[];
  suggestedActions: string[];
  timestamp: Date;
  canAutoResolve: boolean;
  priority: number;
}