import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizationService } from '../../services/OptimizationService.js';
import { ConstraintManager } from '../../constraints/ConstraintManager.js';
import {
  SchedulingProblem,
  CoverageGap,
  ImpactAnalysis,
  RecommendedAction
} from '../../services/interfaces.js';
import {
  Employee,
  ShiftDemand,
  Station,
  ShiftTemplate,
  EmployeeSkill,
  Absence,
  ContractType,
  Priority,
  ShiftType,
  SkillCategory,
  AssignmentStatus,
  AbsenceType,
  RiskLevel
} from '../../types/index.js';
import { Assignment } from '../../models/Assignment.js';

describe('OptimizationService', () => {
  let optimizationService: OptimizationService;
  let constraintManager: ConstraintManager;
  let mockProblem: SchedulingProblem;
  let mockAssignments: Assignment[];

  beforeEach(() => {
    constraintManager = new ConstraintManager([]);
    optimizationService = new OptimizationService(constraintManager);

    // Setup mock data
    const mockEmployees: Employee[] = [
      {
        id: 'emp1',
        name: 'John Doe',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'A',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'emp2',
        name: 'Jane Smith',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'B',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockStations: Station[] = [
      {
        id: 'station1',
        name: 'Assembly Line 1',
        line: 'Production',
        requiredSkills: [
          { skillId: 'skill1', minLevel: 2, count: 1, mandatory: true }
        ],
        priority: Priority.HIGH,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'station2',
        name: 'Quality Control',
        line: 'QC',
        requiredSkills: [
          { skillId: 'skill2', minLevel: 3, count: 1, mandatory: true }
        ],
        priority: Priority.CRITICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockShiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift1',
        name: 'Day Shift',
        startTime: '08:00',
        endTime: '16:00',
        breakRules: [],
        shiftType: ShiftType.DAY,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockEmployeeSkills: EmployeeSkill[] = [
      {
        id: 'empskill1',
        employeeId: 'emp1',
        skillId: 'skill1',
        level: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'empskill2',
        employeeId: 'emp2',
        skillId: 'skill2',
        level: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mockDemands: ShiftDemand[] = [
      {
        id: 'demand1',
        date: tomorrow,
        stationId: 'station1',
        shiftTemplateId: 'shift1',
        requiredCount: 1,
        priority: Priority.HIGH,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'demand2',
        date: tomorrow,
        stationId: 'station2',
        shiftTemplateId: 'shift1',
        requiredCount: 1,
        priority: Priority.CRITICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'demand3',
        date: tomorrow,
        stationId: 'station1',
        shiftTemplateId: 'shift1',
        requiredCount: 1,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockProblem = {
      demands: mockDemands,
      employees: mockEmployees,
      constraints: [],
      objectives: [],
      context: {
        dateRange: { start: tomorrow, end: tomorrow },
        existingAssignments: [],
        absences: [],
        employeeSkills: mockEmployeeSkills,
        stations: mockStations,
        shiftTemplates: mockShiftTemplates
      }
    };

    mockAssignments = [
      new Assignment({
        id: 'assignment1',
        demandId: 'demand1',
        employeeId: 'emp1',
        status: AssignmentStatus.PROPOSED,
        score: 85,
        createdBy: 'system'
      }),
      new Assignment({
        id: 'assignment2',
        demandId: 'demand2',
        employeeId: 'emp2',
        status: AssignmentStatus.PROPOSED,
        score: 90,
        createdBy: 'system'
      })
    ];
  });

  describe('optimizeAssignments', () => {
    it('should optimize assignments through beneficial swaps', async () => {
      const result = await optimizationService.optimizeAssignments(
        mockAssignments,
        mockProblem,
        10
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(mockAssignments.length);
      
      // Assignments should maintain their structure
      result.forEach(assignment => {
        expect(assignment.id).toBeDefined();
        expect(assignment.demandId).toBeDefined();
        expect(assignment.employeeId).toBeDefined();
        expect(assignment.status).toBe(AssignmentStatus.PROPOSED);
      });
    });

    it('should handle empty assignments list', async () => {
      const result = await optimizationService.optimizeAssignments(
        [],
        mockProblem,
        10
      );

      expect(result).toEqual([]);
    });

    it('should handle single assignment', async () => {
      const singleAssignment = [mockAssignments[0]];
      const result = await optimizationService.optimizeAssignments(
        singleAssignment,
        mockProblem,
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(singleAssignment[0]);
    });

    it('should respect max iterations limit', async () => {
      const startTime = Date.now();
      await optimizationService.optimizeAssignments(
        mockAssignments,
        mockProblem,
        5 // Low iteration limit
      );
      const executionTime = Date.now() - startTime;

      // Should complete quickly with low iteration limit
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('identifyGaps', () => {
    it('should identify coverage gaps correctly', () => {
      // Only assign to demand1, leaving demand2 and demand3 as gaps
      const partialAssignments = [mockAssignments[0]];
      
      const gaps = optimizationService.identifyGaps(
        partialAssignments,
        mockProblem.demands,
        mockProblem
      );

      expect(gaps).toHaveLength(2);
      expect(gaps.map(g => g.demandId)).toContain('demand2');
      expect(gaps.map(g => g.demandId)).toContain('demand3');
      
      // Should be ranked by criticality (CRITICAL first)
      expect(gaps[0].criticality).toBe(Priority.CRITICAL);
      expect(gaps[1].criticality).toBe(Priority.MEDIUM);
    });

    it('should return empty array when all demands are covered', () => {
      const gaps = optimizationService.identifyGaps(
        mockAssignments,
        mockProblem.demands.slice(0, 2), // Only first 2 demands
        mockProblem
      );

      expect(gaps).toHaveLength(0);
    });

    it('should include station and shift information in gaps', () => {
      const partialAssignments = [mockAssignments[0]];
      
      const gaps = optimizationService.identifyGaps(
        partialAssignments,
        mockProblem.demands,
        mockProblem
      );

      gaps.forEach(gap => {
        expect(gap.stationName).toBeDefined();
        expect(gap.shiftTime).toBeDefined();
        expect(gap.reason).toBeDefined();
        expect(Array.isArray(gap.suggestedActions)).toBe(true);
        expect(gap.suggestedActions.length).toBeGreaterThan(0);
      });
    });

    it('should rank gaps by criticality correctly', () => {
      const mixedDemands = [
        { ...mockProblem.demands[0], priority: Priority.LOW },
        { ...mockProblem.demands[1], priority: Priority.CRITICAL },
        { ...mockProblem.demands[2], priority: Priority.HIGH }
      ];

      const gaps = optimizationService.identifyGaps(
        [], // No assignments
        mixedDemands,
        mockProblem
      );

      expect(gaps).toHaveLength(3);
      expect(gaps[0].criticality).toBe(Priority.CRITICAL);
      expect(gaps[1].criticality).toBe(Priority.HIGH);
      expect(gaps[2].criticality).toBe(Priority.LOW);
    });
  });

  describe('calculateCoverageAnalysis', () => {
    it('should calculate coverage analysis correctly', () => {
      const analysis = optimizationService.calculateCoverageAnalysis(
        mockAssignments,
        mockProblem.demands,
        mockProblem
      );

      expect(analysis.coveragePercentage).toBeCloseTo(66.67, 1); // 2 out of 3 demands covered
      expect(analysis.riskLevel).toBeDefined();
      expect(Object.values(RiskLevel)).toContain(analysis.riskLevel);
      expect(Array.isArray(analysis.gaps)).toBe(true);
      expect(analysis.gaps).toHaveLength(1); // One uncovered demand
      expect(analysis.impactAnalysis).toBeDefined();
    });

    it('should return 100% coverage when all demands are met', () => {
      const allAssignments = [
        ...mockAssignments,
        new Assignment({
          id: 'assignment3',
          demandId: 'demand3',
          employeeId: 'emp1',
          status: AssignmentStatus.PROPOSED,
          score: 80,
          createdBy: 'system'
        })
      ];

      const analysis = optimizationService.calculateCoverageAnalysis(
        allAssignments,
        mockProblem.demands,
        mockProblem
      );

      expect(analysis.coveragePercentage).toBe(100);
      expect(analysis.gaps).toHaveLength(0);
      expect(analysis.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should handle empty demands list', () => {
      const analysis = optimizationService.calculateCoverageAnalysis(
        [],
        [],
        mockProblem
      );

      expect(analysis.coveragePercentage).toBe(0);
      expect(analysis.gaps).toHaveLength(0);
      expect(analysis.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should calculate risk level based on critical gaps', () => {
      const criticalDemands = mockProblem.demands.map(d => ({
        ...d,
        priority: Priority.CRITICAL
      }));

      const analysis = optimizationService.calculateCoverageAnalysis(
        [], // No assignments
        criticalDemands,
        mockProblem
      );

      expect(analysis.riskLevel).toBe(RiskLevel.CRITICAL);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate recommendations for coverage gaps', () => {
      const partialAssignments = [mockAssignments[0]]; // Only one assignment
      
      const recommendations = optimizationService.generateOptimizationRecommendations(
        partialAssignments,
        mockProblem
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(rec.type).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.priority).toBeDefined();
        expect(rec.timeframe).toBeDefined();
        expect(['hire_temp', 'skill_training', 'overtime_approval', 'schedule_adjustment']).toContain(rec.type);
      });
    });

    it('should prioritize critical recommendations first', () => {
      const recommendations = optimizationService.generateOptimizationRecommendations(
        [], // No assignments - all gaps
        mockProblem
      );

      if (recommendations.length > 1) {
        // Should be sorted by priority (critical first)
        const priorities = recommendations.map(r => r.priority);
        const criticalIndex = priorities.indexOf('critical');
        const highIndex = priorities.indexOf('high');
        
        if (criticalIndex !== -1 && highIndex !== -1) {
          expect(criticalIndex).toBeLessThan(highIndex);
        }
      }
    });

    it('should include cost estimates for relevant recommendations', () => {
      // Create a scenario with critical gaps to ensure cost recommendations
      const criticalProblem = {
        ...mockProblem,
        demands: mockProblem.demands.map(d => ({ ...d, priority: Priority.CRITICAL }))
      };
      
      const recommendations = optimizationService.generateOptimizationRecommendations(
        [], // No assignments - all gaps are critical
        criticalProblem
      );

      const costRecommendations = recommendations.filter(r => r.estimatedCost !== undefined);
      
      // Should have at least some recommendations
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should have at least one cost recommendation for critical gaps
      expect(costRecommendations.length).toBeGreaterThan(0);
      
      // Cost recommendations should have valid costs
      costRecommendations.forEach(rec => {
        expect(typeof rec.estimatedCost).toBe('number');
        expect(rec.estimatedCost).toBeGreaterThan(0);
      });
    });

    it('should handle fully covered scenario', () => {
      const fullAssignments = mockProblem.demands.map((demand, index) => new Assignment({
        id: `assignment${index + 1}`,
        demandId: demand.id,
        employeeId: index % 2 === 0 ? 'emp1' : 'emp2',
        status: AssignmentStatus.PROPOSED,
        score: 85,
        createdBy: 'system'
      }));

      const recommendations = optimizationService.generateOptimizationRecommendations(
        fullAssignments,
        mockProblem
      );

      // Should have fewer or no recommendations when fully covered
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('impact analysis', () => {
    it('should analyze impact of coverage gaps', () => {
      const partialAssignments = [mockAssignments[0]];
      
      const analysis = optimizationService.calculateCoverageAnalysis(
        partialAssignments,
        mockProblem.demands,
        mockProblem
      );

      expect(analysis.impactAnalysis.coverageChange).toBeLessThan(0);
      expect(Array.isArray(analysis.impactAnalysis.affectedStations)).toBe(true);
      expect(typeof analysis.impactAnalysis.riskIncrease).toBe('number');
      expect(analysis.impactAnalysis.riskIncrease).toBeGreaterThanOrEqual(0);
      expect(analysis.impactAnalysis.riskIncrease).toBeLessThanOrEqual(100);
      expect(Array.isArray(analysis.impactAnalysis.recommendedActions)).toBe(true);
    });

    it('should identify affected stations correctly', () => {
      const partialAssignments = [mockAssignments[0]]; // Only covers station1
      
      const analysis = optimizationService.calculateCoverageAnalysis(
        partialAssignments,
        mockProblem.demands,
        mockProblem
      );

      expect(analysis.impactAnalysis.affectedStations).toContain('Quality Control');
    });
  });

  describe('edge cases', () => {
    it('should handle problem with no employees', () => {
      const emptyProblem = {
        ...mockProblem,
        employees: []
      };

      const gaps = optimizationService.identifyGaps(
        [],
        mockProblem.demands,
        emptyProblem
      );

      expect(gaps).toHaveLength(mockProblem.demands.length);
      gaps.forEach(gap => {
        expect(gap.reason).toContain('No employees');
      });
    });

    it('should handle problem with no stations', () => {
      const emptyStationsProblem = {
        ...mockProblem,
        context: {
          ...mockProblem.context,
          stations: []
        }
      };

      const gaps = optimizationService.identifyGaps(
        [],
        mockProblem.demands,
        emptyStationsProblem
      );

      expect(gaps).toHaveLength(mockProblem.demands.length);
      gaps.forEach(gap => {
        expect(gap.stationName).toBe('Unknown Station');
      });
    });

    it('should handle assignments with missing demand references', () => {
      const invalidAssignments = [new Assignment({
        id: 'invalid-assignment',
        demandId: 'nonexistent-demand',
        employeeId: 'emp1',
        status: AssignmentStatus.PROPOSED,
        score: 85,
        createdBy: 'system'
      })];

      const gaps = optimizationService.identifyGaps(
        invalidAssignments,
        mockProblem.demands,
        mockProblem
      );

      // Should still identify all demands as gaps since invalid assignment doesn't match
      expect(gaps).toHaveLength(mockProblem.demands.length);
    });
  });
});