import { z } from 'zod';
import { AuditAction } from '../types/index.js';

// Validation schema
const AuditLogSchema = z.object({
  id: z.string().min(1, 'Audit log ID is required'),
  action: z.nativeEnum(AuditAction),
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  timestamp: z.date(),
  changes: z.record(z.any()),
  metadata: z.record(z.any()).optional()
});

export class AuditLog {
  public readonly id: string;
  public readonly action: AuditAction;
  public readonly entityType: string;
  public readonly entityId: string;
  public readonly userId: string;
  public readonly timestamp: Date;
  public readonly changes: Record<string, any>;
  public readonly metadata?: Record<string, any>;

  constructor(data: {
    id: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    userId: string;
    timestamp?: Date;
    changes: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    const auditData = {
      ...data,
      timestamp: data.timestamp || new Date()
    };

    // Validate the data
    const validated = AuditLogSchema.parse(auditData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.action = validated.action;
    this.entityType = validated.entityType;
    this.entityId = validated.entityId;
    this.userId = validated.userId;
    this.timestamp = validated.timestamp;
    this.changes = validated.changes;
    this.metadata = validated.metadata;
  }

  private validateBusinessRules(data: z.infer<typeof AuditLogSchema>): void {
    // Validate that changes object is not empty for UPDATE actions
    if (data.action === AuditAction.UPDATE && Object.keys(data.changes).length === 0) {
      throw new Error('Changes object cannot be empty for UPDATE actions');
    }

    // Validate timestamp is not in the future
    if (data.timestamp > new Date()) {
      throw new Error('Audit log timestamp cannot be in the future');
    }

    // Validate entity type format
    if (!/^[a-z_]+$/.test(data.entityType)) {
      throw new Error('Entity type must be lowercase with underscores only');
    }
  }

  /**
   * Check if this is a creation audit log
   */
  public isCreation(): boolean {
    return this.action === AuditAction.CREATE;
  }

  /**
   * Check if this is an update audit log
   */
  public isUpdate(): boolean {
    return this.action === AuditAction.UPDATE;
  }

  /**
   * Check if this is a deletion audit log
   */
  public isDeletion(): boolean {
    return this.action === AuditAction.DELETE;
  }

  /**
   * Check if this is an approval audit log
   */
  public isApproval(): boolean {
    return this.action === AuditAction.APPROVE;
  }

  /**
   * Check if this is a rejection audit log
   */
  public isRejection(): boolean {
    return this.action === AuditAction.REJECT;
  }

  /**
   * Check if this is a commit audit log
   */
  public isCommit(): boolean {
    return this.action === AuditAction.COMMIT;
  }

  /**
   * Get the list of changed fields
   */
  public getChangedFields(): string[] {
    return Object.keys(this.changes);
  }

  /**
   * Get the old value for a specific field
   */
  public getOldValue(field: string): any {
    return this.changes[field]?.old;
  }

  /**
   * Get the new value for a specific field
   */
  public getNewValue(field: string): any {
    return this.changes[field]?.new;
  }

  /**
   * Check if a specific field was changed
   */
  public wasFieldChanged(field: string): boolean {
    return field in this.changes;
  }

  /**
   * Get metadata value by key
   */
  public getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  /**
   * Check if audit log has specific metadata
   */
  public hasMetadata(key: string): boolean {
    return this.metadata ? key in this.metadata : false;
  }

  /**
   * Get a human-readable description of the audit log
   */
  public getDescription(): string {
    const actionDescriptions: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'created',
      [AuditAction.UPDATE]: 'updated',
      [AuditAction.DELETE]: 'deleted',
      [AuditAction.APPROVE]: 'approved',
      [AuditAction.REJECT]: 'rejected',
      [AuditAction.COMMIT]: 'committed'
    };

    const actionText = actionDescriptions[this.action];
    const entityText = this.entityType.replace('_', ' ');
    
    if (this.isUpdate()) {
      const changedFields = this.getChangedFields();
      return `${actionText} ${entityText} ${this.entityId} (changed: ${changedFields.join(', ')})`;
    }
    
    return `${actionText} ${entityText} ${this.entityId}`;
  }

  /**
   * Get summary of changes for display
   */
  public getChangesSummary(): string[] {
    const summary: string[] = [];
    
    for (const [field, change] of Object.entries(this.changes)) {
      if (typeof change === 'object' && change !== null && 'old' in change && 'new' in change) {
        summary.push(`${field}: ${change.old} → ${change.new}`);
      } else {
        summary.push(`${field}: ${JSON.stringify(change)}`);
      }
    }
    
    return summary;
  }

  /**
   * Check if this audit log is related to planning operations
   */
  public isPlanningRelated(): boolean {
    const planningEntities = ['assignment', 'shift_demand', 'plan_proposal'];
    return planningEntities.includes(this.entityType);
  }

  /**
   * Check if this audit log is related to employee management
   */
  public isEmployeeRelated(): boolean {
    const employeeEntities = ['employee', 'employee_skill', 'absence'];
    return employeeEntities.includes(this.entityType);
  }

  /**
   * Get the age of this audit log in milliseconds
   */
  public getAge(): number {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * Check if this audit log is older than specified days
   */
  public isOlderThan(days: number): boolean {
    const ageInDays = this.getAge() / (1000 * 60 * 60 * 24);
    return ageInDays > days;
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      userId: this.userId,
      timestamp: this.timestamp,
      changes: this.changes,
      metadata: this.metadata
    };
  }

  /**
   * Create audit log for entity creation
   */
  public static forCreation(
    id: string,
    entityType: string,
    entityId: string,
    userId: string,
    entityData: Record<string, any>,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id,
      action: AuditAction.CREATE,
      entityType,
      entityId,
      userId,
      changes: { created: entityData },
      metadata
    });
  }

  /**
   * Create audit log for entity update
   */
  public static forUpdate(
    id: string,
    entityType: string,
    entityId: string,
    userId: string,
    changes: Record<string, { old: any; new: any }>,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id,
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      userId,
      changes,
      metadata
    });
  }

  /**
   * Create audit log for entity deletion
   */
  public static forDeletion(
    id: string,
    entityType: string,
    entityId: string,
    userId: string,
    entityData: Record<string, any>,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id,
      action: AuditAction.DELETE,
      entityType,
      entityId,
      userId,
      changes: { deleted: entityData },
      metadata
    });
  }

  /**
   * Create audit log for entity approval
   */
  public static forApproval(
    id: string,
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id,
      action: AuditAction.APPROVE,
      entityType,
      entityId,
      userId,
      changes: { approved: true },
      metadata
    });
  }

  /**
   * Create audit log for entity rejection
   */
  public static forRejection(
    id: string,
    entityType: string,
    entityId: string,
    userId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id,
      action: AuditAction.REJECT,
      entityType,
      entityId,
      userId,
      changes: { rejected: true, reason },
      metadata
    });
  }

  /**
   * Create audit log for plan commit
   */
  public static forCommit(
    id: string,
    entityType: string,
    entityId: string,
    userId: string,
    commitData: Record<string, any>,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id,
      action: AuditAction.COMMIT,
      entityType,
      entityId,
      userId,
      changes: { committed: commitData },
      metadata
    });
  }
}