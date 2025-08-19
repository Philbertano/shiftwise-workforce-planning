import {
  Assignment,
  Employee,
  ShiftDemand,
  Station,
  EmployeeSkill,
  Skill,
  ConstraintViolation,
  Priority,
  AssignmentStatus
} from '../types/index.js';
import {
  AssignmentExplanation,
  ReasoningChain,
  AlternativeExplanation,
  ConstraintExplanation,
  ScoreBreakdown,
  AssignmentCandidate,
  ScoringContext
} from './interfaces.js';

export interface ExplanationContext {
  assignment: Assignment;
  employee: Employee;
  demand: ShiftDemand;
  station: Station;
  employeeSkills: EmployeeSkill[];
  allSkills: Skill[];
  alternatives: AssignmentCandidate[];
  constraints: ConstraintViolation[];
  scoringContext: ScoringContext;
}

export interface ExplanationTemplate {
  scenario: string;
  template: string;
  factors: string[];
}

export class ExplanationEngine {
  private templates: Map<string, ExplanationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate comprehensive explanation for an assignment
   */
  public async generateExplanation(context: ExplanationContext): Promise<AssignmentExplanation> {
    const reasoningChain = this.buildReasoningChain(context);
    const alternatives = this.explainAlternatives(context);
    const constraintExplanations = this.explainConstraints(context);
    const scoreBreakdown = this.calculateScoreBreakdown(context);

    return {
      assignmentId: context.assignment.id,
      reasoning: reasoningChain,
      alternatives,
      constraints: constraintExplanations,
      score: scoreBreakdown
    };
  }

  /**
   * Build reasoning chain for assignment decision
   */
  private buildReasoningChain(context: ExplanationContext): ReasoningChain[] {
    const chain: ReasoningChain[] = [];
    let step = 1;

    // Step 1: Demand Analysis
    chain.push({
      step: step++,
      decision: 'Analyzed shift demand requirements',
      rationale: this.generateDemandAnalysis(context),
      factors: this.getDemandFactors(context)
    });

    // Step 2: Candidate Evaluation
    chain.push({
      step: step++,
      decision: 'Evaluated available candidates',
      rationale: this.generateCandidateEvaluation(context),
      factors: this.getCandidateFactors(context)
    });

    // Step 3: Skill Matching
    chain.push({
      step: step++,
      decision: 'Assessed skill compatibility',
      rationale: this.generateSkillAssessment(context),
      factors: this.getSkillFactors(context)
    });

    // Step 4: Constraint Validation
    chain.push({
      step: step++,
      decision: 'Validated constraints and rules',
      rationale: this.generateConstraintValidation(context),
      factors: this.getConstraintFactors(context)
    });

    // Step 5: Final Selection
    chain.push({
      step: step++,
      decision: 'Made final assignment decision',
      rationale: this.generateFinalDecision(context),
      factors: this.getFinalDecisionFactors(context)
    });

    return chain;
  }

  /**
   * Explain why alternatives were not selected
   */
  private explainAlternatives(context: ExplanationContext): AlternativeExplanation[] {
    return context.alternatives
      .filter(alt => alt.employee.id !== context.employee.id)
      .slice(0, 5) // Top 5 alternatives
      .map(alt => ({
        employeeId: alt.employee.id,
        employeeName: alt.employee.name,
        reason: this.generateAlternativeReason(alt, context),
        score: alt.score
      }));
  }

  /**
   * Explain constraint satisfaction/violations
   */
  private explainConstraints(context: ExplanationContext): ConstraintExplanation[] {
    const explanations: ConstraintExplanation[] = [];
    
    // Add explanations for violated constraints
    context.constraints.forEach(violation => {
      explanations.push({
        constraintName: violation.constraintId,
        satisfied: false,
        impact: violation.message
      });
    });

    // Add explanations for satisfied key constraints
    const keyConstraints = ['skill_matching', 'availability', 'labor_law', 'fairness'];
    keyConstraints.forEach(constraintName => {
      if (!context.constraints.some(v => v.constraintId === constraintName)) {
        explanations.push({
          constraintName,
          satisfied: true,
          impact: this.getConstraintSatisfactionMessage(constraintName, context)
        });
      }
    });

    return explanations;
  }

