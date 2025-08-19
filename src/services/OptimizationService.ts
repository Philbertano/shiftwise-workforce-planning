import {
  Employee,
  ShiftDemand,
  Station,
  ShiftTemplate,
  EmployeeSkill,
  Priority,
  RiskLevel
} from '../types/index.js';
import { Assignment } from '../models/Assignment.js';
import {
  SchedulingProblem,
  ScoringContext,
  EmployeeWorkload,
  StationHistory,
  CoverageGap,
  ImpactAnalysis,
  RecommendedAction
} from './interfaces.js';
import { ConstraintManager } from '../constraints/ConstraintManager.js';
import { ValidationContext } from '../constraints/base/ValidationContext.js';

/**
 * Service for optimizing assignments and analyzing coverage gaps
 */
export class OptimizationService {
  private constraintManager: ConstraintManager;

  constructor(constraintManager: ConstraintManager) {
    this.constraintManager = constraintManager;
  }

  /**
   * Optimize assignments through beneficial swaps
   */
  async optimizeAssignments(
    assignments: Assignment[],
    problem: SchedulingProblem,
    maxIterations: number = 100
  ): Promise<Assignment[]> {
    let currentAssignments = [...assignments];
    let improved = true;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Try all possible swaps
      for (let i = 0; i < currentAssignments.length; i++) {
        for (let j = i + 1; j < currentAssignments.length; j++) {
          const swappedAssignments = this.trySwap(currentAssignments, i, j, problem);
          
          if (swappedAssignments && this.isBetterSolution(swappedAssignments, currentAssignments, problem)) {
            currentAssignments = swappedAssignments;
            improved = true;
            break;
          }
        }
        
        if (improved) break;
      }

      // Try reassignments to better candidates
      for (let i = 0; i < currentAssignments.length; i++) {
        const betterAssignment = await this.findBetterCandidate(
          currentAssignments[i],
          currentAssignments,
          problem
        );
        
        if (betterAssignment) {
          currentAssignments[i] = betterAssignment;
          improved = true;
          break;
        }
      }
    }

