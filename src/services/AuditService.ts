import { AuditLog } from '../models/AuditLog.js';
import { AuditAction, DateRange } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditQuery {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalLogs: number;
  actionCounts: Record<AuditAction, number>;
  entityTypeCounts: Record<string, number>;
  userActivityCounts: Record<string, number>;
  dateRange: DateRange;
}

export interface AuditRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  findByQuery(query: AuditQuery): Promise<AuditLog[]>;
  count(query: Omit<AuditQuery, 'limit' | 'offset'>): Promise<number>;
  deleteOlderThan(days: number): Promise<number>;
}

export class AuditService {
  constructor(private repository: AuditRepository) {}

  /**
   * Log entity creation
   */
  public async logCreation(
    entityType: string,
    entityId: string,
    userId: string,
    entityData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const auditLog = AuditLog.forCreation(
      uuidv4(),
      entityType,
      entityId,
      userId,
      entityData,
      metadata
    );

    return await this.repository.save(auditLog);
  }

  /**
   * Log entity update
   */
  public async logUpdate(
    entityType: string,
    entityId: string,
    userId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const changes = this.calculateChanges(oldData, newData);
    
    if (Object.keys(changes).length === 0) {
      throw new Error('No changes detected for update audit log');
    }

    const auditLog = AuditLog.forUpdate(
      uuidv4(),
      entityType,
      entityId,
      userId,
      changes,
      metadata
    );

    return await this.repository.save(auditLog);
  }

  /**
   * Log entity deletion
   */
  public async logDeletion(
    entityType: string,
    entityId: string,
    userId: string,
    entityData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const auditLog = AuditLog.forDeletion(
      uuidv4(),
      entityType,
      entityId,
      userId,
      entityData,
      metadata
    );

    return await this.repository.save(auditLog);
  }

  /**
   * Log entity approval
   */
  public async logApproval(
    entityType: string,
    entityId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const auditLog = AuditLog.forApproval(
      uuidv4(),
      entityType,
      entityId,
      userId,
      metadata
    );

    return await this.repository.save(auditLog);
  }

  /**
   * Log entity rejection
   */
  public async logRejection(
    entityType: string,
    entityId: string,
    userId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const auditLog = AuditLog.forRejection(
      uuidv4(),
      entityType,
      entityId,
      userId,
      reason,
      metadata
    );

    return await this.repository.save(auditLog);
  }

  /**
   * Log plan commit
   */
  public async logCommit(
    entityType: string,
    entityId: string,
    userId: string,
    commitData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const auditLog = AuditLog.forCommit(
      uuidv4(),
      entityType,
      entityId,
      userId,
      commitData,
      metadata
    );

    return await this.repository.save(auditLog);
  }

  /**
   * Log assignment creation with detailed context
   */
  public async logAssignmentCreation(
    assignmentId: string,
    userId: string,
    assignmentData: Record<string, any>,
    planningContext?: {
      planId?: string;
      demandId: string;
      employeeId: string;
      score: number;
      constraints?: string[];
    }
  ): Promise<AuditLog> {
    const metadata = {
      ...planningContext,
      category: 'planning',
      operation: 'assignment_creation'
    };

    return await this.logCreation('assignment', assignmentId, userId, assignmentData, metadata);
  }

  /**
   * Log assignment modification with detailed context
   */
  public async logAssignmentModification(
    assignmentId: string,
    userId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    reason?: string
  ): Promise<AuditLog> {
    const metadata = {
      category: 'planning',
      operation: 'assignment_modification',
      reason
    };

    return await this.logUpdate('assignment', assignmentId, userId, oldData, newData, metadata);
  }

  /**
   * Log plan approval with assignment details
   */
  public async logPlanApproval(
    planId: string,
    userId: string,
    assignmentIds: string[],
    approvalNotes?: string
  ): Promise<AuditLog> {
    const metadata = {
      category: 'planning',
      operation: 'plan_approval',
      assignmentIds,
      approvalNotes,
      assignmentCount: assignmentIds.length
    };

    return await this.logApproval('plan_proposal', planId, userId, metadata);
  }