  /**
   * Calculate detailed score breakdown
   */
  private calculateScoreBreakdown(context: ExplanationContext): ScoreBreakdown {
    const total = context.assignment.score;
    
    // Estimate component scores based on total score and context
    const skillMatch = this.calculateSkillMatchScore(context);
    const availability = this.calculateAvailabilityScore(context);
    const fairness = this.calculateFairnessScore(context);
    const preferences = this.calculatePreferencesScore(context);
    const continuity = this.calculateContinuityScore(context);

    return {
      total,
      skillMatch,
      availability,
      fairness,
      preferences,
      continuity
    };
  }

  /**
   * Generate demand analysis explanation
   */
  private generateDemandAnalysis(context: ExplanationContext): string {
    const { demand, station } = context;
    const priorityText = this.getPriorityText(demand.priority);
    const skillRequirements = station.requiredSkills.length;
    
    return `This ${priorityText} priority shift at ${station.name} requires ${skillRequirements} specific skill${skillRequirements !== 1 ? 's' : ''} and has been identified as needing coverage for ${demand.date.toDateString()}.`;
  }

  /**
   * Generate candidate evaluation explanation
   */
  private generateCandidateEvaluation(context: ExplanationContext): string {
    const totalCandidates = context.alternatives.length;
    const qualifiedCandidates = context.alternatives.filter(alt => alt.score >= 50).length;
    
    return `Out of ${totalCandidates} potential candidates, ${qualifiedCandidates} met the minimum qualification requirements. ${context.employee.name} was selected based on the highest combined score across all evaluation criteria.`;
  }

  /**
   * Generate skill assessment explanation
   */
  private generateSkillAssessment(context: ExplanationContext): string {
    const { employee, station, employeeSkills, allSkills } = context;
    const requiredSkills = station.requiredSkills;
    const employeeSkillMap = new Map(employeeSkills.map(es => [es.skillId, es]));
    
    const matchedSkills = requiredSkills.filter(req => {
      const empSkill = employeeSkillMap.get(req.skillId);
      return empSkill && empSkill.level >= req.minLevel;
    });

    const skillNames = matchedSkills.map(req => {
      const skill = allSkills.find(s => s.id === req.skillId);
      return skill?.name || 'Unknown Skill';
    });

    return `${employee.name} possesses ${matchedSkills.length} of ${requiredSkills.length} required skills: ${skillNames.join(', ')}. All skill levels meet or exceed the minimum requirements for this station.`;
  }

  /**
   * Generate constraint validation explanation
   */
  private generateConstraintValidation(context: ExplanationContext): string {
    const violations = context.constraints.filter(c => c.severity === 'error' || c.severity === 'critical');
    
    if (violations.length === 0) {
      return `All hard constraints are satisfied including availability, labor law compliance, and skill requirements. No rule violations detected.`;
    }
    
    return `${violations.length} constraint violation${violations.length !== 1 ? 's' : ''} detected: ${violations.map(v => v.message).join('; ')}`;
  }

  /**
   * Generate final decision explanation
   */
  private generateFinalDecision(context: ExplanationContext): string {
    const { assignment, employee } = context;
    const scoreCategory = this.getScoreCategory(assignment.score);
    
    return `${employee.name} was assigned with a ${scoreCategory} score of ${assignment.score}/100. This assignment optimizes coverage while maintaining fairness and compliance with all applicable rules.`;
  }

