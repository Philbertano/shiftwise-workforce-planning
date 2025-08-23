// Service interfaces for ShiftWise workforce planning system

import {
  Employee,
  Skill,
  EmployeeSkill,
  ShiftTemplate,
  Station,
  ShiftDemand,
  Assignment,
  Absence,
  PlanGenerationRequest,
  PlanProposal,
  ConstraintViolation,
  AuditLog,
  User,
  DateRange,
  ShiftStaffingRequirement,
  ShiftSkillRequirement
} from '../types';

// Planning Service Interface
export interface IPlanningService {
  generatePlan(request: PlanGenerationRequest): Promise<PlanProposal>;
  commitPlan(planId: string, assignments: Assignment[]): Promise<CommitResult>;
  simulateScenario(scenario: WhatIfScenario): Promise<SimulationResult>;
  explainAssignment(assignmentId: string): Promise<AssignmentExplanation>;
  optimizeAssignments(assignments: Assignment[], objectives: Objective[]): Promise<Assignment[]>;
}

// Qualifications Service Interface
export interface IQualificationsService {
  getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]>;
  updateEmployeeSkill(employeeSkill: EmployeeSkill): Promise<EmployeeSkill>;
  getExpiringCertifications(withinDays: number): Promise<EmployeeSkill[]>;
  validateSkillRequirements(employeeId: string, stationId: string): Promise<SkillValidationResult>;
  bulkUpdateSkills(updates: EmployeeSkillUpdate[]): Promise<EmployeeSkill[]>;
}

