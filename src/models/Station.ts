import { z } from 'zod';
import { Priority, RequiredSkill, Equipment, SafetyRequirement } from '../types/index.js';

// Validation schemas
const RequiredSkillSchema = z.object({
  skillId: z.string().min(1, 'Skill ID is required'),
  minLevel: z.number().min(1, 'Minimum level must be at least 1'),
  count: z.number().min(1, 'Count must be at least 1'),
  mandatory: z.boolean()
});

const EquipmentSchema = z.object({
  id: z.string().min(1, 'Equipment ID is required'),
  name: z.string().min(1, 'Equipment name is required'),
  type: z.string().min(1, 'Equipment type is required'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  installDate: z.date().optional(),
  lastMaintenance: z.date().optional(),
  nextMaintenance: z.date().optional(),
  status: z.string().min(1, 'Equipment status is required'),
  requiredSkills: z.array(z.string()),
  safetyRequirements: z.array(z.string()),
  operatingParameters: z.record(z.any()).optional(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const SafetyRequirementSchema = z.object({
  id: z.string().min(1, 'Safety requirement ID is required'),
  name: z.string().min(1, 'Safety requirement name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  level: z.string().min(1, 'Level is required'),
  certificationRequired: z.boolean(),
  certificationValidityDays: z.number().optional(),
  trainingRequired: z.boolean(),
  equipmentRequired: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const StationSchema = z.object({
  id: z.string().min(1, 'Station ID is required'),
  name: z.string().min(1, 'Station name is required').max(100, 'Name too long'),
  line: z.string().min(1, 'Line is required').max(50, 'Line name too long'),
  requiredSkills: z.array(RequiredSkillSchema),
  priority: z.nativeEnum(Priority),
  location: z.string().max(200, 'Location too long').optional(),
  // Automotive-specific fields
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  productionLineId: z.string().optional(),
  equipment: z.array(EquipmentSchema),
  safetyRequirements: z.array(SafetyRequirementSchema),
  description: z.string().max(500, 'Description too long').optional(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class Station {
  public readonly id: string;
  public readonly name: string;
  public readonly line: string;
  public readonly requiredSkills: RequiredSkill[];
  public readonly priority: Priority;
  public readonly location?: string;
  // Automotive-specific fields
  public readonly capacity: number;
  public readonly productionLineId?: string;
  public readonly equipment: Equipment[];
  public readonly safetyRequirements: SafetyRequirement[];
  public readonly description?: string;
  public readonly active: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    line: string;
    requiredSkills: RequiredSkill[];
    priority: Priority;
    location?: string;
    // Automotive-specific fields
    capacity: number;
    productionLineId?: string;
    equipment: Equipment[];
    safetyRequirements: SafetyRequirement[];
    description?: string;
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const stationData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = StationSchema.parse(stationData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.line = validated.line;
    this.requiredSkills = validated.requiredSkills;
    this.priority = validated.priority;
    this.location = validated.location;
    // Automotive-specific fields
    this.capacity = validated.capacity;
    this.productionLineId = validated.productionLineId;
    this.equipment = validated.equipment;
    this.safetyRequirements = validated.safetyRequirements;
    this.description = validated.description;
    this.active = validated.active;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof StationSchema>): void {
    // Validate that there's at least one required skill
    if (data.requiredSkills.length === 0) {
      throw new Error('Station must have at least one required skill');
    }

    // Validate no duplicate skill requirements
    const skillIds = data.requiredSkills.map(skill => skill.skillId);
    const uniqueSkillIds = new Set(skillIds);
    if (skillIds.length !== uniqueSkillIds.size) {
      throw new Error('Station cannot have duplicate skill requirements');
    }

    // Validate that at least one skill is mandatory for critical stations
    if (data.priority === Priority.CRITICAL) {
      const hasMandatorySkill = data.requiredSkills.some(skill => skill.mandatory);
      if (!hasMandatorySkill) {
        throw new Error('Critical stations must have at least one mandatory skill');
      }
    }

    // Validate reasonable skill counts
    const totalRequiredCount = data.requiredSkills.reduce((total, skill) => total + skill.count, 0);
    if (totalRequiredCount > 10) {
      throw new Error('Total required skill count cannot exceed 10 per station');
    }

    // Automotive-specific validations
    // Validate capacity is reasonable (1-50 employees per station)
    if (data.capacity < 1 || data.capacity > 50) {
      throw new Error('Station capacity must be between 1 and 50 employees');
    }

    // Validate no duplicate equipment
    const equipmentIds = data.equipment.map(eq => eq.id);
    const uniqueEquipmentIds = new Set(equipmentIds);
    if (equipmentIds.length !== uniqueEquipmentIds.size) {
      throw new Error('Station cannot have duplicate equipment');
    }

    // Validate no duplicate safety requirements
    const safetyReqIds = data.safetyRequirements.map(sr => sr.id);
    const uniqueSafetyReqIds = new Set(safetyReqIds);
    if (safetyReqIds.length !== uniqueSafetyReqIds.size) {
      throw new Error('Station cannot have duplicate safety requirements');
    }

    // Validate reasonable limits
    if (data.equipment.length > 20) {
      throw new Error('Station cannot have more than 20 pieces of equipment');
    }

    if (data.safetyRequirements.length > 15) {
      throw new Error('Station cannot have more than 15 safety requirements');
    }

    // Validate that critical stations have safety requirements
    if (data.priority === Priority.CRITICAL && data.safetyRequirements.length === 0) {
      throw new Error('Critical stations must have at least one safety requirement');
    }
  }

  /**
   * Get all mandatory skills for this station
   */
  public getMandatorySkills(): RequiredSkill[] {
    return this.requiredSkills.filter(skill => skill.mandatory);
  }

  /**
   * Get all optional skills for this station
   */
  public getOptionalSkills(): RequiredSkill[] {
    return this.requiredSkills.filter(skill => !skill.mandatory);
  }

  /**
   * Get the total number of people required for this station
   */
  public getTotalRequiredCount(): number {
    return this.requiredSkills.reduce((total, skill) => total + skill.count, 0);
  }

  /**
   * Get the minimum number of people required (mandatory skills only)
   */
  public getMinimumRequiredCount(): number {
    return this.getMandatorySkills().reduce((total, skill) => total + skill.count, 0);
  }

  /**
   * Check if a skill is required for this station
   */
  public requiresSkill(skillId: string): boolean {
    return this.requiredSkills.some(skill => skill.skillId === skillId);
  }

  /**
   * Get the required level for a specific skill
   */
  public getRequiredLevel(skillId: string): number | null {
    const skill = this.requiredSkills.find(skill => skill.skillId === skillId);
    return skill ? skill.minLevel : null;
  }

  /**
   * Check if a skill requirement is mandatory
   */
  public isSkillMandatory(skillId: string): boolean {
    const skill = this.requiredSkills.find(skill => skill.skillId === skillId);
    return skill ? skill.mandatory : false;
  }

  /**
   * Get the required count for a specific skill
   */
  public getRequiredCount(skillId: string): number {
    const skill = this.requiredSkills.find(skill => skill.skillId === skillId);
    return skill ? skill.count : 0;
  }

  /**
   * Check if this station is critical
   */
  public isCritical(): boolean {
    return this.priority === Priority.CRITICAL;
  }

  /**
   * Check if this station is high priority or above
   */
  public isHighPriority(): boolean {
    return this.priority === Priority.HIGH || this.priority === Priority.CRITICAL;
  }

  /**
   * Get skills grouped by mandatory/optional
   */
  public getSkillsByType(): { mandatory: RequiredSkill[]; optional: RequiredSkill[] } {
    return {
      mandatory: this.getMandatorySkills(),
      optional: this.getOptionalSkills()
    };
  }

  /**
   * Get operational equipment (active and operational status)
   */
  public getOperationalEquipment(): Equipment[] {
    return this.equipment.filter(eq => eq.active && eq.status === 'operational');
  }

  /**
   * Get equipment by type
   */
  public getEquipmentByType(type: string): Equipment[] {
    return this.equipment.filter(eq => eq.type === type);
  }

  /**
   * Get active safety requirements
   */
  public getActiveSafetyRequirements(): SafetyRequirement[] {
    return this.safetyRequirements.filter(sr => sr.active);
  }

  /**
   * Get safety requirements by category
   */
  public getSafetyRequirementsByCategory(category: string): SafetyRequirement[] {
    return this.safetyRequirements.filter(sr => sr.category === category);
  }

  /**
   * Get high-risk safety requirements (advanced or expert level)
   */
  public getHighRiskSafetyRequirements(): SafetyRequirement[] {
    return this.safetyRequirements.filter(sr => sr.level === 'advanced' || sr.level === 'expert');
  }

  /**
   * Check if station is at capacity
   */
  public isAtCapacity(currentAssignments: number): boolean {
    return currentAssignments >= this.capacity;
  }

  /**
   * Check if station is understaffed
   */
  public isUnderstaffed(currentAssignments: number): boolean {
    const minimumStaffing = Math.ceil(this.capacity * 0.8); // 80% of capacity
    return currentAssignments < minimumStaffing;
  }

  /**
   * Check if station is overstaffed
   */
  public isOverstaffed(currentAssignments: number): boolean {
    return currentAssignments > this.capacity;
  }

  /**
   * Get staffing status
   */
  public getStaffingStatus(currentAssignments: number): 'understaffed' | 'optimal' | 'overstaffed' {
    if (this.isUnderstaffed(currentAssignments)) return 'understaffed';
    if (this.isOverstaffed(currentAssignments)) return 'overstaffed';
    return 'optimal';
  }

  /**
   * Get available capacity
   */
  public getAvailableCapacity(currentAssignments: number): number {
    return Math.max(0, this.capacity - currentAssignments);
  }

  /**
   * Check if station has specific equipment
   */
  public hasEquipment(equipmentId: string): boolean {
    return this.equipment.some(eq => eq.id === equipmentId);
  }

  /**
   * Check if station has specific safety requirement
   */
  public hasSafetyRequirement(safetyReqId: string): boolean {
    return this.safetyRequirements.some(sr => sr.id === safetyReqId);
  }

  /**
   * Get all skills required by equipment
   */
  public getEquipmentRequiredSkills(): string[] {
    const skills = new Set<string>();
    this.equipment.forEach(eq => {
      eq.requiredSkills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills);
  }

  /**
   * Get all safety requirements from equipment
   */
  public getEquipmentSafetyRequirements(): string[] {
    const safetyReqs = new Set<string>();
    this.equipment.forEach(eq => {
      eq.safetyRequirements.forEach(req => safetyReqs.add(req));
    });
    return Array.from(safetyReqs);
  }

  /**
   * Check if station is automotive production ready
   */
  public isProductionReady(): boolean {
    return this.active && 
           this.getOperationalEquipment().length > 0 && 
           this.getActiveSafetyRequirements().length > 0;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<Station, 'id' | 'createdAt'>>): Station {
    return new Station({
      id: this.id,
      name: updates.name ?? this.name,
      line: updates.line ?? this.line,
      requiredSkills: updates.requiredSkills ?? this.requiredSkills,
      priority: updates.priority ?? this.priority,
      location: updates.location ?? this.location,
      // Automotive-specific fields
      capacity: updates.capacity ?? this.capacity,
      productionLineId: updates.productionLineId ?? this.productionLineId,
      equipment: updates.equipment ?? this.equipment,
      safetyRequirements: updates.safetyRequirements ?? this.safetyRequirements,
      description: updates.description ?? this.description,
      active: updates.active ?? this.active,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Add a required skill to this station
   */
  public addRequiredSkill(skill: RequiredSkill): Station {
    // Check if skill already exists
    if (this.requiresSkill(skill.skillId)) {
      throw new Error(`Skill ${skill.skillId} is already required for this station`);
    }

    return this.update({
      requiredSkills: [...this.requiredSkills, skill]
    });
  }

  /**
   * Remove a required skill from this station
   */
  public removeRequiredSkill(skillId: string): Station {
    const updatedSkills = this.requiredSkills.filter(skill => skill.skillId !== skillId);
    
    if (updatedSkills.length === this.requiredSkills.length) {
      throw new Error(`Skill ${skillId} is not required for this station`);
    }

    return this.update({
      requiredSkills: updatedSkills
    });
  }

  /**
   * Add equipment to this station
   */
  public addEquipment(equipment: Equipment): Station {
    if (this.hasEquipment(equipment.id)) {
      throw new Error(`Equipment ${equipment.id} already exists at this station`);
    }

    return this.update({
      equipment: [...this.equipment, equipment]
    });
  }

  /**
   * Remove equipment from this station
   */
  public removeEquipment(equipmentId: string): Station {
    const updatedEquipment = this.equipment.filter(eq => eq.id !== equipmentId);
    
    if (updatedEquipment.length === this.equipment.length) {
      throw new Error(`Equipment ${equipmentId} not found at this station`);
    }

    return this.update({
      equipment: updatedEquipment
    });
  }

  /**
   * Add safety requirement to this station
   */
  public addSafetyRequirement(safetyReq: SafetyRequirement): Station {
    if (this.hasSafetyRequirement(safetyReq.id)) {
      throw new Error(`Safety requirement ${safetyReq.id} already exists for this station`);
    }

    return this.update({
      safetyRequirements: [...this.safetyRequirements, safetyReq]
    });
  }

  /**
   * Remove safety requirement from this station
   */
  public removeSafetyRequirement(safetyReqId: string): Station {
    const updatedSafetyReqs = this.safetyRequirements.filter(sr => sr.id !== safetyReqId);
    
    if (updatedSafetyReqs.length === this.safetyRequirements.length) {
      throw new Error(`Safety requirement ${safetyReqId} not found for this station`);
    }

    return this.update({
      safetyRequirements: updatedSafetyReqs
    });
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      line: this.line,
      requiredSkills: this.requiredSkills,
      priority: this.priority,
      location: this.location,
      // Automotive-specific fields
      capacity: this.capacity,
      productionLineId: this.productionLineId,
      equipment: this.equipment,
      safetyRequirements: this.safetyRequirements,
      description: this.description,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}