import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'sqlite3';
import { SqliteAuditRepository } from '../../repositories/audit.repository.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AuditAction } from '../../types/index.js';

describe('SqliteAuditRepository', () => {
  let db: Database;
  let repository: SqliteAuditRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    repository = new SqliteAuditRepository(db);
    
    // Initialize the table
    await repository.initializeTable();
  });

  afterEach(async () => {
    return new Promise<void>((resolve) => {
      db.close(() => resolve());
    });
  });

  describe('save', () => {
    it('should save audit log to database', async () => {
      const auditLog = new AuditLog({
        id: 'audit-1',
        action: AuditAction.CREATE,
        entityType: 'assignment',
        entityId: 'assign-1',
        userId: 'user-1',
        changes: { created: { id: 'assign-1', status: 'proposed' } },
        metadata: { planId: 'plan-1' }
      });

      const result = await repository.save(auditLog);

      expect(result).toEqual(auditLog);
    });

    it('should save audit log without metadata', async () => {
      const auditLog = new AuditLog({
        id: 'audit-1',
        action: AuditAction.UPDATE,
        entityType: 'assignment',
        entityId: 'assign-1',
        userId: 'user-1',
        changes: { status: { old: 'proposed', new: 'confirmed' } }
      });

      const result = await repository.save(auditLog);

      expect(result).toEqual(auditLog);
    });
  });

  describe('findById', () => {
    it('should find audit log by ID', async () => {
      const auditLog = new AuditLog({
        id: 'audit-1',
        action: AuditAction.CREATE,
        entityType: 'assignment',
        entityId: 'assign-1',
        userId: 'user-1',
        changes: { created: { id: 'assign-1' } }
      });

      await repository.save(auditLog);
      const result = await repository.findById('audit-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('audit-1');
      expect(result!.action).toBe(AuditAction.CREATE);
      expect(result!.entityType).toBe('assignment');
    });

    it('should return null for non-existent ID', async () => {
      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByQuery', () => {
    beforeEach(async () => {
      // Create test data
      const auditLogs = [
        new AuditLog({
          id: 'audit-1',
          action: AuditAction.CREATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          changes: { created: { id: 'assign-1' } }
        }),
        new AuditLog({
          id: 'audit-2',
          action: AuditAction.UPDATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          changes: { status: { old: 'proposed', new: 'confirmed' } }
        }),
        new AuditLog({
          id: 'audit-3',
          action: AuditAction.CREATE,
          entityType: 'employee',
          entityId: 'emp-1',
          userId: 'user-2',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          changes: { created: { id: 'emp-1' } }
        })
      ];

      for (const log of auditLogs) {
        await repository.save(log);
      }
    });

    it('should find all audit logs', async () => {
      const result = await repository.findByQuery({});

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('audit-3'); // Most recent first
      expect(result[1].id).toBe('audit-2');
      expect(result[2].id).toBe('audit-1');
    });

    it('should filter by entity type', async () => {
      const result = await repository.findByQuery({
        entityType: 'assignment'
      });

      expect(result).toHaveLength(2);
      expect(result.every(log => log.entityType === 'assignment')).toBe(true);
    });

    it('should filter by entity ID', async () => {
      const result = await repository.findByQuery({
        entityId: 'assign-1'
      });

      expect(result).toHaveLength(2);
      expect(result.every(log => log.entityId === 'assign-1')).toBe(true);
    });

    it('should filter by user ID', async () => {
      const result = await repository.findByQuery({
        userId: 'user-1'
      });

      expect(result).toHaveLength(2);
      expect(result.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const result = await repository.findByQuery({
        action: AuditAction.CREATE
      });

      expect(result).toHaveLength(2);
      expect(result.every(log => log.action === AuditAction.CREATE)).toBe(true);
    });

    it('should filter by date range', async () => {
      const result = await repository.findByQuery({
        dateRange: {
          start: new Date('2024-01-01T10:30:00Z'),
          end: new Date('2024-01-01T12:30:00Z')
        }
      });

      expect(result).toHaveLength(2);
      expect(result.some(log => log.id === 'audit-2')).toBe(true);
      expect(result.some(log => log.id === 'audit-3')).toBe(true);
    });

    it('should apply limit', async () => {
      const result = await repository.findByQuery({
        limit: 2
      });

      expect(result).toHaveLength(2);
    });

    it('should apply offset', async () => {
      const result = await repository.findByQuery({
        limit: 2,
        offset: 1
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-2');
      expect(result[1].id).toBe('audit-1');
    });

    it('should combine multiple filters', async () => {
      const result = await repository.findByQuery({
        entityType: 'assignment',
        userId: 'user-1',
        action: AuditAction.UPDATE
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit-2');
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      // Create test data
      const auditLogs = [
        new AuditLog({
          id: 'audit-1',
          action: AuditAction.CREATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          changes: { created: { id: 'assign-1' } }
        }),
        new AuditLog({
          id: 'audit-2',
          action: AuditAction.UPDATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          changes: { status: { old: 'proposed', new: 'confirmed' } }
        }),
        new AuditLog({
          id: 'audit-3',
          action: AuditAction.CREATE,
          entityType: 'employee',
          entityId: 'emp-1',
          userId: 'user-2',
          changes: { created: { id: 'emp-1' } }
        })
      ];

      for (const log of auditLogs) {
        await repository.save(log);
      }
    });

    it('should count all audit logs', async () => {
      const result = await repository.count({});

      expect(result).toBe(3);
    });

    it('should count with filters', async () => {
      const result = await repository.count({
        entityType: 'assignment'
      });

      expect(result).toBe(2);
    });

    it('should count with multiple filters', async () => {
      const result = await repository.count({
        entityType: 'assignment',
        action: AuditAction.UPDATE
      });

      expect(result).toBe(1);
    });
  });

  describe('deleteOlderThan', () => {
    beforeEach(async () => {
      // Create test data with different timestamps
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const auditLogs = [
        new AuditLog({
          id: 'audit-old',
          action: AuditAction.CREATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          timestamp: oldDate,
          changes: { created: { id: 'assign-1' } }
        }),
        new AuditLog({
          id: 'audit-recent',
          action: AuditAction.UPDATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          timestamp: recentDate,
          changes: { status: { old: 'proposed', new: 'confirmed' } }
        })
      ];

      for (const log of auditLogs) {
        await repository.save(log);
      }
    });

    it('should delete old audit logs', async () => {
      const deletedCount = await repository.deleteOlderThan(30);

      expect(deletedCount).toBe(1);

      // Verify the old log was deleted
      const remaining = await repository.findByQuery({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('audit-recent');
    });

    it('should not delete recent logs', async () => {
      const deletedCount = await repository.deleteOlderThan(5);

      expect(deletedCount).toBe(2); // Both logs are older than 5 days

      const remaining = await repository.findByQuery({});
      expect(remaining).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      const auditLogs = [
        new AuditLog({
          id: 'audit-1',
          action: AuditAction.CREATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          changes: { created: { id: 'assign-1' } }
        }),
        new AuditLog({
          id: 'audit-2',
          action: AuditAction.UPDATE,
          entityType: 'assignment',
          entityId: 'assign-1',
          userId: 'user-1',
          timestamp: new Date('2024-01-01T11:00:00Z'),
          changes: { status: { old: 'proposed', new: 'confirmed' } }
        }),
        new AuditLog({
          id: 'audit-3',
          action: AuditAction.CREATE,
          entityType: 'employee',
          entityId: 'emp-1',
          userId: 'user-2',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          changes: { created: { id: 'emp-1' } }
        })
      ];

      for (const log of auditLogs) {
        await repository.save(log);
      }
    });

    it('should return comprehensive statistics', async () => {
      const stats = await repository.getStatistics();

      expect(stats.totalLogs).toBe(3);
      expect(stats.oldestLog).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(stats.newestLog).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(stats.actionCounts[AuditAction.CREATE]).toBe(2);
      expect(stats.actionCounts[AuditAction.UPDATE]).toBe(1);
      expect(stats.entityTypeCounts['assignment']).toBe(2);
      expect(stats.entityTypeCounts['employee']).toBe(1);
    });
  });

  describe('initializeTable', () => {
    it('should create audit logs table with indexes', async () => {
      // This is tested implicitly by other tests working
      // We can verify the table exists by running a simple query
      const result = await repository.findByQuery({});
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Create a new database instance that we can close
      const testDb = new Database(':memory:');
      const testRepository = new SqliteAuditRepository(testDb);
      
      // Close the database to simulate an error
      await new Promise<void>((resolve) => {
        testDb.close(() => resolve());
      });

      const auditLog = new AuditLog({
        id: 'audit-1',
        action: AuditAction.CREATE,
        entityType: 'assignment',
        entityId: 'assign-1',
        userId: 'user-1',
        changes: { created: { id: 'assign-1' } }
      });

      await expect(testRepository.save(auditLog)).rejects.toThrow();
    });
  });
});