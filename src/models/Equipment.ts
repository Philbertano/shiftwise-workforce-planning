import { z } from 'zod';
import { EquipmentType, EquipmentStatus } from '../types/index.js';

// Validation schemas
const EquipmentSchema = z.object({
  id: z.string().min(1, 'Equipment ID is required'),
  name: z.string().min(1, 'Equipment name is required').max(100, 'Name too long'),
  type: z.nativeEnum(EquipmentType),
  model: z.string().max(100, 'Model too long').optional(),
  serialNumber: z.string().max(100, 'Serial number too long').optional(),
  manufacturer: z.string().max(100, 'Manufacturer too long').optional(),
  installDate: z.date().optional(),
  lastMaintenance: z.date().optional(),
  nextMaintenance: z.date().optional(),
  status: z.nativeEnum(EquipmentStatus),
  requiredSkills: z.array(z.string()),
  safetyRequirements: z.array(z.string()),
  operatingParameters: z.record(z.any()).optional(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class Equipment {
  public readonly id: string;
  public readonly name: string;
  public readonly type: EquipmentType;
  public readonly model?: string;
  public readonly serialNumber?: string;
  public readonly manufacturer?: string;
  public readonly installDate?: Date;
  public readonly lastMaintenance?: Date;
  public readonly nextMaintenance?: Date;
  public readonly status: EquipmentStatus;
  public readonly requiredSkills: string[];
  public readonly safetyRequirements: string[];
  public readonly operatingParameters?: Record<string, any>;
  public readonly active: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    type: EquipmentType;
    model?: string;
    serialNumber?: string;
    manufacturer?: string;
    installDate?: Date;
    lastMaintenance?: Date;
    nextMaintenance?: Date;
    status: EquipmentStatus;
    requiredSkills: string[];
    safetyRequirements: string[];
    operatingParameters?: Record<string, any>;
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const equipmentData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = EquipmentSchema.parse(equipmentData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.type = validated.type;
    this.model = validated.model;
    this.serialNumber = validated.serialNumber;
    this.manufacturer = validated.manufacturer;
    this.installDate = validated.installDate;
    this.lastMaintenance = validated.lastMaintenance;
    this.nextMaintenance = validated.nextMaintenance;
    this.status = validated.status;
    this.requiredSkills = validated.requiredSkills;
    this.safetyRequirements = validated.safetyRequirements;
    this.operatingParameters = validated.operatingParameters;
    this.active = validated.active;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof EquipmentSchema>): void {
    // Validate maintenance dates are logical
    if (data.lastMaintenance && data.nextMaintenance) {
      if (data.lastMaintenance >= data.nextMaintenance) {
        throw new Error('Next maintenance date must be after last maintenance date');
      }
    }

    // Validate install date is not in the future
    if (data.installDate && data.installDate > new Date()) {
      throw new Error('Install date cannot be in the future');
    }

    // Validate last maintenance is not before install date
    if (data.installDate && data.lastMaintenance && data.lastMaintenance < data.installDate) {
      throw new Error('Last maintenance date cannot be before install date');
    }

    // Validate required skills array has no duplicates
    const uniqueSkills = new Set(data.requiredSkills);
    if (data.requiredSkills.length !== uniqueSkills.size) {
      throw new Error('Required skills cannot contain duplicates');
    }

    // Validate safety requirements array has no duplicates
    const uniqueSafetyReqs = new Set(data.safetyRequirements);
    if (data.safetyRequirements.length !== uniqueSafetyReqs.size) {
      throw new Error('Safety requirements cannot contain duplicates');
    }

    // Validate reasonable limits on arrays
    if (data.requiredSkills.length > 20) {
      throw new Error('Equipment cannot require more than 20 skills');
    }

    if (data.safetyRequirements.length > 15) {
      throw new Error('Equipment cannot have more than 15 safety requirements');
    }
  }

  /**
   * Check if equipment is operational
   */
  public isOperational(): boolean {
    return this.status === EquipmentStatus.OPERATIONAL && this.active;
  }

  /**
   * Check if equipment needs maintenance
   */
  public needsMaintenance(): boolean {
    if (!this.nextMaintenance) return false;
    return new Date() >= this.nextMaintenance;
  }

  /**
   * Check if equipment is overdue for maintenance
   */
  public isMaintenanceOverdue(): boolean {
    if (!this.nextMaintenance) return false;
    const now = new Date();
    const overdueDays = 7; // 7 days grace period
    const overdueDate = new Date(this.nextMaintenance.getTime() + (overdueDays * 24 * 60 * 60 * 1000));
    return now > overdueDate;
  }

  /**
   * Get days until next maintenance
   */
  public getDaysUntilMaintenance(): number | null {
    if (!this.nextMaintenance) return null;
    const now = new Date();
    const diffTime = this.nextMaintenance.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get equipment age in days
   */
  public getAgeInDays(): number | null {
    if (!this.installDate) return null;
    const now = new Date();
    const diffTime = now.getTime() - this.installDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if equipment requires specific skill
   */
  public requiresSkill(skillId: string): boolean {
    return this.requiredSkills.includes(skillId);
  }

  /**
   * Check if equipment has specific safety requirement
   */
  public hasSafetyRequirement(safetyReqId: string): boolean {
    return this.safetyRequirements.includes(safetyReqId);
  }

  /**
   * Get operating parameter value
   */
  public getOperatingParameter(key: string): any {
    return this.operatingParameters?.[key];
  }

  /**
   * Check if equipment is critical (robots, safety systems, etc.)
   */
  public isCritical(): boolean {
    const criticalTypes = [
      EquipmentType.ROBOT,
      EquipmentType.SAFETY_SYSTEM,
      EquipmentType.CRANE,
      EquipmentType.PRESS
    ];
    return criticalTypes.includes(this.type);
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<Equipment, 'id' | 'createdAt'>>): Equipment {
    return new Equipment({
      id: this.id,
      name: updates.hasOwnProperty('name') ? updates.name! : this.name,
      type: updates.hasOwnProperty('type') ? updates.type! : this.type,
      model: updates.hasOwnProperty('model') ? updates.model : this.model,
      serialNumber: updates.hasOwnProperty('serialNumber') ? updates.serialNumber : this.serialNumber,
      manufacturer: updates.hasOwnProperty('manufacturer') ? updates.manufacturer : this.manufacturer,
      installDate: updates.hasOwnProperty('installDate') ? updates.installDate : this.installDate,
      lastMaintenance: updates.hasOwnProperty('lastMaintenance') ? updates.lastMaintenance : this.lastMaintenance,
      nextMaintenance: updates.hasOwnProperty('nextMaintenance') ? updates.nextMaintenance : this.nextMaintenance,
      status: updates.hasOwnProperty('status') ? updates.status! : this.status,
      requiredSkills: updates.hasOwnProperty('requiredSkills') ? updates.requiredSkills! : this.requiredSkills,
      safetyRequirements: updates.hasOwnProperty('safetyRequirements') ? updates.safetyRequirements! : this.safetyRequirements,
      operatingParameters: updates.hasOwnProperty('operatingParameters') ? updates.operatingParameters : this.operatingParameters,
      active: updates.hasOwnProperty('active') ? updates.active! : this.active,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Update maintenance dates
   */
  public updateMaintenance(lastMaintenance: Date, nextMaintenance: Date): Equipment {
    if (lastMaintenance >= nextMaintenance) {
      throw new Error('Next maintenance date must be after last maintenance date');
    }

    return this.update({
      lastMaintenance,
      nextMaintenance,
      status: EquipmentStatus.OPERATIONAL // Assume operational after maintenance
    });
  }

  /**
   * Add required skill
   */
  public addRequiredSkill(skillId: string): Equipment {
    if (this.requiredSkills.includes(skillId)) {
      throw new Error(`Skill ${skillId} is already required for this equipment`);
    }

    return this.update({
      requiredSkills: [...this.requiredSkills, skillId]
    });
  }

  /**
   * Remove required skill
   */
  public removeRequiredSkill(skillId: string): Equipment {
    const updatedSkills = this.requiredSkills.filter(skill => skill !== skillId);
    
    if (updatedSkills.length === this.requiredSkills.length) {
      throw new Error(`Skill ${skillId} is not required for this equipment`);
    }

    return this.update({
      requiredSkills: updatedSkills
    });
  }

  /**
   * Add safety requirement
   */
  public addSafetyRequirement(safetyReqId: string): Equipment {
    if (this.safetyRequirements.includes(safetyReqId)) {
      throw new Error(`Safety requirement ${safetyReqId} already exists for this equipment`);
    }

    return this.update({
      safetyRequirements: [...this.safetyRequirements, safetyReqId]
    });
  }

  /**
   * Remove safety requirement
   */
  public removeSafetyRequirement(safetyReqId: string): Equipment {
    const updatedSafetyReqs = this.safetyRequirements.filter(req => req !== safetyReqId);
    
    if (updatedSafetyReqs.length === this.safetyRequirements.length) {
      throw new Error(`Safety requirement ${safetyReqId} not found for this equipment`);
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
      type: this.type,
      model: this.model,
      serialNumber: this.serialNumber,
      manufacturer: this.manufacturer,
      installDate: this.installDate,
      lastMaintenance: this.lastMaintenance,
      nextMaintenance: this.nextMaintenance,
      status: this.status,
      requiredSkills: this.requiredSkills,
      safetyRequirements: this.safetyRequirements,
      operatingParameters: this.operatingParameters,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}