import {
  PlanGenerationRequest,
  PlanProposal,
  Assignment,
  Employee,
  DateRange,
  AbsenceType,
  WhatIfScenario,
  SimulationResult,
  AssignmentExplanation
} from '../types/index.js';
import { PlanningService } from './PlanningService.js';
import { ExplanationEngine, ExplanationContext } from './ExplanationEngine.js';
import { SimulationService } from './SimulationService.js';
import { ConstraintManager } from '../constraints/ConstraintManager.js';

/**
 * KIRO tool function parameters and results
 */
export interface GeneratePlanParams {
  dateRange: DateRange;
  stationIds?: string[];
  instructions?: string;
  constraints?: string[];
}

export interface PlanResult {
  planId: string;
  assignments: Assignment[];
  coveragePercentage: number;
  gaps: number;
  explanation: string;
  success: boolean;
  message: string;
}

export interface ExplainPlanParams {
  planId?: string;
  assignmentId?: string;
  employeeId?: string;
  stationId?: string;
}

export interface ExplainPlanResult {
  explanation: string;
  reasoning: string[];
  alternatives: string[];
  constraints: string[];
  success: boolean;
}

export interface SimulateAbsenceParams {
  employeeId: string;
  dateStart: Date;
  dateEnd: Date;
  absenceType?: AbsenceType;
}

export interface SimulateAbsenceResult {
  impactSummary: string;
  coverageChange: number;
  affectedStations: string[];
  recommendations: string[];
  riskLevel: string;
  success: boolean;
}

export interface OptimizationSuggestion {
  type: 'swap' | 'overtime' | 'training' | 'hiring';
  description: string;
  impact: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
}

/**
 * Service providing KIRO AI tool functions for natural language workforce planning
 */
export class KiroToolsService {
  private planningService: PlanningService;
  private explanationEngine: ExplanationEngine;
  private simulationService: SimulationService;
  private constraintManager: ConstraintManager;
  private planCache: Map<string, PlanProposal> = new Map();

  constructor(
    planningService: PlanningService,
    explanationEngine: ExplanationEngine,
    simulationService: SimulationService,
    constraintManager: ConstraintManager
  ) {
    this.planningService = planningService;
    this.explanationEngine = explanationEngine;
    this.simulationService = simulationService;
    this.constraintManager = constraintManager;
  }

  /**
   * Generate a shift plan based on natural language instructions
   * KIRO Tool: generatePlan
   */
  async generatePlan(params: GeneratePlanParams): Promise<PlanResult> {
    try {
      // Parse natural language instructions into planning parameters
      const request = this.parseInstructionsToRequest(params);

      // Generate the plan
      const proposal = await this.planningService.generatePlan(request, 'kiro-agent');

      // Cache the plan for later reference
      this.planCache.set(proposal.id, proposal);

      // Create user-friendly explanation
      const explanation = this.generatePlanSummary(proposal, params.instructions);

      return {
        planId: proposal.id,
        assignments: proposal.assignments,
        coveragePercentage: proposal.coverageStatus.coveragePercentage,
        gaps: proposal.coverageStatus.gaps.length,
        explanation,
        success: true,
        message: `Successfully generated plan with ${proposal.assignments.length} assignments`
      };
    } catch (error) {
      return {
        planId: '',
        assignments: [],
        coveragePercentage: 0,
        gaps: 0,
        explanation: '',
        success: false,
        message: `Failed to generate plan: ${error.message}`
      };
    }
  }

