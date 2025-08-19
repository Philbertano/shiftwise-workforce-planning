// Core data model interfaces for ShiftWise workforce planning system

export interface Employee {
  id: string;
  name: string;
  contractType: ContractType;
  weeklyHours: number;
  maxHoursPerDay: number;
  minRestHours: number;
  team: string;
  active: boolean;
  preferences?: EmployeePreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  levelScale: number; // 1-3
  category: SkillCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillId: string;
  level: number;
  validUntil?: Date;
  certificationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakRules: BreakRule[];
  shiftType: ShiftType;
  createdAt: Date;
  updatedAt: Date;
}

export interface Station {
  id: string;
  name: string;
  line: string;
  requiredSkills: RequiredSkill[];
  priority: Priority;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequiredSkill {
  skillId: string;
  minLevel: number;
  count: number;
  mandatory: boolean;
}

export interface ShiftDemand {
  id: string;
  date: Date;
  stationId: string;
  shiftTemplateId: string;
  requiredCount: number;
  priority: Priority;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  demandId: string;
  employeeId: string;
  status: AssignmentStatus;
  score: number;
  explanation?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  dateStart: Date;
  dateEnd: Date;
  approved: boolean;
  approvedBy?: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enums and supporting types
export enum ContractType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  TEMPORARY = 'temporary',
  CONTRACT = 'contract'
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SAFETY = 'safety',
  QUALITY = 'quality',
  LEADERSHIP = 'leadership',
  OPERATIONAL = 'operational'
}

export enum ShiftType {
  DAY = 'day',
  NIGHT = 'night',
  SWING = 'swing',
  WEEKEND = 'weekend'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AssignmentStatus {
  PROPOSED = 'proposed',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

export enum AbsenceType {
  VACATION = 'vacation',
  SICK = 'sick',
  TRAINING = 'training',
  PERSONAL = 'personal'
}

export interface EmployeePreferences {
  preferredShifts: ShiftType[];
  preferredStations: string[];
  maxConsecutiveDays?: number;
  preferredDaysOff: number[]; // 0-6, Sunday-Saturday
}

export interface BreakRule {
  duration: number; // minutes
  startAfter: number; // minutes from shift start
  paid: boolean;
}

// Constraint system interfaces
export interface Constraint {
  id: string;
  name: string;
  type: ConstraintType;
  priority: number;
  validator: ConstraintValidator;
}

export enum ConstraintType {
  HARD = 'hard',
  SOFT = 'soft'
}

export interface ConstraintValidator {
  validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[];
}

export interface ConstraintViolation {
  constraintId: string;
  severity: Severity;
  message: string;
  affectedAssignments: string[];
  suggestedActions: string[];
}

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ValidationContext {
  employees: Employee[];
  assignments: Assignment[];
  demands: ShiftDemand[];
  absences: Absence[];
  date: Date;
}

// Planning and optimization interfaces
export interface PlanGenerationRequest {
  dateRange: DateRange;
  stationIds?: string[];
  shiftTemplateIds?: string[];
  strategy?: PlanningStrategy;
  constraints?: CustomConstraint[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export enum PlanningStrategy {
  BALANCED = 'balanced',
  FAIRNESS_FIRST = 'fairness_first',
  EFFICIENCY_FIRST = 'efficiency_first',
  CONTINUITY_FIRST = 'continuity_first'
}

export interface CustomConstraint {
  name: string;
  rule: string;
  weight: number;
}

export interface PlanProposal {
  id: string;
  assignments: Assignment[];
  coverageStatus: CoverageStatus;
  violations: ConstraintViolation[];
  explanation: string;
  generatedAt: Date;
  generatedBy: string;
}

export interface CoverageStatus {
  totalDemands: number;
  filledDemands: number;
  coveragePercentage: number;
  gaps: CoverageGap[];
  riskLevel: RiskLevel;
}

export interface CoverageGap {
  demandId: string;
  stationName: string;
  shiftTime: string;
  criticality: Priority;
  reason: string;
  suggestedActions: string[];
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Audit and tracking interfaces
export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: Date;
  changes: Record<string, any>;
  metadata?: Record<string, any>;
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  COMMIT = 'commit'
}

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// User and authentication interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  HR_PLANNER = 'hr_planner',
  SHIFT_LEADER = 'shift_leader',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer'
}

export interface AuthContext {
  user: User;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  actions: string[];
}