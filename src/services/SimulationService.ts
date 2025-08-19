import {
  WhatIfScenario,
  SimulationResult,
  ScenarioModification,
  ImpactAnalysis,
  RecommendedAction,
  CoverageReport,
  IPlanningService
} from './interfaces.js';
import {
  Employee,
  Absence,
  ShiftDemand,
  Assignment,
  DateRange,
  AbsenceType,
  Priority,
  RiskLevel,
  PlanGenerationRequest
} from '../types/index.js';
import { PlanningService } from './PlanningService.js';
import { addDays, isWithinInterval, differenceInDays } from 'date-fns';

/**
 * Service for handling what-if scenario simulations and impact analysis
 */
export class SimulationService {
  private planningService: IPlanningService;

  constructor(planningService: IPlanningService) {
    this.planningService = planningService;
  }

  /**
   * Execute a what-if scenario simulation
   */
  async simulateScenario(scenario: WhatIfScenario): Promise<SimulationResult> {
    try {
      // Get baseline coverage for comparison
      const baselineRequest: PlanGenerationRequest = {
        dateRange: this.getScenarioDateRange(scenario)
      };
      
      const baselinePlan = await this.planningService.generatePlan(baselineRequest, 'simulation');
      const originalCoverage = this.convertToSimulationCoverageReport(baselinePlan.coverageStatus, scenario.baseDate);

      // Apply scenario modifications
      const modifiedContext = await this.applyScenarioModifications(scenario);

      // Generate plan with modifications
      const modifiedRequest: PlanGenerationRequest = {
        dateRange: this.getScenarioDateRange(scenario),
        // TODO: Pass modified context through request
      };

      const modifiedPlan = await this.planningService.generatePlan(modifiedRequest, 'simulation');
      const simulatedCoverage = this.convertToSimulationCoverageReport(modifiedPlan.coverageStatus, scenario.baseDate);

      // Analyze impact
      const impactAnalysis = this.analyzeImpact(originalCoverage, simulatedCoverage, scenario);

      // Generate recommendations
      const recommendations = this.generateRecommendations(impactAnalysis, scenario);

      return {
        scenarioName: scenario.name,
        originalCoverage,
        simulatedCoverage,
        impactAnalysis,
        recommendations
      };
    } catch (error) {
      throw new Error(`Failed to simulate scenario: ${error.message}`);
    }
  }

  /**
   * Simulate temporary absence injection
   */
  async simulateAbsence(
    employeeId: string,
    dateRange: DateRange,
    absenceType: AbsenceType = AbsenceType.SICK
  ): Promise<SimulationResult> {
    const scenario: WhatIfScenario = {
      name: `Temporary ${absenceType} absence simulation`,
      baseDate: dateRange.start,
      modifications: [{
        type: 'add_absence',
        entityId: employeeId,
        parameters: {
          dateStart: dateRange.start,
          dateEnd: dateRange.end,
          type: absenceType,
          temporary: true
        }
      }]
    };

    return this.simulateScenario(scenario);
  }

  /**
   * Compare two scenarios and highlight differences
   */
  async compareScenarios(scenario1: WhatIfScenario, scenario2: WhatIfScenario): Promise<ScenarioComparison> {
    const [result1, result2] = await Promise.all([
      this.simulateScenario(scenario1),
      this.simulateScenario(scenario2)
    ]);

    return {
      scenario1: result1,
      scenario2: result2,
      differences: this.calculateScenarioDifferences(result1, result2),
      recommendation: this.recommendBetterScenario(result1, result2)
    };
  }