  /**
   * Explain assignment reasoning and justification
   * KIRO Tool: explainPlan
   */
  async explainPlan(params: ExplainPlanParams): Promise<ExplainPlanResult> {
    try {
      let explanation: string;
      let reasoning: string[] = [];
      let alternatives: string[] = [];
      let constraints: string[] = [];

      if (params.planId) {
        // Explain entire plan
        const plan = this.planCache.get(params.planId);
        if (!plan) {
          throw new Error('Plan not found. Please generate a plan first.');
        }

        explanation = this.generatePlanExplanation(plan);
        reasoning = this.extractPlanReasoning(plan);
        alternatives = this.generatePlanAlternatives(plan);
        constraints = this.extractPlanConstraints(plan);
      } else if (params.assignmentId) {
        // Explain specific assignment
        const assignmentExplanation = await this.explainSpecificAssignment(params.assignmentId);
        explanation = assignmentExplanation.summary;
        reasoning = assignmentExplanation.reasoning;
        alternatives = assignmentExplanation.alternatives;
        constraints = assignmentExplanation.constraints;
      } else {
        throw new Error('Either planId or assignmentId must be provided');
      }

      return {
        explanation,
        reasoning,
        alternatives,
        constraints,
        success: true
      };
    } catch (error) {
      return {
        explanation: '',
        reasoning: [],
        alternatives: [],
        constraints: [],
        success: false
      };
    }
  }

  /**
   * Simulate absence impact for what-if scenario processing
   * KIRO Tool: simulateAbsence
   */
  async simulateAbsence(params: SimulateAbsenceParams): Promise<SimulateAbsenceResult> {
    try {
      const dateRange: DateRange = {
        start: params.dateStart,
        end: params.dateEnd
      };

      const result = await this.simulationService.simulateAbsence(
        params.employeeId,
        dateRange,
        params.absenceType || AbsenceType.SICK
      );

      const impactSummary = this.generateImpactSummary(result);
      const riskLevel = this.determineRiskLevel(result);

      return {
        impactSummary,
        coverageChange: result.impactAnalysis.coverageChange,
        affectedStations: result.impactAnalysis.affectedStations,
        recommendations: result.recommendations,
        riskLevel,
        success: true
      };
    } catch (error) {
      return {
        impactSummary: '',
        coverageChange: 0,
        affectedStations: [],
        recommendations: [],
        riskLevel: 'unknown',
        success: false
      };
    }
  }