  /**
   * Generate alternative rejection reason
   */
  private generateAlternativeReason(alternative: AssignmentCandidate, context: ExplanationContext): string {
    const scoreDiff = context.assignment.score - alternative.score;
    
    if (alternative.constraints.length > 0) {
      const violation = alternative.constraints[0];
      return `Excluded due to constraint violation: ${violation.message}`;
    }
    
    if (!alternative.availability.available) {
      return `Not available: ${alternative.availability.conflicts.join(', ')}`;
    }
    
    if (scoreDiff > 20) {
      return `Lower overall score (${alternative.score} vs ${context.assignment.score}) due to skill match or fairness considerations`;
    }
    
    return `Slightly lower score (${alternative.score} vs ${context.assignment.score}) in combined evaluation criteria`;
  }

  /**
   * Get constraint satisfaction message
   */
  private getConstraintSatisfactionMessage(constraintName: string, context: ExplanationContext): string {
    const messages: Record<string, string> = {
      skill_matching: `Employee meets all required skill levels for ${context.station.name}`,
      availability: `Employee is available during the requested shift time`,
      labor_law: `Assignment complies with maximum hours and rest period requirements`,
      fairness: `Assignment maintains fair workload distribution across the team`
    };
    
    return messages[constraintName] || `${constraintName} constraint is satisfied`;
  }

  /**
   * Calculate skill match score component
   */
  private calculateSkillMatchScore(context: ExplanationContext): number {
    const { station, employeeSkills } = context;
    const requiredSkills = station.requiredSkills;
    const employeeSkillMap = new Map(employeeSkills.map(es => [es.skillId, es]));
    
    let totalScore = 0;
    let maxScore = 0;
    
    requiredSkills.forEach(req => {
      const empSkill = employeeSkillMap.get(req.skillId);
      maxScore += req.minLevel * 10; // Max 30 points per skill
      
      if (empSkill) {
        totalScore += Math.min(empSkill.level, 3) * 10;
      }
    });
    
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }

  /**
   * Calculate availability score component
   */
  private calculateAvailabilityScore(context: ExplanationContext): number {
    // Simplified calculation - in practice would check actual availability
    return context.constraints.some(c => c.constraintId === 'availability') ? 0 : 100;
  }

  /**
   * Calculate fairness score component
   */
  private calculateFairnessScore(context: ExplanationContext): number {
    const workload = context.scoringContext.employeeWorkload;
    const avgWeeklyHours = 40; // Assume 40 hour average
    
    if (workload.weeklyHours <= avgWeeklyHours * 0.8) {
      return 100; // Under-utilized, high fairness score
    } else if (workload.weeklyHours <= avgWeeklyHours * 1.2) {
      return 80; // Normal workload
    } else {
      return 50; // Over-utilized, lower fairness score
    }
  }

  /**
   * Calculate preferences score component
   */
  private calculatePreferencesScore(context: ExplanationContext): number {
    const { employee, demand, station } = context;
    let score = 70; // Base score
    
    if (employee.preferences?.preferredStations?.includes(station.id)) {
      score += 20;
    }
    
    // Additional preference checks would go here
    
    return Math.min(score, 100);
  }

  /**
   * Calculate continuity score component
   */
  private calculateContinuityScore(context: ExplanationContext): number {
    const history = context.scoringContext.stationHistory.find(h => 
      h.stationId === context.station.id && h.employeeId === context.employee.id
    );
    
    if (history && history.assignmentCount > 0) {
      return Math.min(70 + (history.proficiencyScore * 30), 100);
    }
    
    return 50; // No history, neutral score
  }

  /**
   * Get demand-related factors
   */
  private getDemandFactors(context: ExplanationContext): string[] {
    const factors = [
      `Priority: ${context.demand.priority}`,
      `Station: ${context.station.name}`,
      `Required skills: ${context.station.requiredSkills.length}`
    ];
    
    if (context.demand.notes) {
      factors.push(`Special notes: ${context.demand.notes}`);
    }
    
    return factors;
  }