    return currentAssignments;
  }

  /**
   * Identify and analyze coverage gaps
   */
  identifyGaps(
    assignments: Assignment[],
    demands: ShiftDemand[],
    problem: SchedulingProblem
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];
    const assignedDemandIds = new Set(assignments.map(a => a.demandId));

    for (const demand of demands) {
      if (!assignedDemandIds.has(demand.id)) {
        const station = problem.context.stations.find(s => s.id === demand.stationId);
        const shiftTemplate = problem.context.shiftTemplates.find(st => st.id === demand.shiftTemplateId);
        
        const gap: CoverageGap = {
          demandId: demand.id,
          stationName: station?.name || 'Unknown Station',
          shiftTime: shiftTemplate ? `${shiftTemplate.startTime}-${shiftTemplate.endTime}` : 'Unknown Time',
          criticality: demand.priority,
          reason: this.analyzeGapReason(demand, problem),
          suggestedActions: this.generateGapSuggestions(demand, problem)
        };

        gaps.push(gap);
      }
    }

    return this.rankGapsByCriticality(gaps);
  }

  /**
   * Calculate coverage statistics and risk assessment
   */
  calculateCoverageAnalysis(
    assignments: Assignment[],
    demands: ShiftDemand[],
    problem: SchedulingProblem
  ): {
    coveragePercentage: number;
    riskLevel: RiskLevel;
    gaps: CoverageGap[];
    impactAnalysis: ImpactAnalysis;
  } {
    const gaps = this.identifyGaps(assignments, demands, problem);
    const coveragePercentage = demands.length > 0 ? 
      ((demands.length - gaps.length) / demands.length) * 100 : 0;
    
    const riskLevel = this.calculateRiskLevel(coveragePercentage, gaps);
    const impactAnalysis = this.analyzeImpact(gaps, problem);

    return {
      coveragePercentage,
      riskLevel,
      gaps,
      impactAnalysis
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(
    assignments: Assignment[],
    problem: SchedulingProblem
  ): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];
    const gaps = this.identifyGaps(assignments, problem.demands, problem);
    
    // Analyze workload distribution
    const workloadAnalysis = this.analyzeWorkloadDistribution(assignments, problem);
    if (workloadAnalysis.unfairDistribution) {
      recommendations.push({
        type: 'schedule_adjustment',
        description: 'Redistribute workload to improve fairness across employees',
        priority: 'medium',
        timeframe: 'immediate'
      });
    }

    // Analyze skill gaps
    const skillGaps = this.analyzeSkillGaps(gaps, problem);
    if (skillGaps.length > 0) {
      recommendations.push({
        type: 'skill_training',
        description: `Provide training for skills: ${skillGaps.join(', ')}`,
        priority: 'high',
        timeframe: '2-4 weeks'
      });
    }

    // Analyze critical gaps
    const criticalGaps = gaps.filter(g => g.criticality === Priority.CRITICAL);
    if (criticalGaps.length > 0) {
      recommendations.push({
        type: 'hire_temp',
        description: `Hire temporary staff for ${criticalGaps.length} critical positions`,
        priority: 'critical',
        estimatedCost: criticalGaps.length * 200, // $200 per temp per day
        timeframe: 'immediate'
      });
    }

    // Analyze overtime needs
    const overtimeNeeds = this.analyzeOvertimeNeeds(assignments, gaps, problem);
    if (overtimeNeeds.required) {
      recommendations.push({
        type: 'overtime_approval',
        description: `Approve overtime for ${overtimeNeeds.employeeCount} employees`,
        priority: 'high',
        estimatedCost: overtimeNeeds.estimatedCost,
        timeframe: 'immediate'
      });
    }

    return recommendations.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  /**
   * Try swapping two assignments
   */
  private trySwap(
    assignments: Assignment[],
    index1: number,
    index2: number,
    problem: SchedulingProblem
  ): Assignment[] | null {
    const swapped = [...assignments];
    const assignment1 = swapped[index1];
    const assignment2 = swapped[index2];

    // Create swapped assignments as proper Assignment instances
    const newAssignment1 = new Assignment({
      id: assignment1.id,
      demandId: assignment1.demandId,
      employeeId: assignment2.employeeId,
      status: assignment1.status,
      score: assignment1.score,
      explanation: assignment1.explanation,
      createdAt: assignment1.createdAt,
      createdBy: assignment1.createdBy
    });
    
    const newAssignment2 = new Assignment({
      id: assignment2.id,
      demandId: assignment2.demandId,
      employeeId: assignment1.employeeId,
      status: assignment2.status,
      score: assignment2.score,
      explanation: assignment2.explanation,
      createdAt: assignment2.createdAt,
      createdBy: assignment2.createdBy
    });

    swapped[index1] = newAssignment1;
    swapped[index2] = newAssignment2;

    // Validate the swap
    const validationContext = new ValidationContext({
      employees: problem.employees,
      assignments: swapped,
      demands: problem.demands,
      absences: problem.context.absences,
      stations: problem.context.stations,
      shiftTemplates: problem.context.shiftTemplates,
      employeeSkills: problem.context.employeeSkills,
      date: new Date()
    });

    const violations = this.constraintManager.validateAssignments(swapped, validationContext);
    const hardViolations = violations.filter(v => v.isBlocking());

    // Only return swap if it doesn't create hard violations
    return hardViolations.length === 0 ? swapped : null;
  }

  /**
   * Check if one solution is better than another
   */
  private isBetterSolution(
    solution1: Assignment[],
    solution2: Assignment[],
    problem: SchedulingProblem
  ): boolean {
    const score1 = this.calculateSolutionScore(solution1, problem);
    const score2 = this.calculateSolutionScore(solution2, problem);
    
    return score1 > score2;
  }

  /**
   * Find a better candidate for an assignment
   */
  private async findBetterCandidate(
    assignment: Assignment,
    allAssignments: Assignment[],
    problem: SchedulingProblem
  ): Promise<Assignment | null> {
    const demand = problem.demands.find(d => d.id === assignment.demandId);
    if (!demand) return null;

    const currentEmployee = problem.employees.find(e => e.id === assignment.employeeId);
    if (!currentEmployee) return null;

    // Find alternative candidates
    const alternatives = this.findAlternativeCandidates(demand, problem, allAssignments);
    
    for (const alternative of alternatives) {
      const testAssignment = new Assignment({
        id: assignment.id,
        demandId: assignment.demandId,
        employeeId: alternative.id,
        status: assignment.status,
        score: assignment.score,
        explanation: assignment.explanation,
        createdAt: assignment.createdAt,
        createdBy: assignment.createdBy
      });
      const testAssignments = allAssignments.map(a => 
        a.id === assignment.id ? testAssignment : a
      );

      // Check if this alternative is better
      if (this.isBetterSolution(testAssignments, allAssignments, problem)) {
        return testAssignment;
      }
    }

    return null;
  }

  /**
   * Find alternative candidates for a demand
   */
  private findAlternativeCandidates(
    demand: ShiftDemand,
    problem: SchedulingProblem,
    existingAssignments: Assignment[]
  ): Employee[] {
    const station = problem.context.stations.find(s => s.id === demand.stationId);
    if (!station) return [];

    const candidates: Employee[] = [];
    const assignedEmployeeIds = new Set(existingAssignments.map(a => a.employeeId));

    for (const employee of problem.employees) {
      if (!employee.active || assignedEmployeeIds.has(employee.id)) continue;

      // Check skill requirements
      if (this.hasRequiredSkills(employee, station, problem.context.employeeSkills)) {
        candidates.push(employee);
      }
    }

    return candidates;
  }

  /**
   * Check if employee has required skills
   */
  private hasRequiredSkills(
    employee: Employee,
    station: Station,
    employeeSkills: EmployeeSkill[]
  ): boolean {
    const empSkills = employeeSkills.filter(s => s.employeeId === employee.id);
    
    for (const requiredSkill of station.requiredSkills) {
      if (!requiredSkill.mandatory) continue;
      
      const empSkill = empSkills.find(s => s.skillId === requiredSkill.skillId);
      if (!empSkill || empSkill.level < requiredSkill.minLevel) {
        return false;
      }
      
      // Check if skill is expired
      if (empSkill.validUntil && empSkill.validUntil < new Date()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Analyze the reason for a coverage gap
   */
  private analyzeGapReason(demand: ShiftDemand, problem: SchedulingProblem): string {
    const station = problem.context.stations.find(s => s.id === demand.stationId);
    if (!station) return 'Station not found';

    // Check if any employees have the required skills
    const qualifiedEmployees = problem.employees.filter(emp => 
      emp.active && this.hasRequiredSkills(emp, station, problem.context.employeeSkills)
    );

    if (qualifiedEmployees.length === 0) {
      return 'No employees with required skills available';
    }

    // Check if qualified employees are on absence
    const availableEmployees = qualifiedEmployees.filter(emp => {
      const absences = problem.context.absences.filter(a => 
        a.employeeId === emp.id && 
        a.approved &&
        demand.date >= a.dateStart && 
        demand.date <= a.dateEnd
      );
      return absences.length === 0;
    });

    if (availableEmployees.length === 0) {
      return 'All qualified employees are on leave';
    }

    return 'Workload constraints prevent assignment';
  }

  /**
   * Generate suggestions for addressing gaps
   */
  private generateGapSuggestions(demand: ShiftDemand, problem: SchedulingProblem): string[] {
    const suggestions: string[] = [];
    const station = problem.context.stations.find(s => s.id === demand.stationId);
    
    if (!station) {
      suggestions.push('Review station configuration');
      return suggestions;
    }

    const reason = this.analyzeGapReason(demand, problem);
    
    if (reason.includes('No employees with required skills')) {
      suggestions.push('Provide skill training to existing employees');
      suggestions.push('Hire employees with required qualifications');
      suggestions.push('Review skill requirements for the station');
    } else if (reason.includes('on leave')) {
      suggestions.push('Approve overtime for available employees');
      suggestions.push('Hire temporary staff');
      suggestions.push('Reschedule non-critical absences');
    } else if (reason.includes('Workload constraints')) {
      suggestions.push('Approve overtime hours');
      suggestions.push('Redistribute workload across shifts');
      suggestions.push('Consider part-time or temporary staff');
    }

    // Add priority-specific suggestions
    if (demand.priority === Priority.CRITICAL) {
      suggestions.unshift('Escalate to management immediately');
    }

    return suggestions;
  }

  /**
   * Rank gaps by criticality and business impact
   */
  private rankGapsByCriticality(gaps: CoverageGap[]): CoverageGap[] {
    const priorityOrder = {
      [Priority.CRITICAL]: 4,
      [Priority.HIGH]: 3,
      [Priority.MEDIUM]: 2,
      [Priority.LOW]: 1
    };

    return gaps.sort((a, b) => {
      const priorityDiff = priorityOrder[b.criticality] - priorityOrder[a.criticality];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by station name for consistency
      return a.stationName.localeCompare(b.stationName);
    });
  }

  /**
   * Calculate risk level based on coverage and gaps
   */
  private calculateRiskLevel(coveragePercentage: number, gaps: CoverageGap[]): RiskLevel {
    // Special case: no gaps means no risk, regardless of coverage percentage
    if (gaps.length === 0) return RiskLevel.LOW;
    
    const criticalGaps = gaps.filter(g => g.criticality === Priority.CRITICAL).length;
    if (criticalGaps > 0) return RiskLevel.CRITICAL;
    
    if (coveragePercentage >= 100) return RiskLevel.LOW;
    if (coveragePercentage >= 90) return RiskLevel.MEDIUM;
    
    return coveragePercentage >= 75 ? RiskLevel.HIGH : RiskLevel.CRITICAL;
  }

  /**
   * Analyze the impact of coverage gaps
   */
  private analyzeImpact(gaps: CoverageGap[], problem: SchedulingProblem): ImpactAnalysis {
    const affectedStations = [...new Set(gaps.map(g => g.stationName))];
    const coverageChange = (gaps.length / problem.demands.length) * -100;
    
    const criticalGaps = gaps.filter(g => g.criticality === Priority.CRITICAL).length;
    const highGaps = gaps.filter(g => g.criticality === Priority.HIGH).length;
    
    // Calculate risk increase based on gap criticality
    const riskIncrease = (criticalGaps * 0.4) + (highGaps * 0.2) + (gaps.length * 0.1);
    
    const recommendedActions = this.generateGapRecommendations(gaps);

    return {
      coverageChange,
      affectedStations,
      riskIncrease: Math.min(100, riskIncrease * 100), // Cap at 100%
      recommendedActions
    };
  }

  /**
   * Generate recommendations for addressing gaps
   */
  private generateGapRecommendations(gaps: CoverageGap[]): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];
    
    const criticalGaps = gaps.filter(g => g.criticality === Priority.CRITICAL);
    const skillGaps = this.analyzeSkillGapsFromCoverageGaps(gaps);
    
    if (criticalGaps.length > 0) {
      recommendations.push({
        type: 'hire_temp',
        description: `Immediately hire ${criticalGaps.length} temporary workers for critical positions`,
        priority: 'critical',
        estimatedCost: criticalGaps.length * 200,
        timeframe: 'immediate'
      });
    }
    
    if (skillGaps.length > 0) {
      recommendations.push({
        type: 'skill_training',
        description: `Provide urgent training for: ${skillGaps.join(', ')}`,
        priority: 'high',
        timeframe: '1-2 weeks'
      });
    }
    
    if (gaps.length > criticalGaps.length) {
      recommendations.push({
        type: 'overtime_approval',
        description: 'Approve overtime to cover remaining gaps',
        priority: 'medium',
        timeframe: 'immediate'
      });
    }

    return recommendations;
  }

  /**
   * Analyze skill gaps from coverage gaps
   */
  private analyzeSkillGapsFromCoverageGaps(gaps: CoverageGap[]): string[] {
    // This is a simplified implementation
    // In practice, you'd analyze the specific skills missing for each gap
    const skillGaps = new Set<string>();
    
    gaps.forEach(gap => {
      if (gap.reason.includes('required skills')) {
        skillGaps.add('Technical Skills');
      }
    });
    
    return Array.from(skillGaps);
  }

  /**
   * Calculate solution score
   */
  private calculateSolutionScore(assignments: Assignment[], problem: SchedulingProblem): number {
    if (assignments.length === 0) return 0;
    
    const totalScore = assignments.reduce((sum, assignment) => sum + assignment.score, 0);
    const averageScore = totalScore / assignments.length;
    
    // Apply coverage bonus
    const coverageRatio = assignments.length / problem.demands.length;
    const coverageBonus = coverageRatio * 20;
    
    return averageScore + coverageBonus;
  }

  /**
   * Analyze workload distribution
   */
  private analyzeWorkloadDistribution(
    assignments: Assignment[],
    problem: SchedulingProblem
  ): { unfairDistribution: boolean; details: string } {
    const employeeWorkloads = new Map<string, number>();
    
    // Calculate workload for each employee
    assignments.forEach(assignment => {
      const current = employeeWorkloads.get(assignment.employeeId) || 0;
      employeeWorkloads.set(assignment.employeeId, current + 1);
    });
    
    const workloads = Array.from(employeeWorkloads.values());
    if (workloads.length === 0) {
      return { unfairDistribution: false, details: 'No assignments to analyze' };
    }
    
    const average = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const maxDeviation = Math.max(...workloads.map(w => Math.abs(w - average)));
    
    // Consider distribution unfair if max deviation is > 50% of average
    const unfairDistribution = maxDeviation > average * 0.5;
    
    return {
      unfairDistribution,
      details: `Average workload: ${average.toFixed(1)}, Max deviation: ${maxDeviation.toFixed(1)}`
    };
  }

  /**
   * Analyze skill gaps
   */
  private analyzeSkillGaps(gaps: CoverageGap[], problem: SchedulingProblem): string[] {
    const skillGaps = new Set<string>();
    
    gaps.forEach(gap => {
      const demand = problem.demands.find(d => d.id === gap.demandId);
      if (demand) {
        const station = problem.context.stations.find(s => s.id === demand.stationId);
        if (station) {
          station.requiredSkills.forEach(skill => {
            // Check if we have enough employees with this skill
            const qualifiedEmployees = problem.employees.filter(emp => {
              const empSkills = problem.context.employeeSkills.filter(es => es.employeeId === emp.id);
              return empSkills.some(es => es.skillId === skill.skillId && es.level >= skill.minLevel);
            });
            
            if (qualifiedEmployees.length < skill.count) {
              skillGaps.add(skill.skillId);
            }
          });
        }
      }
    });
    
    return Array.from(skillGaps);
  }

  /**
   * Analyze overtime needs
   */
  private analyzeOvertimeNeeds(
    assignments: Assignment[],
    gaps: CoverageGap[],
    problem: SchedulingProblem
  ): { required: boolean; employeeCount: number; estimatedCost: number } {
    const criticalGaps = gaps.filter(g => g.criticality === Priority.CRITICAL || g.criticality === Priority.HIGH);
    
    if (criticalGaps.length === 0) {
      return { required: false, employeeCount: 0, estimatedCost: 0 };
    }
    
    // Estimate employees needed for overtime (use available employees, not current assignments)
    const availableEmployees = problem.employees.filter(e => e.active).length;
    const employeeCount = Math.min(criticalGaps.length, Math.max(1, availableEmployees));
    const estimatedCost = employeeCount * 8 * 30; // 8 hours * $30/hour overtime rate
    
    return {
      required: true,
      employeeCount,
      estimatedCost
    };
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: string): number {
    const weights = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    return weights[priority] || 0;
  }
}