  /**
   * Generate optimization suggestions for current plans
   */
  async suggestOptimizations(planId: string): Promise<OptimizationSuggestion[]> {
    try {
      const plan = this.planCache.get(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const suggestions: OptimizationSuggestion[] = [];

      // Analyze coverage gaps
      if (plan.coverageStatus.gaps.length > 0) {
        const criticalGaps = plan.coverageStatus.gaps.filter(gap => gap.criticality === 'critical');
        
        if (criticalGaps.length > 0) {
          suggestions.push({
            type: 'overtime',
            description: `Approve overtime for ${criticalGaps.length} critical coverage gaps`,
            impact: 'Immediate coverage improvement',
            priority: 'critical',
            estimatedCost: criticalGaps.length * 200
          });
        }

        const multipleStationGaps = [...new Set(plan.coverageStatus.gaps.map(g => g.stationName))];
        if (multipleStationGaps.length > 2) {
          suggestions.push({
            type: 'training',
            description: 'Implement cross-training program for affected stations',
            impact: 'Long-term flexibility improvement',
            priority: 'medium',
            estimatedCost: 5000
          });
        }
      }

      // Analyze constraint violations
      if (plan.violations.length > 0) {
        const hardViolations = plan.violations.filter(v => v.severity === 'critical' || v.severity === 'error');
        
        if (hardViolations.length > 0) {
          suggestions.push({
            type: 'swap',
            description: 'Review and swap assignments to resolve constraint violations',
            impact: 'Compliance improvement',
            priority: 'high'
          });
        }
      }

      // Analyze fairness
      const fairnessIssues = this.analyzeFairnessIssues(plan);
      if (fairnessIssues.length > 0) {
        suggestions.push({
          type: 'swap',
          description: 'Rebalance workload distribution for better fairness',
          impact: 'Employee satisfaction improvement',
          priority: 'medium'
        });
      }

      return suggestions;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse natural language instructions into planning request
   */
  private parseInstructionsToRequest(params: GeneratePlanParams): PlanGenerationRequest {
    const request: PlanGenerationRequest = {
      dateRange: params.dateRange
    };

    if (params.stationIds && params.stationIds.length > 0) {
      request.stationIds = params.stationIds;
    }

    // Parse instructions for additional parameters
    if (params.instructions) {
      const instructions = params.instructions.toLowerCase();
      
      // Look for priority keywords
      if (instructions.includes('critical') || instructions.includes('urgent')) {
        request.strategy = 'coverage_first';
      } else if (instructions.includes('fair') || instructions.includes('balance')) {
        request.strategy = 'fairness_first';
      } else if (instructions.includes('skill') || instructions.includes('qualified')) {
        request.strategy = 'skill_match_first';
      }

      // Look for constraint keywords
      if (params.constraints) {
        request.constraints = params.constraints.map(constraint => ({
          type: 'custom',
          description: constraint,
          weight: 1.0
        }));
      }
    }

    return request;
  }

  /**
   * Generate user-friendly plan summary
   */
  private generatePlanSummary(proposal: PlanProposal, instructions?: string): string {
    const assignmentCount = proposal.assignments.length;
    const coverage = proposal.coverageStatus.coveragePercentage;
    const gaps = proposal.coverageStatus.gaps.length;
    const violations = proposal.violations.length;

    let summary = `Generated ${assignmentCount} assignments with ${coverage.toFixed(1)}% coverage`;

    if (gaps > 0) {
      summary += `, ${gaps} coverage gap${gaps !== 1 ? 's' : ''}`;
    }

    if (violations > 0) {
      summary += `, ${violations} constraint violation${violations !== 1 ? 's' : ''}`;
    }

    if (instructions) {
      summary += `. Plan optimized based on: ${instructions}`;
    }

    // Add quality assessment
    if (coverage >= 95 && violations === 0) {
      summary += ' - Excellent plan quality.';
    } else if (coverage >= 85 && violations <= 2) {
      summary += ' - Good plan quality.';
    } else if (coverage >= 70) {
      summary += ' - Acceptable plan quality with room for improvement.';
    } else {
      summary += ' - Plan requires attention due to low coverage.';
    }

    return summary;
  }

  /**
   * Generate comprehensive plan explanation
   */
  private generatePlanExplanation(plan: PlanProposal): string {
    const coverage = plan.coverageStatus.coveragePercentage;
    const assignments = plan.assignments.length;
    const gaps = plan.coverageStatus.gaps.length;
    const violations = plan.violations.length;

    let explanation = `This plan includes ${assignments} shift assignments with ${coverage.toFixed(1)}% overall coverage. `;

    if (gaps === 0) {
      explanation += 'All shift demands have been successfully filled. ';
    } else {
      explanation += `${gaps} shift${gaps !== 1 ? 's' : ''} remain unfilled due to skill or availability constraints. `;
    }

    if (violations === 0) {
      explanation += 'All assignments comply with labor laws and business rules. ';
    } else {
      explanation += `${violations} constraint violation${violations !== 1 ? 's' : ''} detected that require attention. `;
    }

    explanation += 'The plan prioritizes skill matching, availability, and fair workload distribution.';

    return explanation;
  }

  /**
   * Extract reasoning from plan
   */
  private extractPlanReasoning(plan: PlanProposal): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Evaluated ${plan.assignments.length} assignments across multiple stations`);
    reasoning.push(`Applied ${this.constraintManager.getConstraints().length} business rules and constraints`);
    reasoning.push(`Optimized for coverage, skill matching, and fairness`);

    if (plan.coverageStatus.gaps.length > 0) {
      reasoning.push(`Identified ${plan.coverageStatus.gaps.length} coverage gaps requiring attention`);
    }

    if (plan.violations.length > 0) {
      reasoning.push(`Detected ${plan.violations.length} constraint violations`);
    }

    return reasoning;
  }

  /**
   * Generate plan alternatives
   */
  private generatePlanAlternatives(plan: PlanProposal): string[] {
    const alternatives: string[] = [];

    if (plan.coverageStatus.gaps.length > 0) {
      alternatives.push('Consider overtime assignments to fill coverage gaps');
      alternatives.push('Review skill requirements and consider temporary skill waivers');
      alternatives.push('Explore cross-training opportunities for better flexibility');
    }

    if (plan.violations.length > 0) {
      alternatives.push('Adjust shift times to resolve constraint violations');
      alternatives.push('Consider splitting shifts or using part-time staff');
    }

    if (plan.coverageStatus.coveragePercentage < 90) {
      alternatives.push('Hire temporary staff for critical periods');
      alternatives.push('Implement flexible scheduling policies');
    }

    return alternatives;
  }

  /**
   * Extract constraint information from plan
   */
  private extractPlanConstraints(plan: PlanProposal): string[] {
    const constraints: string[] = [];

    constraints.push('Skill requirements must be met for all assignments');
    constraints.push('Employee availability windows are respected');
    constraints.push('Labor law compliance (max hours, rest periods)');
    constraints.push('Fair workload distribution across team members');

    plan.violations.forEach(violation => {
      constraints.push(`Violation: ${violation.message}`);
    });

    return constraints;
  }

  /**
   * Explain specific assignment
   */
  private async explainSpecificAssignment(assignmentId: string): Promise<{
    summary: string;
    reasoning: string[];
    alternatives: string[];
    constraints: string[];
  }> {
    // TODO: Implement detailed assignment explanation
    // This would require fetching assignment details and building explanation context
    
    return {
      summary: 'Assignment explanation not yet implemented',
      reasoning: ['Detailed reasoning requires assignment context'],
      alternatives: ['Alternative analysis requires candidate data'],
      constraints: ['Constraint analysis requires validation context']
    };
  }

  /**
   * Generate impact summary for simulation
   */
  private generateImpactSummary(result: SimulationResult): string {
    const coverageChange = result.impactAnalysis.coverageChange;
    const affectedStations = result.impactAnalysis.affectedStations.length;
    const riskIncrease = result.impactAnalysis.riskIncrease;

    let summary = `Absence simulation shows ${Math.abs(coverageChange).toFixed(1)}% `;
    summary += coverageChange < 0 ? 'decrease' : 'increase';
    summary += ' in coverage';

    if (affectedStations > 0) {
      summary += `, affecting ${affectedStations} station${affectedStations !== 1 ? 's' : ''}`;
    }

    if (riskIncrease > 10) {
      summary += `. Risk level increases significantly, requiring immediate attention.`;
    } else if (riskIncrease > 5) {
      summary += `. Moderate risk increase detected.`;
    } else {
      summary += `. Impact is manageable with current resources.`;
    }

    return summary;
  }

  /**
   * Determine risk level from simulation result
   */
  private determineRiskLevel(result: SimulationResult): string {
    const riskIncrease = result.impactAnalysis.riskIncrease;
    const coverageChange = Math.abs(result.impactAnalysis.coverageChange);

    if (riskIncrease > 30 || coverageChange > 20) {
      return 'critical';
    } else if (riskIncrease > 15 || coverageChange > 10) {
      return 'high';
    } else if (riskIncrease > 5 || coverageChange > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Analyze fairness issues in plan
   */
  private analyzeFairnessIssues(plan: PlanProposal): string[] {
    const issues: string[] = [];

    // TODO: Implement fairness analysis
    // This would require analyzing workload distribution across employees
    
    return issues;
  }

  /**
   * Clear plan cache (for testing or memory management)
   */
  public clearPlanCache(): void {
    this.planCache.clear();
  }

  /**
   * Get cached plan
   */
  public getCachedPlan(planId: string): PlanProposal | undefined {
    return this.planCache.get(planId);
  }
}