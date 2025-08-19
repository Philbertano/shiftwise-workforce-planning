import { describe, it, expect, beforeEach } from 'vitest';
import { ExplanationEngine, ExplanationContext } from '../../services/ExplanationEngine.js';
import { Assignment } from '../../models/Assignment.js';
import {
  Employee,
  ShiftDemand,
  Station,
  EmployeeSkill,
  Skill,
  ConstraintViolation,
  Priority,
  AssignmentStatus,
  ContractType,
  SkillCategory,
  ShiftType,
  Severity
} from '../../types/index.js';
import {
  AssignmentCandidate,
  ScoringContext,
  EmployeeWorkload,
  StationHistory,
  AvailabilityStatus,
  WorkloadImpact
} from '../../services/interfaces.js';

describe('ExplanationEngine', () => {
  let explanationEngine: ExplanationEngine;
  let mockContext: ExplanationContext;

  beforeEach(() => {
    explanationEngine = new ExplanationEngine();
    mockContext = createMockContext();
  });

  describe('generateExplanation', () => {
    it('should generate comprehensive explanation for high-score assignment', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation).toBeDefined();
      expect(explanation.assignmentId).toBe(mockContext.assignment.id);
      expect(explanation.reasoning).toHaveLength(5); // 5 reasoning steps
      expect(explanation.alternatives).toBeDefined();
      expect(explanation.constraints).toBeDefined();
      expect(explanation.score).toBeDefined();
    });

    it('should generate explanation for low-score assignment', async () => {
      // Create low-score assignment context
      const lowScoreContext = {
        ...mockContext,
        assignment: new Assignment({
          id: 'assign-1',
          demandId: 'demand-1',
          employeeId: 'emp-1',
          status: AssignmentStatus.PROPOSED,
          score: 45,
          explanation: 'Limited alternatives available',
          createdBy: 'system'
        })
      };

      const explanation = await explanationEngine.generateExplanation(lowScoreContext);

      expect(explanation.score.total).toBe(45);
      expect(explanation.reasoning).toHaveLength(5);
      expect(explanation.reasoning.some(r => r.rationale.includes('45/100'))).toBe(true);
    });

    it('should explain constraint violations', async () => {
      const violationContext = {
        ...mockContext,
        constraints: [
          {
            constraintId: 'availability',
            severity: Severity.ERROR,
            message: 'Employee not available during shift time',
            affectedAssignments: ['assign-1'],
            suggestedActions: ['Find alternative employee']
          }
        ]
      };

      const explanation = await explanationEngine.generateExplanation(violationContext);

      expect(explanation.constraints).toHaveLength(4); // 1 violation + 3 satisfied
      expect(explanation.constraints.some(c => !c.satisfied)).toBe(true);
      expect(explanation.constraints.some(c => c.constraintName === 'availability')).toBe(true);
    });
  });

  describe('reasoning chain construction', () => {
    it('should build complete reasoning chain with 5 steps', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation.reasoning).toHaveLength(5);
      expect(explanation.reasoning[0].decision).toContain('demand requirements');
      expect(explanation.reasoning[1].decision).toContain('candidates');
      expect(explanation.reasoning[2].decision).toContain('skill compatibility');
      expect(explanation.reasoning[3].decision).toContain('constraints');
      expect(explanation.reasoning[4].decision).toContain('final assignment');
    });

    it('should include relevant factors for each reasoning step', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      explanation.reasoning.forEach(step => {
        expect(step.factors).toBeDefined();
        expect(step.factors.length).toBeGreaterThan(0);
        expect(step.rationale).toBeDefined();
        expect(step.rationale.length).toBeGreaterThan(10);
      });
    });

    it('should provide meaningful rationale for each step', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      // Check demand analysis step
      const demandStep = explanation.reasoning[0];
      expect(demandStep.rationale).toContain('Production Line A');
      expect(demandStep.rationale).toContain('high priority');

      // Check candidate evaluation step
      const candidateStep = explanation.reasoning[1];
      expect(candidateStep.rationale).toContain('John Doe');
      expect(candidateStep.rationale).toContain('highest combined score');
    });
  });

  describe('alternative explanations', () => {
    it('should explain why alternatives were not selected', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation.alternatives).toHaveLength(2); // 2 alternatives in mock
      expect(explanation.alternatives[0].employeeName).toBe('Jane Smith');
      expect(explanation.alternatives[0].reason).toBeDefined();
      expect(explanation.alternatives[0].score).toBe(75);
    });

    it('should limit alternatives to top 5', async () => {
      // Create context with many alternatives
      const manyAlternativesContext = {
        ...mockContext,
        alternatives: Array.from({ length: 10 }, (_, i) => createMockCandidate(`emp-${i}`, `Employee ${i}`, 60 + i))
      };

      const explanation = await explanationEngine.generateExplanation(manyAlternativesContext);

      expect(explanation.alternatives.length).toBeLessThanOrEqual(5);
    });

    it('should exclude selected employee from alternatives', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation.alternatives.every(alt => alt.employeeId !== mockContext.employee.id)).toBe(true);
    });
  });

  describe('constraint explanations', () => {
    it('should explain satisfied constraints', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      const satisfiedConstraints = explanation.constraints.filter(c => c.satisfied);
      expect(satisfiedConstraints.length).toBeGreaterThan(0);
      expect(satisfiedConstraints.some(c => c.constraintName === 'skill_matching')).toBe(true);
    });

    it('should explain violated constraints', async () => {
      const violationContext = {
        ...mockContext,
        constraints: [
          {
            constraintId: 'labor_law',
            severity: Severity.ERROR,
            message: 'Exceeds maximum daily hours',
            affectedAssignments: ['assign-1'],
            suggestedActions: ['Reduce shift length']
          }
        ]
      };

      const explanation = await explanationEngine.generateExplanation(violationContext);

      const violatedConstraints = explanation.constraints.filter(c => !c.satisfied);
      expect(violatedConstraints.length).toBe(1);
      expect(violatedConstraints[0].constraintName).toBe('labor_law');
      expect(violatedConstraints[0].impact).toContain('Exceeds maximum daily hours');
    });
  });

  describe('score breakdown', () => {
    it('should calculate detailed score breakdown', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation.score.total).toBe(85);
      expect(explanation.score.skillMatch).toBeGreaterThan(0);
      expect(explanation.score.availability).toBeGreaterThan(0);
      expect(explanation.score.fairness).toBeGreaterThan(0);
      expect(explanation.score.preferences).toBeGreaterThan(0);
      expect(explanation.score.continuity).toBeGreaterThan(0);
    });

    it('should calculate skill match score based on requirements', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      // Employee has all required skills at appropriate levels
      expect(explanation.score.skillMatch).toBeGreaterThan(80);
    });

    it('should calculate fairness score based on workload', async () => {
      // Test with under-utilized employee
      const underUtilizedContext = {
        ...mockContext,
        scoringContext: {
          ...mockContext.scoringContext,
          employeeWorkload: {
            employeeId: 'emp-1',
            weeklyHours: 30, // Under 40 hours
            consecutiveDays: 2,
            fairnessScore: 0.9
          }
        }
      };

      const explanation = await explanationEngine.generateExplanation(underUtilizedContext);
      expect(explanation.score.fairness).toBe(100);
    });
  });

  describe('natural language generation', () => {
    it('should generate human-readable explanations', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      explanation.reasoning.forEach(step => {
        expect(step.rationale).toMatch(/^[A-Z]/); // Starts with capital letter
        expect(step.rationale).toMatch(/\.$/); // Ends with period
        expect(step.rationale.length).toBeGreaterThan(20); // Meaningful length
      });
    });

    it('should use appropriate terminology', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      const allText = explanation.reasoning.map(r => r.rationale).join(' ');
      expect(allText).toContain('skill');
      expect(allText).toContain('assignment');
      expect(allText).toContain('constraint');
    });

    it('should provide specific details', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      const demandAnalysis = explanation.reasoning[0].rationale;
      expect(demandAnalysis).toContain('Production Line A');
      expect(demandAnalysis).toContain('high priority');
      expect(demandAnalysis).toContain('2 specific skills');
    });
  });

  describe('explanation accuracy', () => {
    it('should accurately reflect assignment score', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation.score.total).toBe(mockContext.assignment.score);
    });

    it('should accurately reflect constraint violations', async () => {
      const violationContext = {
        ...mockContext,
        constraints: [
          {
            constraintId: 'test_constraint',
            severity: Severity.WARNING,
            message: 'Test violation',
            affectedAssignments: ['assign-1'],
            suggestedActions: []
          }
        ]
      };

      const explanation = await explanationEngine.generateExplanation(violationContext);

      expect(explanation.constraints.some(c => 
        c.constraintName === 'test_constraint' && !c.satisfied
      )).toBe(true);
    });

    it('should accurately reflect employee skills', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      const skillAssessment = explanation.reasoning[2].rationale;
      expect(skillAssessment).toContain('John Doe');
      expect(skillAssessment).toContain('2 of 2 required skills');
    });
  });

  describe('explanation completeness', () => {
    it('should include all required explanation components', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      expect(explanation.assignmentId).toBeDefined();
      expect(explanation.reasoning).toBeDefined();
      expect(explanation.alternatives).toBeDefined();
      expect(explanation.constraints).toBeDefined();
      expect(explanation.score).toBeDefined();
    });

    it('should provide reasoning for all major decision factors', async () => {
      const explanation = await explanationEngine.generateExplanation(mockContext);

      const reasoningText = explanation.reasoning.map(r => r.rationale).join(' ');
      expect(reasoningText).toContain('skill');
      expect(reasoningText).toContain('availability');
      expect(reasoningText).toContain('constraint');
      expect(reasoningText).toContain('fairness');
    });

    it('should explain both positive and negative aspects', async () => {
      const mixedContext = {
        ...mockContext,
        assignment: new Assignment({
          id: 'assign-1',
          demandId: 'demand-1',
          employeeId: 'emp-1',
          status: AssignmentStatus.PROPOSED,
          score: 65, // Medium score
          createdBy: 'system'
        }),
        constraints: [
          {
            constraintId: 'minor_violation',
            severity: Severity.WARNING,
            message: 'Minor scheduling conflict',
            affectedAssignments: ['assign-1'],
            suggestedActions: []
          }
        ]
      };

      const explanation = await explanationEngine.generateExplanation(mixedContext);

      expect(explanation.constraints.some(c => c.satisfied)).toBe(true);
      expect(explanation.constraints.some(c => !c.satisfied)).toBe(true);
    });
  });
});

