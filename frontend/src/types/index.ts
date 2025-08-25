export interface Employee {
  id: string
  name: string
  contractType: ContractType
  weeklyHours: number
  maxHoursPerDay: number
  minRestHours: number
  team: string
  active: boolean
  preferences?: EmployeePreferences
}

export interface Skill {
  id: string
  name: string
  description?: string
  levelScale: number
  category: SkillCategory
}

export interface EmployeeSkill {
  employeeId: string
  skillId: string
  level: number
  validUntil?: Date
  certificationId?: string
}

export interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  breakRules: BreakRule[]
  shiftType: ShiftType
}

export interface Station {
  id: string
  name: string
  line: string
  description?: string
  capacity?: number
  active?: boolean
  requiredSkills: RequiredSkill[]
  priority: Priority
  location?: string
  // Automotive-specific fields
  productionLineId?: string
  equipment?: Equipment[]
  safetyRequirements?: SafetyRequirement[]
}

export interface ProductionLine {
  id: string
  name: string
  type: 'assembly' | 'paint' | 'body_shop' | 'final_inspection' | 'stamping' | 'welding' | 'trim' | 'chassis'
  description?: string
  taktTime: number // seconds
  capacity: number // units per hour
  active: boolean
}

export interface Equipment {
  id: string
  name: string
  type: 'robot' | 'conveyor' | 'press' | 'welder' | 'paint_booth' | 'inspection_station' | 'assembly_fixture' | 'crane' | 'lift' | 'tool' | 'measurement_device' | 'safety_system'
  model?: string
  manufacturer?: string
  status: 'operational' | 'maintenance' | 'breakdown' | 'offline' | 'testing'
  requiredSkills: string[]
  safetyRequirements: string[]
  active: boolean
}

export interface SafetyRequirement {
  id: string
  name: string
  description: string
  category: 'ppe' | 'lockout_tagout' | 'confined_space' | 'hazmat' | 'electrical' | 'mechanical' | 'ergonomic' | 'fire_safety' | 'emergency_response'
  level: 'basic' | 'intermediate' | 'advanced' | 'expert'
  certificationRequired: boolean
  certificationValidityDays?: number
  trainingRequired: boolean
  equipmentRequired: string[]
  active: boolean
}

export interface RequiredSkill {
  skillId: string
  minLevel: number
  count: number
  mandatory: boolean
}

export interface ShiftDemand {
  id: string
  date: Date
  stationId: string
  shiftTemplateId: string
  requiredCount: number
  priority: Priority
  notes?: string
}

export interface Assignment {
  id: string
  demandId: string
  employeeId: string
  status: AssignmentStatus
  score: number
  explanation?: string
  createdAt: Date
  createdBy: string
}

export interface Absence {
  id: string
  employeeId: string
  type: AbsenceType
  dateStart: Date
  dateEnd: Date
  approved: boolean
  approvedBy?: string
  reason?: string
}

export interface ConstraintViolation {
  constraintId: string
  severity: Severity
  message: string
  affectedAssignments: string[]
  suggestedActions: string[]
}

export interface CoverageStatus {
  stationId: string
  shiftId: string
  required: number
  assigned: number
  coverage: number // percentage
  status: CoverageLevel
  gaps: Gap[]
}

export interface Gap {
  id: string
  stationId: string
  shiftId: string
  skillId: string
  count: number
  criticality: Priority
  impact: string
}

// Enums and types
export type ContractType = 'full-time' | 'part-time' | 'temporary'
export type SkillCategory = 'technical' | 'safety' | 'quality' | 'leadership'
export type ShiftType = 'day' | 'night' | 'swing'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type AssignmentStatus = 'proposed' | 'confirmed' | 'rejected'
export type AbsenceType = 'vacation' | 'sick' | 'training' | 'personal'
export type Severity = 'info' | 'warning' | 'error' | 'critical'
export type CoverageLevel = 'full' | 'partial' | 'critical'

export interface EmployeePreferences {
  preferredShifts: string[]
  preferredStations: string[]
  maxConsecutiveDays: number
}

export interface BreakRule {
  duration: number
  startTime?: string
  startAfter?: number
  paid: boolean
}

// Planning Board specific types
export interface PlanningBoardData {
  stations: Station[]
  shifts: ShiftTemplate[]
  assignments: Assignment[]
  employees: Employee[]
  coverageStatus: CoverageStatus[]
  violations: ConstraintViolation[]
}

export interface DragItem {
  type: 'assignment' | 'employee'
  id: string
  employeeId?: string
  assignmentId?: string
}

export interface DropTarget {
  stationId: string
  shiftId: string
  date: Date
}