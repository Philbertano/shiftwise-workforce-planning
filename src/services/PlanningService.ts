import {
  IPlanningService,
  IConstraintSolver,
  SchedulingProblem,
  SolutionResult,
  AssignmentCandidate,
  ScoringContext,
  EmployeeWorkload,
  StationHistory,
  CommitResult,
  WhatIfScenario,
  SimulationResult,
  AssignmentExplanation,
  Objective
} from './interfaces.js';
import {
  PlanGenerationRequest,
  PlanProposal,
  Assignment,
  Employee,
  ShiftDemand,
  Station,
  ShiftTemplate,
  EmployeeSkill,
  Absence,
  DateRange,
  AssignmentStatus,
  Priority,
  CoverageStatus,
  CoverageGap,
  RiskLevel
} from '../types/index.js';
import { ConstraintManager } from '../constraints/ConstraintManager.js';
import { ValidationContext } from '../constraints/base/ValidationContext.js';
import { GreedyConstraintSolver } from './GreedyConstraintSolver.js';
import { OptimizationService } from './OptimizationService.js';
import { SimulationService } from './SimulationService.js';

/**
 * Core planning service that orchestrates shift scheduling and optimization
 */
export class PlanningService implements IPlanningService {
  private constraintManager: ConstraintManager;
  private solver: IConstraintSolver;
  private optimizationService: OptimizationService;
  private simulationService: SimulationService;

  constructor(constraintManager: ConstraintManager) {
    this.constraintManager = constraintManager;
    this.solver = new GreedyConstraintSolver(constraintManager);
    this.optimizationService = new OptimizationService(constraintManager);
    this.simulationService = new SimulationService(this);
  }

  /**
   * Generate a shift plan based on the request parameters
   */
  async generatePlan(request: PlanGenerationRequest, userId: string): Promise<PlanProposal> {
    const startTime = Date.now();

    try {
      // Build scheduling problem from request
      const problem = await this.buildSchedulingProblem(request);
      
      // Solve the scheduling problem
      const solution = await this.solver.solve(problem);
      
      // Calculate coverage status with detailed gap analysis
      const coverageAnalysis = this.optimizationService.calculateCoverageAnalysis(
        solution.assignments,
        problem.demands,
        problem
      );
      
      const coverageStatus: CoverageStatus = {
        totalDemands: problem.demands.length,
        filledDemands: solution.assignments.length,
        coveragePercentage: coverageAnalysis.coveragePercentage,
        gaps: coverageAnalysis.gaps,
        riskLevel: coverageAnalysis.riskLevel
      };

      // Generate explanation
      const explanation = this.generatePlanExplanation(solution, problem);

      const proposal: PlanProposal = {
        id: this.generatePlanId(),
        assignments: solution.assignments,
        coverageStatus,
        violations: solution.violations,
        explanation,
        generatedAt: new Date(),
        generatedBy: 'system' // TODO: Get from auth context
      };

      return proposal;
    } catch (error) {
      throw new Error(`Failed to generate plan: ${error.message}`);
    }
  }

  /**
   * Commit approved assignments to make them official
   */
  async commitPlan(planId: string, assignmentIds: string[] | undefined, userId: string): Promise<CommitResult> {
    // TODO: Implement plan commitment logic
    // This would involve updating assignment statuses and creating audit logs
    throw new Error('Not implemented yet');
  }

  /**
   * Simulate what-if scenarios
   */
  async simulateScenario(scenario: WhatIfScenario): Promise<SimulationResult> {
    return this.simulationService.simulateScenario(scenario);
  }

  /**
   * Explain why a specific assignment was made
   */
  async explainAssignment(assignmentId: string): Promise<AssignmentExplanation> {
    // TODO: Implement assignment explanation
    throw new Error('Not implemented yet');
  }

  /**
   * Get a plan by ID
   */
  async getPlan(planId: string): Promise<PlanProposal | null> {
    // TODO: Implement plan retrieval from storage
    // For now, return null to indicate not found
    return null;
  }

  /**
   * Get coverage status for a date range
   */
  async getCoverageStatus(params: {
    dateStart: Date;
    dateEnd: Date;
    stationIds?: string[];
  }): Promise<CoverageStatus> {
    // TODO: Implement coverage status calculation
    // For now, return a basic coverage status
    return {
      totalDemands: 0,
      filledDemands: 0,
      coveragePercentage: 0,
      gaps: [],
      riskLevel: RiskLevel.LOW
    };
  }

