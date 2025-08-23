import {
  IConstraintSolver,
  SchedulingProblem,
  SolutionResult,
  AssignmentCandidate,
  ScoringContext,
  EmployeeWorkload,
  StationHistory,
  AvailabilityStatus,
  WorkloadImpact
} from './interfaces.js';
import { OptimizationService } from './OptimizationService.js';
import {
  Assignment,
  Employee,
  ShiftDemand,
  Station,
  ShiftTemplate,
  EmployeeSkill,
  Absence,
  AssignmentStatus,
  Priority,
  ConstraintType
} from '../types/index.js';
import { ConstraintManager } from '../constraints/ConstraintManager.js';
import { ConstraintViolation } from '../constraints/base/ConstraintViolation.js';
import { ValidationContext } from '../constraints/base/ValidationContext.js';

/**
 * Greedy constraint solver that assigns employees to shifts using a priority-based approach
 */
export class GreedyConstraintSolver implements IConstraintSolver {
  private constraintManager: ConstraintManager;
  private optimizationService: OptimizationService;

  constructor(constraintManager: ConstraintManager) {
    this.constraintManager = constraintManager;
    this.optimizationService = new OptimizationService(constraintManager);
  }

  /**
   * Solve the scheduling problem using greedy algorithm
   */
  async solve(problem: SchedulingProblem): Promise<SolutionResult> {
    const startTime = Date.now();
    const assignments: Assignment[] = [];
    const violations: ConstraintViolation[] = [];
    let iterations = 0;

    try {
      // Phase 1: Sort demands by priority and criticality
      const sortedDemands = this.prioritizeDemands(problem.demands);
      
      // Phase 2: Greedy assignment with backtracking
      for (const demand of sortedDemands) {
        iterations++;
        
        // Find qualified candidates for this demand
        const candidates = await this.findCandidates(demand, problem, assignments);
        
        if (candidates.length === 0) {
          // No candidates available - record as gap
          continue;
        }

        // Score and sort candidates
        const scoredCandidates = await this.scoreCandidates(
          candidates,
          demand,
          problem,
          assignments
        );

        // Try to assign the best candidate
        const bestCandidate = scoredCandidates[0];
        const assignment = this.createAssignment(demand, bestCandidate);
        
        // Validate assignment against hard constraints
        const validationContext = this.createValidationContext(
          problem,
          [...assignments, assignment]
        );
        
        const assignmentViolations = this.constraintManager.validateAssignment(
          assignment,
          validationContext
        );

        // Check for hard constraint violations
        const hardViolations = assignmentViolations.filter(v => v.isBlocking());
        
        if (hardViolations.length === 0) {
          // Assignment is valid, add it
          assignments.push(assignment);
          violations.push(...assignmentViolations.filter(v => !v.isBlocking()));
        } else {
          // Try backtracking with next best candidates
          let assigned = false;
          
          for (let i = 1; i < Math.min(scoredCandidates.length, 3); i++) {
            const alternativeCandidate = scoredCandidates[i];
            const alternativeAssignment = this.createAssignment(demand, alternativeCandidate);
            
            const altValidationContext = this.createValidationContext(
              problem,
              [...assignments, alternativeAssignment]
            );
            
            const altViolations = this.constraintManager.validateAssignment(
              alternativeAssignment,
              altValidationContext
            );
            
            const altHardViolations = altViolations.filter(v => v.isBlocking());
            
            if (altHardViolations.length === 0) {
              assignments.push(alternativeAssignment);
              violations.push(...altViolations.filter(v => !v.isBlocking()));
              assigned = true;
              break;
            }
          }
          
          if (!assigned) {
            // Record hard violations for reporting
            violations.push(...hardViolations);
          }
        }
      }

      // Phase 3: Validate minimum staffing levels
      const staffingViolations = this.validateMinimumStaffing(
        assignments,
        problem.demands,
        problem.context.staffingRequirements
      );
      violations.push(...staffingViolations);

      // Phase 4: Optimization through beneficial swaps
      if (assignments.length > 1) {
        try {
          const optimizedAssignments = await this.optimizationService.optimizeAssignments(
            assignments,
            problem,
            50 // Max optimization iterations
          );
          
          // Update assignments if optimization improved the solution
          if (this.calculateSolutionScore(optimizedAssignments, problem) > 
              this.calculateSolutionScore(assignments, problem)) {
            assignments.splice(0, assignments.length, ...optimizedAssignments);
          }
        } catch (error) {
          // If optimization fails, continue with original assignments
          console.warn('Optimization failed:', error.message);
        }
      }

      const executionTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      const score = this.calculateSolutionScore(assignments, problem);

      return {
        success: true,
        assignments,
        violations,
        score,
        executionTime,
        iterations
      };
    } catch (error) {
      return {
        success: false,
        assignments,
        violations,
        score: 0,
        executionTime: Math.max(1, Date.now() - startTime), // Ensure at least 1ms
        iterations
      };
    }
  }