  /**
   * Get audit trail for specific entity
   */
  public async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return await this.repository.findByQuery({
      entityType,
      entityId,
      limit
    });
  }

  /**
   * Get audit logs for user activity
   */
  public async getUserActivity(
    userId: string,
    dateRange?: DateRange,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return await this.repository.findByQuery({
      userId,
      dateRange,
      limit
    });
  }

  /**
   * Get planning-related audit logs
   */
  public async getPlanningAuditLogs(
    dateRange?: DateRange,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const planningEntityTypes = ['assignment', 'shift_demand', 'plan_proposal'];
    const allLogs: AuditLog[] = [];

    for (const entityType of planningEntityTypes) {
      const logs = await this.repository.findByQuery({
        entityType,
        dateRange,
        limit: Math.ceil(limit / planningEntityTypes.length)
      });
      allLogs.push(...logs);
    }

    // Sort by timestamp descending and limit
    return allLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Generate audit summary for reporting
   */
  public async generateAuditSummary(
    dateRange: DateRange,
    entityType?: string
  ): Promise<AuditSummary> {
    const query: AuditQuery = { dateRange };
    if (entityType) {
      query.entityType = entityType;
    }

    const logs = await this.repository.findByQuery(query);
    const totalLogs = logs.length;

    // Count by action
    const actionCounts: Record<AuditAction, number> = {
      [AuditAction.CREATE]: 0,
      [AuditAction.UPDATE]: 0,
      [AuditAction.DELETE]: 0,
      [AuditAction.APPROVE]: 0,
      [AuditAction.REJECT]: 0,
      [AuditAction.COMMIT]: 0
    };

    // Count by entity type
    const entityTypeCounts: Record<string, number> = {};

    // Count by user
    const userActivityCounts: Record<string, number> = {};

    logs.forEach(log => {
      // Count actions
      actionCounts[log.action]++;

      // Count entity types
      entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;

      // Count user activity
      userActivityCounts[log.userId] = (userActivityCounts[log.userId] || 0) + 1;
    });

    return {
      totalLogs,
      actionCounts,
      entityTypeCounts,
      userActivityCounts,
      dateRange
    };
  }

  /**
   * Search audit logs with advanced filtering
   */
  public async searchAuditLogs(query: AuditQuery): Promise<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    const logs = await this.repository.findByQuery(query);
    const total = await this.repository.count(query);
    const hasMore = (query.offset || 0) + logs.length < total;

    return {
      logs,
      total,
      hasMore
    };
  }

  /**
   * Get audit logs by specific criteria
   */
  public async getAuditLogsByCriteria(criteria: {
    entityTypes?: string[];
    actions?: AuditAction[];
    userIds?: string[];
    dateRange?: DateRange;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const allLogs: AuditLog[] = [];

    // If specific entity types are requested
    if (criteria.entityTypes && criteria.entityTypes.length > 0) {
      for (const entityType of criteria.entityTypes) {
        const logs = await this.repository.findByQuery({
          entityType,
          dateRange: criteria.dateRange,
          limit: criteria.limit,
          offset: criteria.offset
        });
        allLogs.push(...logs);
      }
    } else {
      // Get all logs matching other criteria
      const logs = await this.repository.findByQuery({
        dateRange: criteria.dateRange,
        limit: criteria.limit,
        offset: criteria.offset
      });
      allLogs.push(...logs);
    }

    // Filter by actions if specified
    let filteredLogs = allLogs;
    if (criteria.actions && criteria.actions.length > 0) {
      filteredLogs = filteredLogs.filter(log => criteria.actions!.includes(log.action));
    }

    // Filter by user IDs if specified
    if (criteria.userIds && criteria.userIds.length > 0) {
      filteredLogs = filteredLogs.filter(log => criteria.userIds!.includes(log.userId));
    }

    // Sort by timestamp descending
    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clean up old audit logs
   */
  public async cleanupOldLogs(retentionDays: number): Promise<number> {
    return await this.repository.deleteOlderThan(retentionDays);
  }

  /**
   * Validate audit log integrity
   */
  public async validateAuditIntegrity(
    entityType: string,
    entityId: string
  ): Promise<{
    valid: boolean;
    issues: string[];
    timeline: AuditLog[];
  }> {
    const timeline = await this.getEntityAuditTrail(entityType, entityId);
    const issues: string[] = [];

    // Check for creation log
    const creationLog = timeline.find(log => log.isCreation());
    if (!creationLog) {
      issues.push('Missing creation audit log');
    }

    // Check for chronological order
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].timestamp > timeline[i - 1].timestamp) {
        issues.push(`Chronological order violation at index ${i}`);
      }
    }

    // Check for orphaned updates (updates without creation)
    if (!creationLog && timeline.some(log => log.isUpdate())) {
      issues.push('Update logs exist without creation log');
    }

    // Check for updates after deletion
    const deletionLog = timeline.find(log => log.isDeletion());
    if (deletionLog) {
      const logsAfterDeletion = timeline.filter(log => 
        log.timestamp > deletionLog.timestamp && !log.isDeletion()
      );
      if (logsAfterDeletion.length > 0) {
        issues.push('Logs exist after deletion');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      timeline
    };
  }

  /**
   * Calculate changes between old and new data
   */
  private calculateChanges(
    oldData: Record<string, any>,
    newData: Record<string, any>
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    // Check for changed and new fields
    for (const [key, newValue] of Object.entries(newData)) {
      const oldValue = oldData[key];
      if (!this.deepEqual(oldValue, newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }

    // Check for removed fields
    for (const [key, oldValue] of Object.entries(oldData)) {
      if (!(key in newData)) {
        changes[key] = { old: oldValue, new: undefined };
      }
    }

    return changes;
  }

  /**
   * Deep equality check for change detection
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
      return a === b;
    }
    
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) {
      return false;
    }
    
    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      
      if (!this.deepEqual(a[key], b[key])) {
        return false;
      }
    }
    
    return true;
  }
}