// Helper functions for creating mock data
function createMockContext(): ExplanationContext {
  const employee: Employee = {
    id: 'emp-1',
    name: 'John Doe',
    contractType: ContractType.FULL_TIME,
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 12,
    team: 'Production Team A',
    active: true,
    preferences: {
      preferredShifts: [ShiftType.DAY],
      preferredStations: ['station-1'],
      preferredDaysOff: [0, 6] // Sunday, Saturday
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const demand: ShiftDemand = {
    id: 'demand-1',
    date: new Date('2024-01-15'),
    stationId: 'station-1',
    shiftTemplateId: 'shift-1',
    requiredCount: 1,
    priority: Priority.HIGH,
    notes: 'Critical production shift',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const station: Station = {
    id: 'station-1',
    name: 'Production Line A',
    line: 'Line A',
    requiredSkills: [
      { skillId: 'skill-1', minLevel: 2, count: 1, mandatory: true },
      { skillId: 'skill-2', minLevel: 1, count: 1, mandatory: true }
    ],
    priority: Priority.HIGH,
    location: 'Building 1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const employeeSkills: EmployeeSkill[] = [
    {
      id: 'empskill-1',
      employeeId: 'emp-1',
      skillId: 'skill-1',
      level: 3,
      validUntil: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'empskill-2',
      employeeId: 'emp-1',
      skillId: 'skill-2',
      level: 2,
      validUntil: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const allSkills: Skill[] = [
    {
      id: 'skill-1',
      name: 'Machine Operation',
      description: 'Operating production machinery',
      levelScale: 3,
      category: SkillCategory.TECHNICAL,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-2',
      name: 'Quality Control',
      description: 'Quality inspection and control',
      levelScale: 3,
      category: SkillCategory.QUALITY,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const assignment = new Assignment({
    id: 'assign-1',
    demandId: 'demand-1',
    employeeId: 'emp-1',
    status: AssignmentStatus.PROPOSED,
    score: 85,
    explanation: 'High-quality assignment with good skill match',
    createdBy: 'system'
  });

  const alternatives: AssignmentCandidate[] = [
    createMockCandidate('emp-2', 'Jane Smith', 75),
    createMockCandidate('emp-3', 'Bob Johnson', 70)
  ];

  const scoringContext: ScoringContext = {
    employee,
    demand,
    existingAssignments: [],
    employeeWorkload: {
      employeeId: 'emp-1',
      weeklyHours: 35,
      consecutiveDays: 3,
      lastShiftEnd: new Date('2024-01-14T17:00:00'),
      fairnessScore: 0.8
    },
    stationHistory: [
      {
        stationId: 'station-1',
        employeeId: 'emp-1',
        assignmentCount: 5,
        lastAssignment: new Date('2024-01-10'),
        proficiencyScore: 0.9
      }
    ]
  };

  return {
    assignment,
    employee,
    demand,
    station,
    employeeSkills,
    allSkills,
    alternatives,
    constraints: [], // No violations by default
    scoringContext
  };
}

function createMockCandidate(id: string, name: string, score: number): AssignmentCandidate {
  const employee: Employee = {
    id,
    name,
    contractType: ContractType.FULL_TIME,
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 12,
    team: 'Production Team A',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const availability: AvailabilityStatus = {
    available: true,
    conflicts: [],
    workloadImpact: {
      currentWeeklyHours: 35,
      projectedWeeklyHours: 43,
      consecutiveDays: 2,
      restHoursSinceLastShift: 16
    }
  };

  return {
    employee,
    score,
    explanation: `Candidate with score ${score}`,
    constraints: [],
    availability
  };
}