  /**
   * Validate assignments against all constraints
   */
  async validateConstraints(assignments: Assignment[]): Promise<ConstraintViolation[]> {
    // This would need a proper validation context
    // For now, return empty array
    return [];
  }

  /**
   * Score a single assignment
   */
  async scoreAssignment(assignment: Assignment, context: ScoringContext): Promise<number> {
    let score = 0;

    // Skill match score (0-40 points)
    score += this.calculateSkillMatchScore(context.employee, context.demand, context) * 40;

    // Availability score (0-20 points)
    score += this.calculateAvailabilityScore(context.employee, context.demand, context) * 20;

    // Fairness score (0-25 points)
    score += this.calculateFairnessScore(context.employee, context.employeeWorkload) * 25;

    // Preference score (0-10 points)
    score += this.calculatePreferenceScore(context.employee, context.demand, context) * 10;

    // Continuity score (0-5 points)
    score += this.calculateContinuityScore(context.employee, context.demand, context.stationHistory) * 5;

    return Math.round(score);
  }

  /**
   * Find alternative candidates for a demand
   */
  async findAlternatives(
    demandId: string,
    excludeEmployeeIds: string[] = []
  ): Promise<AssignmentCandidate[]> {
    // TODO: Implement alternative finding logic
    return [];
  }

  /**
   * Prioritize demands based on business rules
   */
  private prioritizeDemands(demands: ShiftDemand[]): ShiftDemand[] {
    return demands.sort((a, b) => {
      // First by priority
      const priorityOrder = {
        [Priority.CRITICAL]: 4,
        [Priority.HIGH]: 3,
        [Priority.MEDIUM]: 2,
        [Priority.LOW]: 1
      };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by date (earlier dates first)
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;

      // Finally by required count (higher counts first)
      return b.requiredCount - a.requiredCount;
    });
  }

  /**
   * Find qualified candidates for a demand
   */
  private async findCandidates(
    demand: ShiftDemand,
    problem: SchedulingProblem,
    existingAssignments: Assignment[]
  ): Promise<Employee[]> {
    const candidates: Employee[] = [];
    
    // Get station requirements
    const station = problem.context.stations.find(s => s.id === demand.stationId);
    if (!station) return candidates;

    for (const employee of problem.employees) {
      // Check if employee is active
      if (!employee.active) continue;

      // Check if employee is already assigned to this demand
      if (existingAssignments.some(a => a.demandId === demand.id && a.employeeId === employee.id)) {
        continue;
      }

      // Check availability (not on absence)
      const isAvailable = this.isEmployeeAvailable(employee, demand, problem.context.absences);
      if (!isAvailable) continue;

      // Check skill requirements
      const shiftSkillRequirements = this.getShiftSkillRequirements(
        demand,
        problem.context.staffingRequirements,
        problem.context.skillRequirements
      );
      
      const hasRequiredSkills = this.hasRequiredSkills(
        employee,
        station,
        problem.context.employeeSkills,
        shiftSkillRequirements
      );
      if (!hasRequiredSkills) continue;

      // Check workload constraints
      const workloadOk = this.checkWorkloadConstraints(
        employee,
        demand,
        existingAssignments,
        problem.context
      );
      if (!workloadOk) continue;

      candidates.push(employee);
    }

    return candidates;
  }