  /**
   * Get coverage heatmap data
   */
  async getCoverageHeatmap(params: {
    dateStart: Date;
    dateEnd: Date;
    stationIds?: string[];
  }): Promise<any> {
    // TODO: Implement heatmap data generation
    // For now, return empty heatmap data
    return {
      dates: [],
      stations: [],
      coverageMatrix: []
    };
  }

  /**
   * Get plans with filtering
   */
  async getPlans(params: {
    status?: string;
    dateStart?: Date;
    dateEnd?: Date;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlanProposal[]> {
    // TODO: Implement plan listing with filters
    // For now, return empty array
    return [];
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId: string): Promise<void> {
    // TODO: Implement plan deletion
    // For now, throw not found error
    throw new Error('Plan not found');
  }

  /**
   * Optimize existing assignments
   */
  async optimizeAssignments(assignments: Assignment[], objectives: Objective[]): Promise<Assignment[]> {
    // TODO: Implement assignment optimization
    throw new Error('Not implemented yet');
  }

  /**
   * Build a scheduling problem from the request
   */
  private async buildSchedulingProblem(request: PlanGenerationRequest): Promise<SchedulingProblem> {
    // TODO: Fetch data from repositories
    // For now, return empty problem structure
    return {
      demands: [],
      employees: [],
      constraints: this.constraintManager.getConstraints(),
      objectives: this.getDefaultObjectives(),
      context: {
        dateRange: request.dateRange,
        existingAssignments: [],
        absences: [],
        employeeSkills: [],
        stations: [],
        shiftTemplates: []
      }
    };
  }

  /**
   * Calculate coverage status for assignments
   */
  private calculateCoverageStatus(
    assignments: Assignment[],
    demands: ShiftDemand[]
  ): CoverageStatus {
    const filledDemands = new Set(assignments.map(a => a.demandId)).size;
    const totalDemands = demands.length;
    const coveragePercentage = totalDemands > 0 ? (filledDemands / totalDemands) * 100 : 0;

    const gaps: CoverageGap[] = demands
      .filter(demand => !assignments.some(a => a.demandId === demand.id))
      .map(demand => ({
        demandId: demand.id,
        stationName: 'Unknown Station', // TODO: Get from station data
        shiftTime: 'Unknown Time', // TODO: Get from shift template
        criticality: demand.priority,
        reason: 'No qualified employees available',
        suggestedActions: ['Review skill requirements', 'Consider overtime', 'Hire temporary staff']
      }));

    const riskLevel = this.calculateRiskLevel(coveragePercentage, gaps);

    return {
      totalDemands,
      filledDemands,
      coveragePercentage,
      gaps,
      riskLevel
    };
  }

  /**
   * Calculate risk level based on coverage
   */
  private calculateRiskLevel(coveragePercentage: number, gaps: CoverageGap[]): RiskLevel {
    // Check for critical gaps first - they override coverage percentage
    const criticalGaps = gaps.filter(g => g.criticality === Priority.CRITICAL).length;
    if (criticalGaps > 0) return RiskLevel.CRITICAL;
    
    // Then check coverage percentage
    if (coveragePercentage >= 100) return RiskLevel.LOW;
    if (coveragePercentage >= 90) return RiskLevel.MEDIUM;
    
    return coveragePercentage >= 75 ? RiskLevel.HIGH : RiskLevel.CRITICAL;
  }

  /**
   * Generate explanation for the plan
   */
  private generatePlanExplanation(solution: SolutionResult, problem: SchedulingProblem): string {
    const assignmentCount = solution.assignments.length;
    const demandCount = problem.demands.length;
    const violationCount = solution.violations.length;
    
    let explanation = `Generated ${assignmentCount} assignments for ${demandCount} demands`;
    
    if (violationCount > 0) {
      explanation += ` with ${violationCount} constraint violations`;
    }
    
    explanation += `. Execution time: ${solution.executionTime}ms`;
    
    return explanation;
  }

  /**
   * Get default optimization objectives
   */
  private getDefaultObjectives(): Objective[] {
    return [
      {
        name: 'fairness',
        weight: 0.3,
        type: 'maximize',
        calculator: (assignments: Assignment[]) => {
          // TODO: Implement fairness calculation
          return 0;
        }
      },
      {
        name: 'skill_match',
        weight: 0.4,
        type: 'maximize',
        calculator: (assignments: Assignment[]) => {
          // TODO: Implement skill match calculation
          return 0;
        }
      },
      {
        name: 'continuity',
        weight: 0.3,
        type: 'maximize',
        calculator: (assignments: Assignment[]) => {
          // TODO: Implement continuity calculation
          return 0;
        }
      }
    ];
  }

  /**
   * Generate unique plan ID
   */
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}