  /**
   * Calculate risk assessment for a scenario
   */
  calculateRiskAssessment(coverage: CoverageReport, scenario: WhatIfScenario): RiskAssessment {
    const criticalGaps = coverage.gaps.filter(gap => gap.criticality === 'critical').length;
    const highGaps = coverage.gaps.filter(gap => gap.criticality === 'high').length;
    const coveragePercentage = coverage.coveragePercentage;

    let riskLevel: RiskLevel;
    let riskScore = 0;

    // Calculate base risk from coverage
    if (coveragePercentage >= 95) {
      riskLevel = RiskLevel.LOW;
      riskScore = 10;
    } else if (coveragePercentage >= 85) {
      riskLevel = RiskLevel.MEDIUM;
      riskScore = 30;
    } else if (coveragePercentage >= 70) {
      riskLevel = RiskLevel.HIGH;
      riskScore = 60;
    } else {
      riskLevel = RiskLevel.CRITICAL;
      riskScore = 90;
    }

    // Adjust for critical gaps
    riskScore += criticalGaps * 20;
    riskScore += highGaps * 10;

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Adjust risk level based on final score
    if (riskScore >= 80) riskLevel = RiskLevel.CRITICAL;
    else if (riskScore >= 60) riskLevel = RiskLevel.HIGH;
    else if (riskScore >= 30) riskLevel = RiskLevel.MEDIUM;
    else riskLevel = RiskLevel.LOW;

    return {
      riskLevel,
      riskScore,
      criticalFactors: this.identifyCriticalFactors(coverage, scenario),
      mitigationStrategies: this.generateMitigationStrategies(coverage, scenario)
    };
  }

  /**
   * Apply scenario modifications to create modified planning context
   */
  private async applyScenarioModifications(scenario: WhatIfScenario): Promise<ModifiedPlanningContext> {
    const context: ModifiedPlanningContext = {
      temporaryAbsences: [],
      modifiedDemands: [],
      skillChanges: [],
      modifications: scenario.modifications
    };

    for (const modification of scenario.modifications) {
      switch (modification.type) {
        case 'add_absence':
          context.temporaryAbsences.push(this.createTemporaryAbsence(modification));
          break;
        case 'remove_absence':
          // Mark absence as removed (would need absence ID)
          break;
        case 'change_demand':
          context.modifiedDemands.push(this.createModifiedDemand(modification));
          break;
        case 'modify_skills':
          context.skillChanges.push(this.createSkillChange(modification));
          break;
      }
    }

    return context;
  }

