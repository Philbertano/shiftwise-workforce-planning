import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { KiroToolsService, GeneratePlanParams, ExplainPlanParams, SimulateAbsenceParams } from '../../services/KiroToolsService.js';
import { PlanningService } from '../../services/PlanningService.js';
import { ExplanationEngine } from '../../services/ExplanationEngine.js';
import { SimulationService } from '../../services/SimulationService.js';
import { ConstraintManager } from '../../constraints/ConstraintManager.js';
import {
  PlanProposal,
  Assignment,
  AssignmentStatus,
  Priority,
  RiskLevel,
  AbsenceType,
  SimulationResult,
  DateRange
} from '../../types/index.js';

// Mock dependencies
vi.mock('../../services/PlanningService.js');
vi.mock('../../services/ExplanationEngine.js');
vi.mock('../../services/SimulationService.js');
vi.mock('../../constraints/ConstraintManager.js');

describe('KiroToolsService', () => {
  let kiroToolsService: KiroToolsService;
  let mockPlanningService: Mock;
  let mockExplanationEngine: Mock;
  let mockSimulationService: Mock;
  let mockConstraintManager: Mock;

  const mockDateRange: DateRange = {
    start: new Date('2024-01-15'),
    end: new Date('2024-01-21')
  };

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    demandId: 'demand-1',
    employeeId: 'employee-1',
    status: AssignmentStatus.PROPOSED,
    score: 85,
    explanation: 'Good skill match and availability',
    createdAt: new Date(),
    createdBy: 'system'
  };

  const mockPlanProposal: PlanProposal = {
    id: 'plan-123',
    assignments: [mockAssignment],
    coverageStatus: {
      totalDemands: 10,
      filledDemands: 8,
      coveragePercentage: 80,
      gaps: [
        {
          demandId: 'demand-2',
          stationName: 'Station A',
          shiftTime: '08:00-16:00',
          criticality: Priority.HIGH,
          reason: 'No qualified employees available',
          suggestedActions: ['Consider overtime', 'Review skill requirements']
        }
      ],
      riskLevel: RiskLevel.MEDIUM
    },
    violations: [],
    explanation: 'Generated plan with good coverage',
    generatedAt: new Date(),
    generatedBy: 'system'
  };

  const mockSimulationResult: SimulationResult = {
    scenarioName: 'Absence simulation',
    originalCoverage: {
      dateRange: mockDateRange,
      totalDemands: 10,
      filledDemands: 10,
      coveragePercentage: 100,
      stationCoverage: [],
      gaps: [],
      trends: []
    },
    simulatedCoverage: {
      dateRange: mockDateRange,
      totalDemands: 10,
      filledDemands: 8,
      coveragePercentage: 80,
      stationCoverage: [],
      gaps: [
        {
          demandId: 'demand-1',
          stationName: 'Station A',
          shiftTime: '08:00-16:00',
          criticality: Priority.HIGH,
          reason: 'Employee absent',
          suggestedActions: ['Find replacement']
        }
      ],
      trends: []
    },
    impactAnalysis: {
      coverageChange: -20,
      affectedStations: ['Station A', 'Station B'],
      riskIncrease: 25,
      recommendedActions: [
        {
          type: 'overtime_approval',
          description: 'Approve overtime for coverage',
          priority: 'high',
          estimatedCost: 500,
          timeframe: 'Immediate'
        }
      ]
    },
    recommendations: ['Consider overtime assignments', 'Review backup staff']
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock instances
    mockPlanningService = vi.mocked(PlanningService);
    mockExplanationEngine = vi.mocked(ExplanationEngine);
    mockSimulationService = vi.mocked(SimulationService);
    mockConstraintManager = vi.mocked(ConstraintManager);

    // Setup mock implementations
    mockPlanningService.prototype.generatePlan = vi.fn().mockResolvedValue(mockPlanProposal);
    mockSimulationService.prototype.simulateAbsence = vi.fn().mockResolvedValue(mockSimulationResult);
    mockConstraintManager.prototype.getConstraints = vi.fn().mockReturnValue([]);

    // Create service instance
    kiroToolsService = new KiroToolsService(
      new mockPlanningService(mockConstraintManager),
      new mockExplanationEngine(),
      new mockSimulationService(mockPlanningService),
      new mockConstraintManager()
    );
  });

  describe('generatePlan', () => {
    it('should generate a plan successfully with basic parameters', async () => {
      const params: GeneratePlanParams = {
        dateRange: mockDateRange,
        instructions: 'Generate a balanced shift plan'
      };

      const result = await kiroToolsService.generatePlan(params);

      expect(result.success).toBe(true);
      expect(result.planId).toBe('plan-123');
      expect(result.assignments).toHaveLength(1);
      expect(result.coveragePercentage).toBe(80);
      expect(result.gaps).toBe(1);
      expect(result.explanation).toContain('Generated 1 assignments with 80.0% coverage');
      expect(result.message).toContain('Successfully generated plan');
    });

    it('should generate a plan with station filtering', async () => {
      const params: GeneratePlanParams = {
        dateRange: mockDateRange,
        stationIds: ['station-1', 'station-2'],
        instructions: 'Focus on critical stations'
      };

      const result = await kiroToolsService.generatePlan(params);

      expect(result.success).toBe(true);
      expect(mockPlanningService.prototype.generatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: mockDateRange,
          stationIds: ['station-1', 'station-2']
        }),
        'kiro-agent'
      );
    });

    it('should parse strategy from instructions', async () => {
      const params: GeneratePlanParams = {
        dateRange: mockDateRange,
        instructions: 'This is critical and urgent - prioritize coverage'
      };

      await kiroToolsService.generatePlan(params);

      expect(mockPlanningService.prototype.generatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'coverage_first'
        }),
        'kiro-agent'
      );
    });

    it('should handle fairness-focused instructions', async () => {
      const params: GeneratePlanParams = {
        dateRange: mockDateRange,
        instructions: 'Make sure the plan is fair and balanced for all employees'
      };

      await kiroToolsService.generatePlan(params);

      expect(mockPlanningService.prototype.generatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'fairness_first'
        }),
        'kiro-agent'
      );
    });

    it('should handle skill-focused instructions', async () => {
      const params: GeneratePlanParams = {
        dateRange: mockDateRange,
        instructions: 'Ensure all employees are properly skilled and qualified'
      };

      await kiroToolsService.generatePlan(params);

      expect(mockPlanningService.prototype.generatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'skill_match_first'
        }),
        'kiro-agent'
      );
    });

    it('should include custom constraints', async () => {
      const params: GeneratePlanParams = {
        dateRange: mockDateRange,
        instructions: 'Generate plan with custom rules',
        constraints: ['No overtime on weekends', 'Minimum 2 people per station']
      };

      await kiroToolsService.generatePlan(params);

      expect(mockPlanningService.prototype.generatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          constraints: expect.arrayContaining([
            expect.objectContaining({
              type: 'custom',
              description: 'No overtime on weekends'
            }),
            expect.objectContaining({
              type: 'custom',
              description: 'Minimum 2 people per station'
            })
          ])
        }),
        'kiro-agent'
      );
    });

    it('should provide quality assessment in explanation', async () => {
      // Test excellent quality
      const excellentPlan = {
        ...mockPlanProposal,
        coverageStatus: {
          ...mockPlanProposal.coverageStatus,
          coveragePercentage: 98,
          gaps: []
        },
        violations: []
      };
      mockPlanningService.prototype.generatePlan.mockResolvedValueOnce(excellentPlan);

      const params: GeneratePlanParams = { dateRange: mockDateRange };
      const result = await kiroToolsService.generatePlan(params);

      expect(result.explanation).toContain('Excellent plan quality');
    });

    it('should handle planning service errors gracefully', async () => {
      mockPlanningService.prototype.generatePlan.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const params: GeneratePlanParams = { dateRange: mockDateRange };
      const result = await kiroToolsService.generatePlan(params);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to generate plan: Database connection failed');
      expect(result.planId).toBe('');
      expect(result.assignments).toHaveLength(0);
    });

    it('should cache generated plans', async () => {
      const params: GeneratePlanParams = { dateRange: mockDateRange };
      await kiroToolsService.generatePlan(params);

      const cachedPlan = kiroToolsService.getCachedPlan('plan-123');
      expect(cachedPlan).toEqual(mockPlanProposal);
    });
  });

  describe('explainPlan', () => {
    beforeEach(() => {
      // Add plan to cache
      kiroToolsService.generatePlan({ dateRange: mockDateRange });
    });

    it('should explain a complete plan by ID', async () => {
      const params: ExplainPlanParams = { planId: 'plan-123' };
      const result = await kiroToolsService.explainPlan(params);

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('This plan includes 1 shift assignments');
      expect(result.explanation).toContain('80.0% overall coverage');
      expect(result.reasoning).toContain('Evaluated 1 assignments across multiple stations');
      expect(result.alternatives).toContain('Consider overtime assignments to fill coverage gaps');
      expect(result.constraints).toContain('Skill requirements must be met for all assignments');
    });

    it('should handle plan not found error', async () => {
      const params: ExplainPlanParams = { planId: 'nonexistent-plan' };
      const result = await kiroToolsService.explainPlan(params);

      expect(result.success).toBe(false);
      expect(result.explanation).toBe('');
    });

    it('should explain specific assignment by ID', async () => {
      const params: ExplainPlanParams = { assignmentId: 'assignment-1' };
      const result = await kiroToolsService.explainPlan(params);

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Assignment explanation not yet implemented');
    });

    it('should require either planId or assignmentId', async () => {
      const params: ExplainPlanParams = {};
      const result = await kiroToolsService.explainPlan(params);

      expect(result.success).toBe(false);
    });

    it('should provide different explanations based on plan quality', async () => {
      // Test plan with violations
      const planWithViolations = {
        ...mockPlanProposal,
        violations: [
          {
            constraintId: 'labor_law',
            severity: 'error' as const,
            message: 'Exceeds maximum hours',
            affectedAssignments: ['assignment-1'],
            suggestedActions: ['Reduce hours']
          }
        ]
      };

      // Mock a plan with violations in cache
      kiroToolsService.clearPlanCache();
      mockPlanningService.prototype.generatePlan.mockResolvedValueOnce(planWithViolations);
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });

      const params: ExplainPlanParams = { planId: planWithViolations.id };
      const result = await kiroToolsService.explainPlan(params);

      expect(result.explanation).toContain('1 constraint violation detected');
      expect(result.constraints).toContain('Violation: Exceeds maximum hours');
    });
  });

  describe('simulateAbsence', () => {
    it('should simulate absence impact successfully', async () => {
      const params: SimulateAbsenceParams = {
        employeeId: 'employee-1',
        dateStart: new Date('2024-01-15'),
        dateEnd: new Date('2024-01-17'),
        absenceType: AbsenceType.SICK
      };

      const result = await kiroToolsService.simulateAbsence(params);

      expect(result.success).toBe(true);
      expect(result.impactSummary).toContain('20.0% decrease in coverage');
      expect(result.coverageChange).toBe(-20);
      expect(result.affectedStations).toEqual(['Station A', 'Station B']);
      expect(result.recommendations).toContain('Consider overtime assignments');
      expect(result.riskLevel).toBe('high');
    });

    it('should use default absence type when not specified', async () => {
      const params: SimulateAbsenceParams = {
        employeeId: 'employee-1',
        dateStart: new Date('2024-01-15'),
        dateEnd: new Date('2024-01-17')
      };

      await kiroToolsService.simulateAbsence(params);

      expect(mockSimulationService.prototype.simulateAbsence).toHaveBeenCalledWith(
        'employee-1',
        expect.objectContaining({
          start: params.dateStart,
          end: params.dateEnd
        }),
        AbsenceType.SICK
      );
    });

    it('should determine correct risk levels', async () => {
      // Test critical risk
      const criticalResult = {
        ...mockSimulationResult,
        impactAnalysis: {
          ...mockSimulationResult.impactAnalysis,
          riskIncrease: 35,
          coverageChange: -25
        }
      };
      mockSimulationService.prototype.simulateAbsence.mockResolvedValueOnce(criticalResult);

      const params: SimulateAbsenceParams = {
        employeeId: 'employee-1',
        dateStart: new Date('2024-01-15'),
        dateEnd: new Date('2024-01-17')
      };

      const result = await kiroToolsService.simulateAbsence(params);
      expect(result.riskLevel).toBe('critical');
    });

    it('should handle simulation service errors gracefully', async () => {
      mockSimulationService.prototype.simulateAbsence.mockRejectedValueOnce(
        new Error('Simulation failed')
      );

      const params: SimulateAbsenceParams = {
        employeeId: 'employee-1',
        dateStart: new Date('2024-01-15'),
        dateEnd: new Date('2024-01-17')
      };

      const result = await kiroToolsService.simulateAbsence(params);

      expect(result.success).toBe(false);
      expect(result.impactSummary).toBe('');
      expect(result.riskLevel).toBe('unknown');
    });

    it('should generate appropriate impact summaries', async () => {
      // Test manageable impact
      const manageableResult = {
        ...mockSimulationResult,
        impactAnalysis: {
          ...mockSimulationResult.impactAnalysis,
          riskIncrease: 3,
          coverageChange: -2
        }
      };
      mockSimulationService.prototype.simulateAbsence.mockResolvedValueOnce(manageableResult);

      const params: SimulateAbsenceParams = {
        employeeId: 'employee-1',
        dateStart: new Date('2024-01-15'),
        dateEnd: new Date('2024-01-17')
      };

      const result = await kiroToolsService.simulateAbsence(params);
      expect(result.impactSummary).toContain('Impact is manageable with current resources');
    });
  });

  describe('suggestOptimizations', () => {
    beforeEach(async () => {
      // Generate and cache a plan
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });
    });

    it('should suggest overtime for critical gaps', async () => {
      const planWithCriticalGaps = {
        ...mockPlanProposal,
        coverageStatus: {
          ...mockPlanProposal.coverageStatus,
          gaps: [
            {
              demandId: 'demand-1',
              stationName: 'Station A',
              shiftTime: '08:00-16:00',
              criticality: Priority.CRITICAL,
              reason: 'No qualified employees',
              suggestedActions: []
            }
          ]
        }
      };

      kiroToolsService.clearPlanCache();
      mockPlanningService.prototype.generatePlan.mockResolvedValueOnce(planWithCriticalGaps);
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });

      const suggestions = await kiroToolsService.suggestOptimizations(planWithCriticalGaps.id);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'overtime',
          priority: 'critical',
          description: expect.stringContaining('critical coverage gaps')
        })
      );
    });

    it('should suggest training for multiple station gaps', async () => {
      const planWithMultipleGaps = {
        ...mockPlanProposal,
        coverageStatus: {
          ...mockPlanProposal.coverageStatus,
          gaps: [
            {
              demandId: 'demand-1',
              stationName: 'Station A',
              shiftTime: '08:00-16:00',
              criticality: Priority.HIGH,
              reason: 'No qualified employees',
              suggestedActions: []
            },
            {
              demandId: 'demand-2',
              stationName: 'Station B',
              shiftTime: '08:00-16:00',
              criticality: Priority.HIGH,
              reason: 'No qualified employees',
              suggestedActions: []
            },
            {
              demandId: 'demand-3',
              stationName: 'Station C',
              shiftTime: '08:00-16:00',
              criticality: Priority.HIGH,
              reason: 'No qualified employees',
              suggestedActions: []
            }
          ]
        }
      };

      kiroToolsService.clearPlanCache();
      mockPlanningService.prototype.generatePlan.mockResolvedValueOnce(planWithMultipleGaps);
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });

      const suggestions = await kiroToolsService.suggestOptimizations(planWithMultipleGaps.id);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'training',
          priority: 'medium',
          description: expect.stringContaining('cross-training program')
        })
      );
    });

    it('should suggest swaps for constraint violations', async () => {
      const planWithViolations = {
        ...mockPlanProposal,
        violations: [
          {
            constraintId: 'labor_law',
            severity: 'critical' as const,
            message: 'Exceeds maximum hours',
            affectedAssignments: ['assignment-1'],
            suggestedActions: []
          }
        ]
      };

      kiroToolsService.clearPlanCache();
      mockPlanningService.prototype.generatePlan.mockResolvedValueOnce(planWithViolations);
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });

      const suggestions = await kiroToolsService.suggestOptimizations(planWithViolations.id);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'swap',
          priority: 'high',
          description: expect.stringContaining('constraint violations')
        })
      );
    });

    it('should handle plan not found error', async () => {
      const suggestions = await kiroToolsService.suggestOptimizations('nonexistent-plan');
      expect(suggestions).toEqual([]);
    });

    it('should return empty array for optimal plans', async () => {
      const optimalPlan = {
        ...mockPlanProposal,
        coverageStatus: {
          ...mockPlanProposal.coverageStatus,
          coveragePercentage: 100,
          gaps: []
        },
        violations: []
      };

      kiroToolsService.clearPlanCache();
      mockPlanningService.prototype.generatePlan.mockResolvedValueOnce(optimalPlan);
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });

      const suggestions = await kiroToolsService.suggestOptimizations(optimalPlan.id);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should clear plan cache', () => {
      kiroToolsService.generatePlan({ dateRange: mockDateRange });
      kiroToolsService.clearPlanCache();
      
      const cachedPlan = kiroToolsService.getCachedPlan('plan-123');
      expect(cachedPlan).toBeUndefined();
    });

    it('should retrieve cached plans', async () => {
      await kiroToolsService.generatePlan({ dateRange: mockDateRange });
      
      const cachedPlan = kiroToolsService.getCachedPlan('plan-123');
      expect(cachedPlan).toEqual(mockPlanProposal);
    });
  });
});