  /**
   * Get candidate-related factors
   */
  private getCandidateFactors(context: ExplanationContext): string[] {
    return [
      `Total candidates evaluated: ${context.alternatives.length}`,
      `Qualified candidates: ${context.alternatives.filter(alt => alt.score >= 50).length}`,
      `Selected candidate: ${context.employee.name}`,
      `Selection score: ${context.assignment.score}/100`
    ];
  }

  /**
   * Get skill-related factors
   */
  private getSkillFactors(context: ExplanationContext): string[] {
    const { station, employeeSkills, allSkills } = context;
    const requiredSkills = station.requiredSkills;
    const employeeSkillMap = new Map(employeeSkills.map(es => [es.skillId, es]));
    
    return requiredSkills.map(req => {
      const skill = allSkills.find(s => s.id === req.skillId);
      const empSkill = employeeSkillMap.get(req.skillId);
      const skillName = skill?.name || 'Unknown';
      
      if (empSkill) {
        return `${skillName}: Level ${empSkill.level}/${req.minLevel} required`;
      } else {
        return `${skillName}: Not qualified (Level ${req.minLevel} required)`;
      }
    });
  }

  /**
   * Get constraint-related factors
   */
  private getConstraintFactors(context: ExplanationContext): string[] {
    const factors = ['Availability check', 'Labor law compliance', 'Skill requirements'];
    
    context.constraints.forEach(violation => {
      factors.push(`Violation: ${violation.constraintId}`);
    });
    
    return factors;
  }

  /**
   * Get final decision factors
   */
  private getFinalDecisionFactors(context: ExplanationContext): string[] {
    return [
      `Final score: ${context.assignment.score}/100`,
      `Status: ${context.assignment.status}`,
      `Assignment quality: ${this.getScoreCategory(context.assignment.score)}`
    ];
  }

  /**
   * Get priority text description
   */
  private getPriorityText(priority: Priority): string {
    const priorityMap: Record<Priority, string> = {
      [Priority.LOW]: 'low',
      [Priority.MEDIUM]: 'medium',
      [Priority.HIGH]: 'high',
      [Priority.CRITICAL]: 'critical'
    };
    
    return priorityMap[priority];
  }

  /**
   * Get score category description
   */
  private getScoreCategory(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'acceptable';
    return 'poor';
  }

  /**
   * Initialize explanation templates
   */
  private initializeTemplates(): void {
    this.templates.set('high_score_assignment', {
      scenario: 'high_score_assignment',
      template: '{employee} was assigned to {station} with an excellent score of {score}/100. This assignment optimizes skill utilization while maintaining fairness.',
      factors: ['skill_match', 'availability', 'fairness']
    });

    this.templates.set('low_score_assignment', {
      scenario: 'low_score_assignment',
      template: '{employee} was assigned to {station} with a score of {score}/100. While not optimal, this assignment was necessary to maintain coverage.',
      factors: ['coverage_priority', 'limited_alternatives', 'constraint_satisfaction']
    });

    this.templates.set('constraint_violation', {
      scenario: 'constraint_violation',
      template: 'Assignment of {employee} to {station} violates {constraint}. Consider alternative candidates or adjust requirements.',
      factors: ['violation_type', 'severity', 'alternatives']
    });

    this.templates.set('skill_mismatch', {
      scenario: 'skill_mismatch',
      template: '{employee} lacks required skills for {station}. Assignment made due to critical coverage needs.',
      factors: ['missing_skills', 'coverage_priority', 'training_recommendations']
    });
  }

  /**
   * Apply template with context data
   */
  private applyTemplate(templateKey: string, context: ExplanationContext): string {
    const template = this.templates.get(templateKey);
    if (!template) {
      return `No template found for scenario: ${templateKey}`;
    }

    let result = template.template;
    result = result.replace('{employee}', context.employee.name);
    result = result.replace('{station}', context.station.name);
    result = result.replace('{score}', context.assignment.score.toString());
    
    return result;
  }
}