  /**
   * Create temporary absence from modification
   */
  private createTemporaryAbsence(modification: ScenarioModification): Absence {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: modification.entityId,
      type: modification.parameters.type || AbsenceType.SICK,
      dateStart: new Date(modification.parameters.dateStart),
      dateEnd: new Date(modification.parameters.dateEnd),
      approved: true, // Assume approved for simulation
      reason: 'Temporary absence for simulation',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create modified demand from modification
   */
  private createModifiedDemand(modification: ScenarioModification): Partial<ShiftDemand> {
    return {
      id: modification.entityId,
      ...modification.parameters
    };
  }

  /**
   * Create skill change from modification
   */
  private createSkillChange(modification: ScenarioModification): SkillChange {
    return {
      employeeId: modification.entityId,
      skillId: modification.parameters.skillId,
      newLevel: modification.parameters.newLevel,
      validUntil: modification.parameters.validUntil ? new Date(modification.parameters.validUntil) : undefined
    };
  }

  /**
   * Analyze impact between original and simulated coverage
   */
  private analyzeImpact(
    original: CoverageReport,
    simulated: CoverageReport,
    scenario: WhatIfScenario
  ): ImpactAnalysis {
    const coverageChange = simulated.coveragePercentage - original.coveragePercentage;
    const newGaps = simulated.gaps.filter(gap => 
      !original.gaps.some(originalGap => originalGap.demandId === gap.demandId)
    );
    
    const affectedStations = [...new Set(newGaps.map(gap => gap.stationName))];
    
    // Calculate risk increase
    const originalRisk = this.calculateRiskScore(original);
    const simulatedRisk = this.calculateRiskScore(simulated);
    const riskIncrease = simulatedRisk - originalRisk;

    const recommendedActions = this.generateImpactRecommendations(
      coverageChange,
      newGaps,
      affectedStations,
      scenario
    );

    return {
      coverageChange,
      affectedStations,
      riskIncrease,
      recommendedActions
    };
  }

  /**
   * Calculate risk score from coverage report
   */
  private calculateRiskScore(coverage: CoverageReport): number {
    const criticalGaps = coverage.gaps.filter(gap => gap.criticality === 'critical').length;
    const highGaps = coverage.gaps.filter(gap => gap.criticality === 'high').length;
    
    let score = (100 - coverage.coveragePercentage) * 0.8;
    score += criticalGaps * 15;
    score += highGaps * 8;
    
    return Math.min(score, 100);
  }

  /**
   * Generate recommendations based on impact analysis
   */
  private generateRecommendations(impactAnalysis: ImpactAnalysis, scenario: WhatIfScenario): string[] {
    const recommendations: string[] = [];

    if (impactAnalysis.coverageChange < -10) {
      recommendations.push('Significant coverage reduction detected. Consider contingency planning.');
    }

    if (impactAnalysis.riskIncrease > 20) {
      recommendations.push('High risk increase identified. Immediate mitigation required.');
    }

    if (impactAnalysis.affectedStations.length > 3) {
      recommendations.push('Multiple stations affected. Consider cross-training initiatives.');
    }

    // Add specific recommendations from recommended actions
    impactAnalysis.recommendedActions.forEach(action => {
      if (action.priority === 'critical' || action.priority === 'high') {
        recommendations.push(action.description);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Scenario impact is minimal. Current staffing appears resilient.');
    }

    return recommendations;
  }

  /**
   * Generate impact-specific recommendations
   */
  private generateImpactRecommendations(
    coverageChange: number,
    newGaps: any[],
    affectedStations: string[],
    scenario: WhatIfScenario
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (coverageChange < -15) {
      actions.push({
        type: 'hire_temp',
        description: 'Consider hiring temporary staff to maintain coverage',
        priority: 'high',
        estimatedCost: 5000,
        timeframe: '1-2 weeks'
      });
    }

    if (newGaps.length > 0) {
      const criticalGaps = newGaps.filter(gap => gap.criticality === 'critical');
      if (criticalGaps.length > 0) {
        actions.push({
          type: 'overtime_approval',
          description: 'Approve overtime for critical station coverage',
          priority: 'critical',
          estimatedCost: 2000,
          timeframe: 'Immediate'
        });
      }
    }

    if (affectedStations.length > 2) {
      actions.push({
        type: 'skill_training',
        description: 'Implement cross-training program for affected stations',
        priority: 'medium',
        estimatedCost: 10000,
        timeframe: '4-6 weeks'
      });
    }

    return actions;
  }

  /**
   * Get date range for scenario simulation
   */
  private getScenarioDateRange(scenario: WhatIfScenario): DateRange {
    // Default to 7 days from base date if not specified
    return {
      start: scenario.baseDate,
      end: addDays(scenario.baseDate, 7)
    };
  }

  /**
   * Convert coverage status to simulation coverage report
   */
  private convertToSimulationCoverageReport(coverageStatus: any, baseDate: Date): CoverageReport {
    return {
      dateRange: {
        start: baseDate,
        end: addDays(baseDate, 7)
      },
      totalDemands: coverageStatus.totalDemands,
      filledDemands: coverageStatus.filledDemands,
      coveragePercentage: coverageStatus.coveragePercentage,
      stationCoverage: [], // TODO: Implement station-level coverage
      gaps: coverageStatus.gaps || [],
      trends: [] // TODO: Implement trend analysis
    };
  }

  /**
   * Calculate differences between two scenarios
   */
  private calculateScenarioDifferences(result1: SimulationResult, result2: SimulationResult): ScenarioDifference[] {
    const differences: ScenarioDifference[] = [];

    // Coverage difference
    const coverageDiff = result2.simulatedCoverage.coveragePercentage - result1.simulatedCoverage.coveragePercentage;
    if (Math.abs(coverageDiff) > 1) {
      differences.push({
        metric: 'coverage',
        value1: result1.simulatedCoverage.coveragePercentage,
        value2: result2.simulatedCoverage.coveragePercentage,
        difference: coverageDiff,
        significance: Math.abs(coverageDiff) > 10 ? 'high' : 'medium'
      });
    }

    // Risk difference
    const riskDiff = result2.impactAnalysis.riskIncrease - result1.impactAnalysis.riskIncrease;
    if (Math.abs(riskDiff) > 5) {
      differences.push({
        metric: 'risk',
        value1: result1.impactAnalysis.riskIncrease,
        value2: result2.impactAnalysis.riskIncrease,
        difference: riskDiff,
        significance: Math.abs(riskDiff) > 20 ? 'high' : 'medium'
      });
    }

    return differences;
  }

  /**
   * Recommend better scenario between two options
   */
  private recommendBetterScenario(result1: SimulationResult, result2: SimulationResult): ScenarioRecommendation {
    const score1 = this.calculateScenarioScore(result1);
    const score2 = this.calculateScenarioScore(result2);

    return {
      recommendedScenario: score1 > score2 ? 1 : 2,
      reason: score1 > score2 
        ? 'Scenario 1 provides better coverage with lower risk'
        : 'Scenario 2 provides better coverage with lower risk',
      confidenceLevel: Math.abs(score1 - score2) > 20 ? 'high' : 'medium'
    };
  }

  /**
   * Calculate overall scenario score
   */
  private calculateScenarioScore(result: SimulationResult): number {
    let score = result.simulatedCoverage.coveragePercentage;
    score -= result.impactAnalysis.riskIncrease * 0.5;
    score -= result.simulatedCoverage.gaps.filter(g => g.criticality === 'critical').length * 10;
    score -= result.simulatedCoverage.gaps.filter(g => g.criticality === 'high').length * 5;
    
    return Math.max(0, score);
  }

  /**
   * Identify critical factors affecting risk
   */
  private identifyCriticalFactors(coverage: CoverageReport, scenario: WhatIfScenario): string[] {
    const factors: string[] = [];

    if (coverage.coveragePercentage < 80) {
      factors.push('Low overall coverage percentage');
    }

    const criticalGaps = coverage.gaps.filter(gap => gap.criticality === 'critical');
    if (criticalGaps.length > 0) {
      factors.push(`${criticalGaps.length} critical coverage gaps`);
    }

    const affectedStations = [...new Set(coverage.gaps.map(gap => gap.stationName))];
    if (affectedStations.length > 3) {
      factors.push('Multiple stations affected');
    }

    return factors;
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(coverage: CoverageReport, scenario: WhatIfScenario): string[] {
    const strategies: string[] = [];

    if (coverage.coveragePercentage < 85) {
      strategies.push('Implement overtime policies for critical periods');
      strategies.push('Establish temporary staffing agreements');
    }

    const criticalGaps = coverage.gaps.filter(gap => gap.criticality === 'critical');
    if (criticalGaps.length > 0) {
      strategies.push('Cross-train employees for critical stations');
      strategies.push('Maintain on-call staff roster');
    }

    strategies.push('Regular scenario planning and contingency updates');

    return strategies;
  }
}

// Supporting interfaces
interface ModifiedPlanningContext {
  temporaryAbsences: Absence[];
  modifiedDemands: Partial<ShiftDemand>[];
  skillChanges: SkillChange[];
  modifications: ScenarioModification[];
}

interface SkillChange {
  employeeId: string;
  skillId: string;
  newLevel: number;
  validUntil?: Date;
}

interface ScenarioComparison {
  scenario1: SimulationResult;
  scenario2: SimulationResult;
  differences: ScenarioDifference[];
  recommendation: ScenarioRecommendation;
}

interface ScenarioDifference {
  metric: string;
  value1: number;
  value2: number;
  difference: number;
  significance: 'low' | 'medium' | 'high';
}

interface ScenarioRecommendation {
  recommendedScenario: 1 | 2;
  reason: string;
  confidenceLevel: 'low' | 'medium' | 'high';
}

interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number;
  criticalFactors: string[];
  mitigationStrategies: string[];
}