// Absence Service Interface
export interface IAbsenceService {
  createAbsence(absence: Omit<Absence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Absence>;
  getAbsences(employeeId: string, dateRange: DateRange): Promise<Absence[]>;
  approveAbsence(absenceId: string, approvedBy: string): Promise<Absence>;
  checkConflicts(absence: Absence): Promise<ConflictResult>;
  getAbsenceImpact(absenceId: string): Promise<AbsenceImpact>;
}

// Demand Service Interface
export interface IDemandService {
  createDemand(demand: Omit<ShiftDemand, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShiftDemand>;
  getDemands(dateRange: DateRange, stationIds?: string[]): Promise<ShiftDemand[]>;
  updateDemand(demandId: string, updates: Partial<ShiftDemand>): Promise<ShiftDemand>;
  deleteDemand(demandId: string): Promise<void>;
  calculateCoverage(dateRange: DateRange): Promise<CoverageReport>;
}

// Constraint Solver Interface
export interface IConstraintSolver {
  solve(problem: SchedulingProblem): Promise<SolutionResult>;
  validateConstraints(assignments: Assignment[]): Promise<ConstraintViolation[]>;
  scoreAssignment(assignment: Assignment, context: ScoringContext): Promise<number>;
  findAlternatives(demandId: string, excludeEmployeeIds?: string[]): Promise<AssignmentCandidate[]>;
}

// Supporting types and interfaces

export interface CommitResult {
  success: boolean;
  committedAssignments: Assignment[];
  errors: string[];
  auditLogId: string;
}

export interface WhatIfScenario {
  name: string;
  baseDate: Date;
  modifications: ScenarioModification[];
}

export interface ScenarioModification {
  type: 'add_absence' | 'remove_absence' | 'change_demand' | 'modify_skills';
  entityId: string;
  parameters: Record<string, any>;
}

export interface SimulationResult {
  scenarioName: string;
  originalCoverage: CoverageReport;
  simulatedCoverage: CoverageReport;
  impactAnalysis: ImpactAnalysis;
  recommendations: string[];
}

export interface AssignmentExplanation {
  assignmentId: string;
  reasoning: ReasoningChain[];
  alternatives: AlternativeExplanation[];
  constraints: ConstraintExplanation[];
  score: ScoreBreakdown;
}

export interface ReasoningChain {
  step: number;
  decision: string;
  rationale: string;
  factors: string[];
}

export interface AlternativeExplanation {
  employeeId: string;
  employeeName: string;
  reason: string;
  score: number;
}

export interface ConstraintExplanation {
  constraintName: string;
  satisfied: boolean;
  impact: string;
}

export interface ScoreBreakdown {
  total: number;
  skillMatch: number;
  availability: number;
  fairness: number;
  preferences: number;
  continuity: number;
}

export interface Objective {
  name: string;
  weight: number;
  type: 'maximize' | 'minimize';
  calculator: (assignments: Assignment[]) => number;
}

export interface SkillValidationResult {
  valid: boolean;
  missingSkills: RequiredSkillGap[];
  expiringSkills: EmployeeSkill[];
  recommendations: string[];
}

export interface RequiredSkillGap {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  currentLevel?: number;
  gap: number;
}

export interface EmployeeSkillUpdate {
  employeeId: string;
  skillId: string;
  level?: number;
  validUntil?: Date;
  certificationId?: string;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: AbsenceConflict[];
  affectedAssignments: Assignment[];
}

export interface AbsenceConflict {
  type: 'assignment_overlap' | 'insufficient_notice' | 'blackout_period';
  description: string;
  severity: 'warning' | 'error';
  resolution?: string;
}

export interface AbsenceImpact {
  affectedDemands: ShiftDemand[];
  coverageReduction: number;
  alternativeEmployees: Employee[];
  riskAssessment: string;
}

export interface CoverageReport {
  dateRange: DateRange;
  totalDemands: number;
  filledDemands: number;
  coveragePercentage: number;
  stationCoverage: StationCoverage[];
  gaps: CoverageGap[];
  trends: CoverageTrend[];
}

export interface StationCoverage {
  stationId: string;
  stationName: string;
  requiredCount: number;
  assignedCount: number;
  coveragePercentage: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CoverageGap {
  demandId: string;
  stationName: string;
  date: Date;
  shiftTime: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  suggestedActions: string[];
}

export interface CoverageTrend {
  date: Date;
  coveragePercentage: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface SchedulingProblem {
  demands: ShiftDemand[];
  employees: Employee[];
  constraints: Constraint[];
  objectives: Objective[];
  context: PlanningContext;
}

export interface PlanningContext {
  dateRange: DateRange;
  existingAssignments: Assignment[];
  absences: Absence[];
  employeeSkills: EmployeeSkill[];
  stations: Station[];
  shiftTemplates: ShiftTemplate[];
  staffingRequirements?: ShiftStaffingRequirement[];
  skillRequirements?: ShiftSkillRequirement[];
}

export interface SolutionResult {
  success: boolean;
  assignments: Assignment[];
  violations: ConstraintViolation[];
  score: number;
  executionTime: number;
  iterations: number;
}

export interface ScoringContext {
  employee: Employee;
  demand: ShiftDemand;
  existingAssignments: Assignment[];
  employeeWorkload: EmployeeWorkload;
  stationHistory: StationHistory[];
}

export interface EmployeeWorkload {
  employeeId: string;
  weeklyHours: number;
  consecutiveDays: number;
  lastShiftEnd?: Date;
  fairnessScore: number;
}

export interface StationHistory {
  stationId: string;
  employeeId: string;
  assignmentCount: number;
  lastAssignment?: Date;
  proficiencyScore: number;
}

export interface AssignmentCandidate {
  employee: Employee;
  score: number;
  explanation: string;
  constraints: ConstraintViolation[];
  availability: AvailabilityStatus;
}

export interface AvailabilityStatus {
  available: boolean;
  conflicts: string[];
  workloadImpact: WorkloadImpact;
}

export interface WorkloadImpact {
  currentWeeklyHours: number;
  projectedWeeklyHours: number;
  consecutiveDays: number;
  restHoursSinceLastShift?: number;
}

export interface ImpactAnalysis {
  coverageChange: number;
  affectedStations: string[];
  riskIncrease: number;
  recommendedActions: RecommendedAction[];
}

export interface RecommendedAction {
  type: 'hire_temp' | 'overtime_approval' | 'skill_training' | 'schedule_adjustment';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
  timeframe: string;
}

// Constraint system types
export interface Constraint {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  priority: number;
  validator: ConstraintValidator;
}

export interface ConstraintValidator {
  validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[];
}

export interface ValidationContext {
  employees: Employee[];
  assignments: Assignment[];
  demands: ShiftDemand[];
  absences: Absence[];
  employeeSkills: EmployeeSkill[];
  stations: Station[];
  shiftTemplates: ShiftTemplate[];
  date: Date;
}