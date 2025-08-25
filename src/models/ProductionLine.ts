import { z } from 'zod';
import { ProductionLineType, QualityCheckpoint } from '../types/index.js';

// Validation schemas
const QualityCheckpointSchema = z.object({
  id: z.string().min(1, 'Quality checkpoint ID is required'),
  name: z.string().min(1, 'Quality checkpoint name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long'),
  type: z.string().min(1, 'Quality check type is required'),
  frequency: z.number().min(1, 'Frequency must be at least 1'),
  requiredSkills: z.array(z.string()),
  tolerances: z.record(z.any()),
  active: z.boolean()
});

const ProductionLineSchema = z.object({
  id: z.string().min(1, 'Production line ID is required'),
  name: z.string().min(1, 'Production line name is required').max(100, 'Name too long'),
  type: z.nativeEnum(ProductionLineType),
  description: z.string().max(500, 'Description too long').optional(),
  taktTime: z.number().min(1, 'Takt time must be positive'),
  capacity: z.number().min(1, 'Capacity must be between 1 and 1000 units per hour').max(1000, 'Capacity must be between 1 and 1000 units per hour'),
  qualityCheckpoints: z.array(QualityCheckpointSchema),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class ProductionLine {
  public readonly id: string;
  public readonly name: string;
  public readonly type: ProductionLineType;
  public readonly description?: string;
  public readonly taktTime: number;
  public readonly capacity: number;
  public readonly qualityCheckpoints: QualityCheckpoint[];
  public readonly active: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    type: ProductionLineType;
    description?: string;
    taktTime: number;
    capacity: number;
    qualityCheckpoints: QualityCheckpoint[];
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const productionLineData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = ProductionLineSchema.parse(productionLineData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.type = validated.type;
    this.description = validated.description;
    this.taktTime = validated.taktTime;
    this.capacity = validated.capacity;
    this.qualityCheckpoints = validated.qualityCheckpoints;
    this.active = validated.active;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof ProductionLineSchema>): void {
    // Validate takt time is reasonable (between 10 seconds and 1 hour)
    if (data.taktTime < 10 || data.taktTime > 3600) {
      throw new Error('Takt time must be between 10 seconds and 1 hour');
    }

    // Validate capacity is reasonable (1-1000 units per hour)
    if (data.capacity < 1 || data.capacity > 1000) {
      throw new Error('Capacity must be between 1 and 1000 units per hour');
    }

    // Validate quality checkpoints have unique IDs
    const checkpointIds = data.qualityCheckpoints.map(cp => cp.id);
    const uniqueIds = new Set(checkpointIds);
    if (checkpointIds.length !== uniqueIds.size) {
      throw new Error('Quality checkpoints must have unique IDs');
    }

    // Validate quality checkpoint frequencies are reasonable
    const invalidFrequencies = data.qualityCheckpoints.filter(cp => cp.frequency > 1000);
    if (invalidFrequencies.length > 0) {
      throw new Error('Quality checkpoint frequency cannot exceed 1000 units');
    }
  }

  /**
   * Get active quality checkpoints
   */
  public getActiveQualityCheckpoints(): QualityCheckpoint[] {
    return this.qualityCheckpoints.filter(cp => cp.active);
  }

  /**
   * Get quality checkpoints by type
   */
  public getQualityCheckpointsByType(type: string): QualityCheckpoint[] {
    return this.qualityCheckpoints.filter(cp => cp.type === type);
  }

  /**
   * Calculate theoretical throughput per hour
   */
  public getTheoreticalThroughput(): number {
    return Math.floor(3600 / this.taktTime);
  }

  /**
   * Get efficiency percentage based on actual vs theoretical capacity
   */
  public getEfficiencyPercentage(): number {
    const theoretical = this.getTheoreticalThroughput();
    return Math.round((this.capacity / theoretical) * 100);
  }

  /**
   * Check if production line is high capacity (>100 units/hour)
   */
  public isHighCapacity(): boolean {
    return this.capacity > 100;
  }

  /**
   * Get all required skills from quality checkpoints
   */
  public getAllRequiredSkills(): string[] {
    const skills = new Set<string>();
    this.qualityCheckpoints.forEach(cp => {
      cp.requiredSkills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills);
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<ProductionLine, 'id' | 'createdAt'>>): ProductionLine {
    return new ProductionLine({
      id: this.id,
      name: updates.name ?? this.name,
      type: updates.type ?? this.type,
      description: updates.description ?? this.description,
      taktTime: updates.taktTime ?? this.taktTime,
      capacity: updates.capacity ?? this.capacity,
      qualityCheckpoints: updates.qualityCheckpoints ?? this.qualityCheckpoints,
      active: updates.active ?? this.active,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Add a quality checkpoint
   */
  public addQualityCheckpoint(checkpoint: QualityCheckpoint): ProductionLine {
    // Check if checkpoint ID already exists
    if (this.qualityCheckpoints.some(cp => cp.id === checkpoint.id)) {
      throw new Error(`Quality checkpoint with ID ${checkpoint.id} already exists`);
    }

    return new ProductionLine({
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      taktTime: this.taktTime,
      capacity: this.capacity,
      qualityCheckpoints: [...this.qualityCheckpoints, checkpoint],
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Remove a quality checkpoint
   */
  public removeQualityCheckpoint(checkpointId: string): ProductionLine {
    const updatedCheckpoints = this.qualityCheckpoints.filter(cp => cp.id !== checkpointId);
    
    if (updatedCheckpoints.length === this.qualityCheckpoints.length) {
      throw new Error(`Quality checkpoint ${checkpointId} not found`);
    }

    return new ProductionLine({
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      taktTime: this.taktTime,
      capacity: this.capacity,
      qualityCheckpoints: updatedCheckpoints,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: new Date()
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
      description: this.description,
      taktTime: this.taktTime,
      capacity: this.capacity,
      qualityCheckpoints: this.qualityCheckpoints,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}