  /**
   * Score and sort candidates
   */
  private async scoreCandidates(
    candidates: Employee[],
    demand: ShiftDemand,
    problem: SchedulingProblem,
    existingAssignments: Assignment[]
  ): Promise<AssignmentCandidate[]> {
    const scoredCandidates: AssignmentCandidate[] = [];

    for (const employee of candidates) {
      const workload = this.calculateEmployeeWorkload(employee, existingAssignments, problem.context);
      const stationHistory = this.getStationHistory(employee, demand.stationId, existingAssignments);
      
      const scoringContext: ScoringContext = {
        employee,
        demand,
        existingAssignments,
        employeeWorkload: workload,
        stationHistory
      };

      const assignment = this.createAssignment(demand, { employee } as AssignmentCandidate);
      const score = await this.scoreAssignment(assignment, scoringContext);
      
      const availability = this.getAvailabilityStatus(employee, demand, problem.context);
      
      scoredCandidates.push({
        employee,
        score,
        explanation: this.generateCandidateExplanation(employee, demand, score),
        constraints: [], // TODO: Add constraint violations
        availability
      });
    }

    // Sort by score (highest first)
    return scoredCandidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Create an assignment from demand and candidate
   */
  private createAssignment(demand: ShiftDemand, candidate: AssignmentCandidate): Assignment {
    return {
      id: this.generateAssignmentId(),
      demandId: demand.id,
      employeeId: candidate.employee.id,
      status: AssignmentStatus.PROPOSED,
      score: candidate.score || 0,
      explanation: candidate.explanation,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date()
    };
  }

  /**
   * Create validation context for constraint checking
   */
  private createValidationContext(
    problem: SchedulingProblem,
    assignments: Assignment[]
  ): ValidationContext {
    return new ValidationContext({
      employees: problem.employees,
      assignments,
      demands: problem.demands,
      absences: problem.context.absences,
      stations: problem.context.stations,
      shiftTemplates: problem.context.shiftTemplates,
      employeeSkills: problem.context.employeeSkills,
      date: new Date()
    });
  }

  /**
   * Calculate solution score
   */
  private calculateSolutionScore(assignments: Assignment[], problem: SchedulingProblem): number {
    if (assignments.length === 0) return 0;
    
    const totalScore = assignments.reduce((sum, assignment) => sum + assignment.score, 0);
    const averageScore = totalScore / assignments.length;
    
    // Apply coverage penalty
    const coverageRatio = assignments.length / problem.demands.length;
    const coveragePenalty = Math.max(0, 1 - coverageRatio) * 50;
    
    return Math.max(0, averageScore - coveragePenalty);
  }

  /**
   * Check if employee is available for the demand
   */
  private isEmployeeAvailable(employee: Employee, demand: ShiftDemand, absences: Absence[]): boolean {
    const employeeAbsences = absences.filter(a => 
      a.employeeId === employee.id && 
      a.approved &&
      demand.date >= a.dateStart && 
      demand.date <= a.dateEnd
    );
    
    return employeeAbsences.length === 0;
  }

  /**
   * Check if employee has required skills
   */
  private hasRequiredSkills(
    employee: Employee,
    station: Station,
    employeeSkills: EmployeeSkill[],
    shiftSkillRequirements?: ShiftSkillRequirement[]
  ): boolean {
    const empSkills = employeeSkills.filter(s => s.employeeId === employee.id);
    
    // Use shift-specific skill requirements if available, otherwise fall back to station requirements
    const skillRequirements = shiftSkillRequirements || station.requiredSkills.map(rs => ({
      skillId: rs.skillId,
      minLevel: rs.minLevel,
      requiredCount: rs.count,
      mandatory: rs.mandatory
    }));
    
    // Check each required skill
    for (const requiredSkill of skillRequirements) {
      if (!requiredSkill.mandatory) continue;
      
      const empSkill = empSkills.find(s => s.skillId === requiredSkill.skillId);
      if (!empSkill) {
        return false;
      }
      
      if (empSkill.level < requiredSkill.minLevel) {
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
   * Check workload constraints
   */
  private checkWorkloadConstraints(
    employee: Employee,
    demand: ShiftDemand,
    existingAssignments: Assignment[],
    context: any
  ): boolean {
    // Check daily hours limit
    const dailyHours = this.calculateDailyHours(employee, demand, existingAssignments, context);
    if (dailyHours > employee.maxHoursPerDay) {
      return false;
    }

    // Check rest period
    const lastShiftEnd = this.getLastShiftEnd(employee, demand, existingAssignments, context);
    if (lastShiftEnd) {
      const shiftTemplate = context.shiftTemplates.find(st => st.id === demand.shiftTemplateId);
      if (shiftTemplate) {
        const shiftStart = this.parseTime(shiftTemplate.startTime);
        const restHours = (shiftStart.getTime() - lastShiftEnd.getTime()) / (1000 * 60 * 60);
        if (restHours < employee.minRestHours) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate employee workload
   */
  private calculateEmployeeWorkload(
    employee: Employee,
    existingAssignments: Assignment[],
    context: any
  ): EmployeeWorkload {
    const empAssignments = existingAssignments.filter(a => a.employeeId === employee.id);
    
    // Calculate weekly hours (simplified)
    let weeklyHours = 0;
    for (const assignment of empAssignments) {
      const demand = context.demands?.find(d => d.id === assignment.demandId);
      if (demand) {
        const shiftTemplate = context.shiftTemplates?.find(st => st.id === demand.shiftTemplateId);
        if (shiftTemplate) {
          weeklyHours += this.calculateShiftHours(shiftTemplate.startTime, shiftTemplate.endTime);
        }
      }
    }

    // Calculate consecutive days (simplified)
    const consecutiveDays = this.calculateConsecutiveDays(employee, existingAssignments, context);

    // Calculate fairness score (inverse of workload)
    const fairnessScore = Math.max(0, 100 - (weeklyHours / employee.weeklyHours) * 100);

    return {
      employeeId: employee.id,
      weeklyHours,
      consecutiveDays,
      lastShiftEnd: this.getLastShiftEnd(employee, null, existingAssignments, context),
      fairnessScore
    };
  }

  /**
   * Get station history for employee
   */
  private getStationHistory(
    employee: Employee,
    stationId: string,
    existingAssignments: Assignment[]
  ): StationHistory[] {
    // Simplified implementation
    const stationAssignments = existingAssignments.filter(a => 
      a.employeeId === employee.id
      // TODO: Filter by station through demand lookup
    );

    return [{
      stationId,
      employeeId: employee.id,
      assignmentCount: stationAssignments.length,
      lastAssignment: stationAssignments.length > 0 ? new Date() : undefined,
      proficiencyScore: Math.min(100, stationAssignments.length * 10)
    }];
  }

  /**
   * Get availability status
   */
  private getAvailabilityStatus(employee: Employee, demand: ShiftDemand, context: any): AvailabilityStatus {
    const conflicts: string[] = [];
    
    // Check for absence conflicts
    const absences = context.absences?.filter(a => 
      a.employeeId === employee.id && 
      a.approved &&
      demand.date >= a.dateStart && 
      demand.date <= a.dateEnd
    ) || [];
    
    if (absences.length > 0) {
      conflicts.push(`On ${absences[0].type} leave`);
    }

    const workloadImpact: WorkloadImpact = {
      currentWeeklyHours: 0, // TODO: Calculate actual hours
      projectedWeeklyHours: 0, // TODO: Calculate projected hours
      consecutiveDays: 0, // TODO: Calculate consecutive days
      restHoursSinceLastShift: undefined // TODO: Calculate rest hours
    };

    return {
      available: conflicts.length === 0,
      conflicts,
      workloadImpact
    };
  }

  /**
   * Generate explanation for candidate selection
   */
  private generateCandidateExplanation(employee: Employee, demand: ShiftDemand, score: number): string {
    return `${employee.name} scored ${score} points for this assignment based on skill match, availability, and fairness considerations.`;
  }

  // Scoring helper methods
  private calculateSkillMatchScore(employee: Employee, demand: ShiftDemand, context: ScoringContext): number {
    // TODO: Implement skill matching logic
    return 0.8; // Placeholder
  }

  private calculateAvailabilityScore(employee: Employee, demand: ShiftDemand, context: ScoringContext): number {
    // TODO: Implement availability scoring
    return 1.0; // Placeholder
  }

  private calculateFairnessScore(employee: Employee, workload: EmployeeWorkload): number {
    return workload.fairnessScore / 100;
  }

  private calculatePreferenceScore(employee: Employee, demand: ShiftDemand, context: ScoringContext): number {
    // TODO: Implement preference scoring
    return 0.5; // Placeholder
  }

  private calculateContinuityScore(employee: Employee, demand: ShiftDemand, stationHistory: StationHistory[]): number {
    const history = stationHistory.find(h => h.employeeId === employee.id);
    return history ? Math.min(1.0, history.proficiencyScore / 100) : 0;
  }

  // Utility methods
  private calculateDailyHours(employee: Employee, demand: ShiftDemand, assignments: Assignment[], context: any): number {
    // TODO: Implement daily hours calculation
    return 8; // Placeholder
  }

  private getLastShiftEnd(employee: Employee, demand: ShiftDemand | null, assignments: Assignment[], context: any): Date | undefined {
    // TODO: Implement last shift end calculation
    return undefined;
  }

  private calculateConsecutiveDays(employee: Employee, assignments: Assignment[], context: any): number {
    // TODO: Implement consecutive days calculation
    return 0;
  }

  private calculateShiftHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  private parseTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get shift-specific skill requirements for a demand
   */
  private getShiftSkillRequirements(
    demand: ShiftDemand,
    staffingRequirements?: ShiftStaffingRequirement[],
    skillRequirements?: ShiftSkillRequirement[]
  ): ShiftSkillRequirement[] | undefined {
    if (!staffingRequirements || !skillRequirements) {
      return undefined;
    }
    
    // Find the staffing requirement for this demand
    const staffingReq = staffingRequirements.find(sr => 
      sr.stationId === demand.stationId && 
      sr.shiftTemplateId === demand.shiftTemplateId &&
      sr.isActiveForDate(demand.date)
    );
    
    if (!staffingReq) {
      return undefined;
    }
    
    // Return skill requirements for this staffing requirement
    return skillRequirements.filter(sr => sr.staffingRequirementId === staffingReq.id);
  }

  /**
   * Check if minimum staffing levels are met
   */
  private validateMinimumStaffing(
    assignments: Assignment[],
    demands: ShiftDemand[],
    staffingRequirements?: ShiftStaffingRequirement[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    if (!staffingRequirements) {
      return violations;
    }
    
    for (const demand of demands) {
      const staffingReq = staffingRequirements.find(sr => 
        sr.stationId === demand.stationId && 
        sr.shiftTemplateId === demand.shiftTemplateId &&
        sr.isActiveForDate(demand.date)
      );
      
      if (!staffingReq) continue;
      
      const assignedCount = assignments.filter(a => a.demandId === demand.id).length;
      const gap = staffingReq.getStaffingGap(assignedCount);
      
      if (gap > 0) {
        violations.push({
          constraintId: 'minimum_staffing',
          severity: staffingReq.priority === Priority.CRITICAL ? 'critical' : 'error',
          message: `Station requires ${staffingReq.minEmployees} employees but only ${assignedCount} assigned`,
          affectedAssignments: assignments.filter(a => a.demandId === demand.id).map(a => a.id),
          suggestedActions: [
            'Assign additional qualified employees',
            'Review skill requirements',
            'Consider overtime or temporary staff'
          ]
        } as ConstraintViolation);
      }
    }
    
    return violations;
  }

  /**
   * Detect coverage gaps based on staffing requirements
   */
  private detectCoverageGaps(
    assignments: Assignment[],
    demands: ShiftDemand[],
    staffingRequirements?: ShiftStaffingRequirement[]
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];
    
    if (!staffingRequirements) {
      return gaps;
    }
    
    for (const demand of demands) {
      const staffingReq = staffingRequirements.find(sr => 
        sr.stationId === demand.stationId && 
        sr.shiftTemplateId === demand.shiftTemplateId &&
        sr.isActiveForDate(demand.date)
      );
      
      if (!staffingReq) continue;
      
      const assignedCount = assignments.filter(a => a.demandId === demand.id).length;
      const staffingStatus = staffingReq.getStaffingStatus(assignedCount);
      
      if (staffingStatus.status === 'understaffed') {
        gaps.push({
          demandId: demand.id,
          stationName: 'Unknown Station', // TODO: Get from station data
          shiftTime: 'Unknown Time', // TODO: Get from shift template
          criticality: staffingReq.priority,
          reason: staffingStatus.message,
          suggestedActions: [
            'Review employee availability',
            'Check skill requirements',
            'Consider overtime assignments',
            'Hire temporary staff if needed'
          ]
        });
      }
    }
    
    return gaps;
  }

  private generateAssignmentId(): string {
    return `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}