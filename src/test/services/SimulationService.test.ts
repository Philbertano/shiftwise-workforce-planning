import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimulationService } from '../../services/SimulationService.js';
import { PlanningService } from '../../services/PlanningService.js';
import { ConstraintManager } from '../../constraints/ConstraintManager.js';
import {
  WhatIfScenario,
  SimulationResult,
  IPlanningService,
  CoverageReport
} from '../../services/interfaces.js';
import {
  AbsenceType,
  Priority,
  RiskLevel,
  AssignmentStatus,
  PlanProposal,
  CoverageStatus
} from '../../types/index.js';
import { addDays } from 'date-fns';

describe('SimulationService', () => {
  let simulationService: SimulationService;
  let mockPlanningService: IPlanningService;
  let constraintManager: ConstraintManager;

  const baseDate = new Date('2024-01-15');
  const dateRange = {
    start: baseDate,
    end: addDays(baseDate, 7)
  };

  beforeEach(() => {
    constraintManager = new ConstraintManager();
    
    // Mock planning service
    mockPlanningService = {
      generatePlan: vi.fn(),
      commitPlan: vi.fn(),
      simulateScenario: vi.fn(),
      explainAssignment: vi.fn(),
      optimizeAssignments: vi.fn()
    };

    simulationService = new SimulationService(mockPlanningService);
  });

  describe('simulateScenario', () => {
    it('should simulate a basic scenario successfully', async () => {
      const scenario: WhatIfScenario = {
        name: 'Test Scenario',
        baseDate,
        modifications: []
      };

      const mockBaseline: PlanProposal = {
        id: 'baseline-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 10,
          filledDemands: 8,
          coveragePercentage: 80,
          gaps: [],
          riskLevel: RiskLevel.MEDIUM
        },
        violations: [],
        explanation: 'Baseline plan',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const mockModified: PlanProposal = {
        id: 'modified-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 10,
          filledDemands: 7,
          coveragePercentage: 70,
          gaps: [{
            demandId: 'demand-1',
            stationName: 'Station A',
            shiftTime: '08:00-16:00',
            criticality: Priority.HIGH,
            reason: 'No qualified employees available',
            suggestedActions: ['Consider overtime']
          }],
          riskLevel: RiskLevel.HIGH
        },
        violations: [],
        explanation: 'Modified plan',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValueOnce(mockBaseline)
        .mockResolvedValueOnce(mockModified);

      const result = await simulationService.simulateScenario(scenario);

      expect(result).toBeDefined();
      expect(result.scenarioName).toBe('Test Scenario');
      expect(result.originalCoverage.coveragePercentage).toBe(80);
      expect(result.simulatedCoverage.coveragePercentage).toBe(70);
      expect(result.impactAnalysis.coverageChange).toBe(-10);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle absence injection scenario', async () => {
      const scenario: WhatIfScenario = {
        name: 'Absence Simulation',
        baseDate,
        modifications: [{
          type: 'add_absence',
          entityId: 'employee-1',
          parameters: {
            dateStart: baseDate,
            dateEnd: addDays(baseDate, 2),
            type: AbsenceType.SICK
          }
        }]
      };

      const mockBaseline: PlanProposal = {
        id: 'baseline-plan',
        assignments: [{
          id: 'assignment-1',
          demandId: 'demand-1',
          employeeId: 'employee-1',
          status: AssignmentStatus.CONFIRMED,
          score: 85,
          createdAt: new Date(),
          createdBy: 'system',
          updatedAt: new Date()
        }],
        coverageStatus: {
          totalDemands: 5,
          filledDemands: 5,
          coveragePercentage: 100,
          gaps: [],
          riskLevel: RiskLevel.LOW
        },
        violations: [],
        explanation: 'Full coverage',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const mockModified: PlanProposal = {
        id: 'modified-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 5,
          filledDemands: 4,
          coveragePercentage: 80,
          gaps: [{
            demandId: 'demand-1',
            stationName: 'Station A',
            shiftTime: '08:00-16:00',
            criticality: Priority.CRITICAL,
            reason: 'Employee absent due to sickness',
            suggestedActions: ['Find replacement', 'Approve overtime']
          }],
          riskLevel: RiskLevel.HIGH
        },
        violations: [],
        explanation: 'Coverage reduced due to absence',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValueOnce(mockBaseline)
        .mockResolvedValueOnce(mockModified);

      const result = await simulationService.simulateScenario(scenario);

      expect(result.impactAnalysis.coverageChange).toBe(-20);
      expect(result.impactAnalysis.affectedStations).toContain('Station A');
      expect(result.recommendations).toContain('High risk increase identified. Immediate mitigation required.');
    });

    it('should handle multiple modifications', async () => {
      const scenario: WhatIfScenario = {
        name: 'Complex Scenario',
        baseDate,
        modifications: [
          {
            type: 'add_absence',
            entityId: 'employee-1',
            parameters: {
              dateStart: baseDate,
              dateEnd: baseDate,
              type: AbsenceType.SICK
            }
          },
          {
            type: 'change_demand',
            entityId: 'demand-1',
            parameters: {
              requiredCount: 3,
              priority: Priority.CRITICAL
            }
          }
        ]
      };

      const mockBaseline: PlanProposal = {
        id: 'baseline-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 5,
          filledDemands: 5,
          coveragePercentage: 100,
          gaps: [],
          riskLevel: RiskLevel.LOW
        },
        violations: [],
        explanation: 'Baseline',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const mockModified: PlanProposal = {
        id: 'modified-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 7, // Increased due to demand change
          filledDemands: 4,
          coveragePercentage: 57,
          gaps: [
            {
              demandId: 'demand-1',
              stationName: 'Station A',
              shiftTime: '08:00-16:00',
              criticality: Priority.CRITICAL,
              reason: 'Increased demand and employee absence',
              suggestedActions: ['Hire temporary staff', 'Approve overtime']
            }
          ],
          riskLevel: RiskLevel.CRITICAL
        },
        violations: [],
        explanation: 'Multiple modifications applied',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValueOnce(mockBaseline)
        .mockResolvedValueOnce(mockModified);

      const result = await simulationService.simulateScenario(scenario);

      expect(result.impactAnalysis.coverageChange).toBe(-43);
      expect(result.impactAnalysis.riskIncrease).toBeGreaterThan(40);
      expect(result.impactAnalysis.recommendedActions.length).toBeGreaterThan(0);
      expect(result.impactAnalysis.recommendedActions.some(action => action.type === 'hire_temp')).toBe(true);
    });

    it('should handle planning service errors gracefully', async () => {
      const scenario: WhatIfScenario = {
        name: 'Error Scenario',
        baseDate,
        modifications: []
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockRejectedValue(new Error('Planning service error'));

      await expect(simulationService.simulateScenario(scenario))
        .rejects.toThrow('Failed to simulate scenario: Planning service error');
    });
  });

  describe('simulateAbsence', () => {
    it('should simulate temporary absence correctly', async () => {
      const employeeId = 'employee-1';
      const absenceRange = {
        start: baseDate,
        end: addDays(baseDate, 3)
      };

      const mockBaseline: PlanProposal = {
        id: 'baseline-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 10,
          filledDemands: 10,
          coveragePercentage: 100,
          gaps: [],
          riskLevel: RiskLevel.LOW
        },
        violations: [],
        explanation: 'Full coverage',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const mockModified: PlanProposal = {
        id: 'modified-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 10,
          filledDemands: 8,
          coveragePercentage: 80,
          gaps: [{
            demandId: 'demand-1',
            stationName: 'Station A',
            shiftTime: '08:00-16:00',
            criticality: Priority.HIGH,
            reason: 'Employee absent',
            suggestedActions: ['Find replacement']
          }],
          riskLevel: RiskLevel.MEDIUM
        },
        violations: [],
        explanation: 'Absence impact',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValueOnce(mockBaseline)
        .mockResolvedValueOnce(mockModified);

      const result = await simulationService.simulateAbsence(employeeId, absenceRange);

      expect(result.scenarioName).toContain('Temporary sick absence simulation');
      expect(result.impactAnalysis.coverageChange).toBe(-20);
    });

    it('should handle different absence types', async () => {
      const employeeId = 'employee-1';
      const absenceRange = {
        start: baseDate,
        end: addDays(baseDate, 1)
      };

      const mockBaseline: PlanProposal = {
        id: 'baseline-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 5,
          filledDemands: 5,
          coveragePercentage: 100,
          gaps: [],
          riskLevel: RiskLevel.LOW
        },
        violations: [],
        explanation: 'Baseline',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const mockModified: PlanProposal = {
        id: 'modified-plan',
        assignments: [],
        coverageStatus: {
          totalDemands: 5,
          filledDemands: 4,
          coveragePercentage: 80,
          gaps: [],
          riskLevel: RiskLevel.MEDIUM
        },
        violations: [],
        explanation: 'Training absence impact',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValueOnce(mockBaseline)
        .mockResolvedValueOnce(mockModified);

      const result = await simulationService.simulateAbsence(
        employeeId, 
        absenceRange, 
        AbsenceType.TRAINING
      );

      expect(result.scenarioName).toContain('Temporary training absence simulation');
    });
  });

  describe('compareScenarios', () => {
    it('should compare two scenarios and recommend better one', async () => {
      const scenario1: WhatIfScenario = {
        name: 'Scenario 1',
        baseDate,
        modifications: []
      };

      const scenario2: WhatIfScenario = {
        name: 'Scenario 2',
        baseDate,
        modifications: []
      };

      // Mock results for scenario 1 (better coverage)
      const mockPlan1: PlanProposal = {
        id: 'plan-1',
        assignments: [],
        coverageStatus: {
          totalDemands: 10,
          filledDemands: 9,
          coveragePercentage: 90,
          gaps: [],
          riskLevel: RiskLevel.LOW
        },
        violations: [],
        explanation: 'Scenario 1',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      // Mock results for scenario 2 (worse coverage)
      const mockPlan2: PlanProposal = {
        id: 'plan-2',
        assignments: [],
        coverageStatus: {
          totalDemands: 10,
          filledDemands: 7,
          coveragePercentage: 70,
          gaps: [{
            demandId: 'demand-1',
            stationName: 'Station A',
            shiftTime: '08:00-16:00',
            criticality: Priority.HIGH,
            reason: 'Coverage gap',
            suggestedActions: []
          }],
          riskLevel: RiskLevel.HIGH
        },
        violations: [],
        explanation: 'Scenario 2',
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      // Mock baseline calls (2 calls per scenario)
      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValueOnce(mockPlan1) // Baseline for scenario 1
        .mockResolvedValueOnce(mockPlan1) // Modified for scenario 1
        .mockResolvedValueOnce(mockPlan1) // Baseline for scenario 2
        .mockResolvedValueOnce(mockPlan2); // Modified for scenario 2

      const comparison = await simulationService.compareScenarios(scenario1, scenario2);

      expect(comparison.scenario1.scenarioName).toBe('Scenario 1');
      expect(comparison.scenario2.scenarioName).toBe('Scenario 2');
      expect(comparison.recommendation.recommendedScenario).toBe(1);
      expect(comparison.recommendation.reason).toContain('better coverage');
      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.differences.some(diff => diff.metric === 'coverage')).toBe(true);
    });
  });

  describe('calculateRiskAssessment', () => {
    it('should calculate low risk for good coverage', () => {
      const coverage: CoverageReport = {
        dateRange,
        totalDemands: 10,
        filledDemands: 10,
        coveragePercentage: 100,
        stationCoverage: [],
        gaps: [],
        trends: []
      };

      const scenario: WhatIfScenario = {
        name: 'Test',
        baseDate,
        modifications: []
      };

      const risk = simulationService.calculateRiskAssessment(coverage, scenario);

      expect(risk.riskLevel).toBe(RiskLevel.LOW);
      expect(risk.riskScore).toBeLessThan(30);
      expect(risk.criticalFactors).toHaveLength(0);
    });

    it('should calculate high risk for poor coverage with critical gaps', () => {
      const coverage: CoverageReport = {
        dateRange,
        totalDemands: 10,
        filledDemands: 6,
        coveragePercentage: 60,
        stationCoverage: [],
        gaps: [
          {
            demandId: 'demand-1',
            stationName: 'Station A',
            date: baseDate,
            shiftTime: '08:00-16:00',
            criticality: 'critical',
            reason: 'No coverage',
            suggestedActions: []
          },
          {
            demandId: 'demand-2',
            stationName: 'Station B',
            date: baseDate,
            shiftTime: '16:00-00:00',
            criticality: 'critical',
            reason: 'No coverage',
            suggestedActions: []
          }
        ],
        trends: []
      };

      const scenario: WhatIfScenario = {
        name: 'Test',
        baseDate,
        modifications: []
      };

      const risk = simulationService.calculateRiskAssessment(coverage, scenario);

      expect(risk.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(risk.riskScore).toBeGreaterThan(80);
      expect(risk.criticalFactors).toContain('Low overall coverage percentage');
      expect(risk.criticalFactors).toContain('2 critical coverage gaps');
      expect(risk.mitigationStrategies).toContain('Implement overtime policies for critical periods');
    });

    it('should calculate medium risk for moderate coverage', () => {
      const coverage: CoverageReport = {
        dateRange,
        totalDemands: 10,
        filledDemands: 9,
        coveragePercentage: 90,
        stationCoverage: [],
        gaps: [{
          demandId: 'demand-1',
          stationName: 'Station A',
          date: baseDate,
          shiftTime: '08:00-16:00',
          criticality: 'medium',
          reason: 'Limited options',
          suggestedActions: []
        }],
        trends: []
      };

      const scenario: WhatIfScenario = {
        name: 'Test',
        baseDate,
        modifications: []
      };

      const risk = simulationService.calculateRiskAssessment(coverage, scenario);

      expect(risk.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(risk.riskScore).toBeGreaterThan(20);
      expect(risk.riskScore).toBeLessThan(60);
    });
  });

  describe('error handling', () => {
    it('should handle invalid scenario modifications', async () => {
      const scenario: WhatIfScenario = {
        name: 'Invalid Scenario',
        baseDate,
        modifications: [{
          type: 'add_absence',
          entityId: '', // Invalid empty ID
          parameters: {}
        }]
      };

      vi.mocked(mockPlanningService.generatePlan)
        .mockResolvedValue({
          id: 'plan',
          assignments: [],
          coverageStatus: {
            totalDemands: 0,
            filledDemands: 0,
            coveragePercentage: 0,
            gaps: [],
            riskLevel: RiskLevel.LOW
          },
          violations: [],
          explanation: 'Empty plan',
          generatedAt: new Date(),
          generatedBy: 'system'
        });

      // Should not throw but handle gracefully
      const result = await simulationService.simulateScenario(scenario);
      expect(result).toBeDefined();
    });
  });
});