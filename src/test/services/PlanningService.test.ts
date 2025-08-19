import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningService } from '../../services/PlanningService.js';
import { ConstraintManager } from '../../constraints/ConstraintManager.js';
import {
  PlanGenerationRequest,
  PlanProposal,
  DateRange,
  PlanningStrategy,
  Priority,
  RiskLevel,
  AssignmentStatus
} from '../../types/index.js';

describe('PlanningService', () => {
  let planningService: PlanningService;
  let constraintManager: ConstraintManager;

  beforeEach(() => {
    constraintManager = new ConstraintManager([]);
    planningService = new PlanningService(constraintManager);
  });

  describe('generatePlan', () => {
    it('should generate a plan proposal successfully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const request: PlanGenerationRequest = {
        dateRange: {
          start: tomorrow,
          end: dayAfter
        },
        stationIds: ['station1', 'station2'],
        shiftTemplateIds: ['shift1'],
        strategy: PlanningStrategy.BALANCED
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeDefined();
      expect(proposal.id).toMatch(/^plan_\d+_[a-z0-9]+$/);
      expect(proposal.assignments).toBeDefined();
      expect(Array.isArray(proposal.assignments)).toBe(true);
      expect(proposal.coverageStatus).toBeDefined();
      expect(proposal.violations).toBeDefined();
      expect(Array.isArray(proposal.violations)).toBe(true);
      expect(proposal.explanation).toBeDefined();
      expect(typeof proposal.explanation).toBe('string');
      expect(proposal.generatedAt).toBeInstanceOf(Date);
      expect(proposal.generatedBy).toBe('system');
    });

    it('should handle different planning strategies', async () => {
      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        strategy: PlanningStrategy.FAIRNESS_FIRST
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeDefined();
    });

    it('should handle custom constraints', async () => {
      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        constraints: [
          {
            name: 'Custom Constraint',
            rule: 'max_consecutive_days <= 5',
            weight: 0.8
          }
        ]
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeDefined();
    });

    it('should filter by station IDs when provided', async () => {
      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        stationIds: ['station1']
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeDefined();
    });

    it('should filter by shift template IDs when provided', async () => {
      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        shiftTemplateIds: ['shift1', 'shift2']
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeDefined();
    });

    it('should handle empty date range', async () => {
      const sameDate = new Date();
      const request: PlanGenerationRequest = {
        dateRange: {
          start: sameDate,
          end: sameDate
        }
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal).toBeDefined();
      expect(proposal.coverageStatus.totalDemands).toBe(0);
      expect(proposal.coverageStatus.filledDemands).toBe(0);
      expect(proposal.coverageStatus.coveragePercentage).toBe(0);
    });

    it('should calculate coverage status correctly', async () => {
      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal.coverageStatus).toBeDefined();
      expect(typeof proposal.coverageStatus.totalDemands).toBe('number');
      expect(typeof proposal.coverageStatus.filledDemands).toBe('number');
      expect(typeof proposal.coverageStatus.coveragePercentage).toBe('number');
      expect(proposal.coverageStatus.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(proposal.coverageStatus.coveragePercentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(proposal.coverageStatus.gaps)).toBe(true);
      expect(Object.values(RiskLevel)).toContain(proposal.coverageStatus.riskLevel);
    });

    it('should generate meaningful explanations', async () => {
      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      };

      const proposal = await planningService.generatePlan(request);

      expect(proposal.explanation).toBeDefined();
      expect(proposal.explanation.length).toBeGreaterThan(0);
      expect(proposal.explanation).toContain('Generated');
      expect(proposal.explanation).toContain('assignments');
      expect(proposal.explanation).toContain('demands');
    });

    it('should handle errors gracefully', async () => {
      // Mock the solver to throw an error
      const originalSolver = (planningService as any).solver;
      (planningService as any).solver = {
        solve: vi.fn().mockRejectedValue(new Error('Solver error'))
      };

      const request: PlanGenerationRequest = {
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      };

      await expect(planningService.generatePlan(request)).rejects.toThrow('Failed to generate plan: Solver error');

      // Restore original solver
      (planningService as any).solver = originalSolver;
    });
  });

  describe('commitPlan', () => {
    it('should throw not implemented error', async () => {
      await expect(planningService.commitPlan('plan1', [])).rejects.toThrow('Not implemented yet');
    });
  });

  describe('simulateScenario', () => {
    it('should throw not implemented error', async () => {
      const scenario = {
        name: 'Test Scenario',
        baseDate: new Date(),
        modifications: []
      };

      await expect(planningService.simulateScenario(scenario)).rejects.toThrow('Not implemented yet');
    });
  });

  describe('explainAssignment', () => {
    it('should throw not implemented error', async () => {
      await expect(planningService.explainAssignment('assignment1')).rejects.toThrow('Not implemented yet');
    });
  });

  describe('optimizeAssignments', () => {
    it('should throw not implemented error', async () => {
      const objectives = [{
        name: 'fairness',
        weight: 1.0,
        type: 'maximize' as const,
        calculator: () => 0
      }];

      await expect(planningService.optimizeAssignments([], objectives)).rejects.toThrow('Not implemented yet');
    });
  });

  describe('coverage calculation', () => {
    it('should calculate risk level correctly for different coverage percentages', () => {
      const service = planningService as any;

      // Test 100% coverage
      expect(service.calculateRiskLevel(100, [])).toBe(RiskLevel.LOW);

      // Test 95% coverage
      expect(service.calculateRiskLevel(95, [])).toBe(RiskLevel.MEDIUM);

      // Test 80% coverage
      expect(service.calculateRiskLevel(80, [])).toBe(RiskLevel.HIGH);

      // Test 60% coverage
      expect(service.calculateRiskLevel(60, [])).toBe(RiskLevel.CRITICAL);

      // Test with critical gaps
      const criticalGaps = [{
        demandId: 'demand1',
        stationName: 'Station 1',
        shiftTime: '08:00-16:00',
        criticality: Priority.CRITICAL,
        reason: 'No qualified staff',
        suggestedActions: ['Hire temp staff']
      }];

      expect(service.calculateRiskLevel(95, criticalGaps)).toBe(RiskLevel.CRITICAL);
    });

    it('should generate coverage gaps correctly', () => {
      const service = planningService as any;
      const mockDemands = [
        {
          id: 'demand1',
          priority: Priority.HIGH
        },
        {
          id: 'demand2',
          priority: Priority.MEDIUM
        }
      ];

      const assignments = []; // No assignments

      const coverageStatus = service.calculateCoverageStatus(assignments, mockDemands);

      expect(coverageStatus.gaps).toHaveLength(2);
      expect(coverageStatus.gaps[0].demandId).toBe('demand1');
      expect(coverageStatus.gaps[0].criticality).toBe(Priority.HIGH);
      expect(coverageStatus.gaps[1].demandId).toBe('demand2');
      expect(coverageStatus.gaps[1].criticality).toBe(Priority.MEDIUM);
    });
  });

  describe('plan ID generation', () => {
    it('should generate unique plan IDs', () => {
      const service = planningService as any;
      const id1 = service.generatePlanId();
      const id2 = service.generatePlanId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^plan_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^plan_\d+_[a-z0-9]+$/);
    });
  });

  describe('default objectives', () => {
    it('should provide default optimization objectives', () => {
      const service = planningService as any;
      const objectives = service.getDefaultObjectives();

      expect(objectives).toHaveLength(3);
      expect(objectives.map(o => o.name)).toContain('fairness');
      expect(objectives.map(o => o.name)).toContain('skill_match');
      expect(objectives.map(o => o.name)).toContain('continuity');

      // Check that all objectives have required properties
      objectives.forEach(objective => {
        expect(objective.name).toBeDefined();
        expect(typeof objective.weight).toBe('number');
        expect(objective.weight).toBeGreaterThan(0);
        expect(objective.weight).toBeLessThanOrEqual(1);
        expect(['maximize', 'minimize']).toContain(objective.type);
        expect(typeof objective.calculator).toBe('function');
      });

      // Check that weights sum to 1.0
      const totalWeight = objectives.reduce((sum, obj) => sum + obj.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });
  });

  describe('explanation generation', () => {
    it('should generate explanations with execution time', () => {
      const service = planningService as any;
      const mockSolution = {
        assignments: [{ id: 'a1' }, { id: 'a2' }],
        violations: [],
        executionTime: 150
      };
      const mockProblem = {
        demands: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }]
      };

      const explanation = service.generatePlanExplanation(mockSolution, mockProblem);

      expect(explanation).toContain('Generated 2 assignments for 3 demands');
      expect(explanation).toContain('Execution time: 150ms');
      expect(explanation).not.toContain('violations');
    });

    it('should include violation count in explanation when present', () => {
      const service = planningService as any;
      const mockSolution = {
        assignments: [{ id: 'a1' }],
        violations: [{ id: 'v1' }, { id: 'v2' }],
        executionTime: 200
      };
      const mockProblem = {
        demands: [{ id: 'd1' }]
      };

      const explanation = service.generatePlanExplanation(mockSolution, mockProblem);

      expect(explanation).toContain('Generated 1 assignments for 1 demands');
      expect(explanation).toContain('with 2 constraint violations');
      expect(explanation).toContain('Execution time: 200ms');
    });
  });
});