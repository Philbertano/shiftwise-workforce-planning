import { Database } from 'sqlite3';
import { AuditLog } from '../models/AuditLog.js';
import { AuditQuery, AuditRepository } from '../services/AuditService.js';
import { AuditAction } from '../types/index.js';

export class SqliteAuditRepository implements AuditRepository {
  constructor(private db: Database) {}

  /**
   * Save audit log to database
   */
  public async save(auditLog: AuditLog): Promise<AuditLog> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO audit_logs (
          id, action, entity_type, entity_id, user_id, timestamp, changes, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        auditLog.id,
        auditLog.action,
        auditLog.entityType,
        auditLog.entityId,
        auditLog.userId,
        auditLog.timestamp.toISOString(),
        JSON.stringify(auditLog.changes),
        auditLog.metadata ? JSON.stringify(auditLog.metadata) : null
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Failed to save audit log: ${err.message}`));
        } else {
          resolve(auditLog);
        }
      });
    });
  }

  /**
   * Find audit log by ID
   */
  public async findById(id: string): Promise<AuditLog | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, action, entity_type, entity_id, user_id, timestamp, changes, metadata
        FROM audit_logs
        WHERE id = ?
      `;

      this.db.get(sql, [id], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to find audit log: ${err.message}`));
        } else if (!row) {
          resolve(null);
        } else {
          try {
            const auditLog = this.mapRowToAuditLog(row);
            resolve(auditLog);
          } catch (mapErr) {
            reject(new Error(`Failed to map audit log: ${mapErr}`));
          }
        }
      });
    });
  }

  /**
   * Find audit logs by query criteria
   */
  public async findByQuery(query: AuditQuery): Promise<AuditLog[]> {
    return new Promise((resolve, reject) => {
      const { sql, params } = this.buildQuery(query);

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to query audit logs: ${err.message}`));
        } else {
          try {
            const auditLogs = rows.map(row => this.mapRowToAuditLog(row));
            resolve(auditLogs);
          } catch (mapErr) {
            reject(new Error(`Failed to map audit logs: ${mapErr}`));
          }
        }
      });
    });
  }

  /**
   * Count audit logs matching query criteria
   */
  public async count(query: Omit<AuditQuery, 'limit' | 'offset'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const { sql, params } = this.buildQuery(query, true);

      this.db.get(sql, params, (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to count audit logs: ${err.message}`));
        } else {
          resolve(row.count || 0);
        }
      });
    });
  }

  /**
   * Delete audit logs older than specified days
   */
  public async deleteOlderThan(days: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const sql = `
        DELETE FROM audit_logs
        WHERE timestamp < ?
      `;

      this.db.run(sql, [cutoffDate.toISOString()], function(err) {
        if (err) {
          reject(new Error(`Failed to delete old audit logs: ${err.message}`));
        } else {
          resolve(this.changes || 0);
        }
      });
    });
  }

  /**
   * Build SQL query from query criteria
   */
  private buildQuery(query: AuditQuery, isCount: boolean = false): { sql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Base query
    let sql = isCount 
      ? 'SELECT COUNT(*) as count FROM audit_logs'
      : 'SELECT id, action, entity_type, entity_id, user_id, timestamp, changes, metadata FROM audit_logs';

    // Add WHERE conditions
    if (query.entityType) {
      conditions.push('entity_type = ?');
      params.push(query.entityType);
    }

    if (query.entityId) {
      conditions.push('entity_id = ?');
      params.push(query.entityId);
    }

    if (query.userId) {
      conditions.push('user_id = ?');
      params.push(query.userId);
    }

    if (query.action) {
      conditions.push('action = ?');
      params.push(query.action);
    }

    if (query.dateRange) {
      conditions.push('timestamp >= ? AND timestamp <= ?');
      params.push(query.dateRange.start.toISOString());
      params.push(query.dateRange.end.toISOString());
    }

    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY, LIMIT, OFFSET for non-count queries
    if (!isCount) {
      sql += ' ORDER BY timestamp DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }
    }

    return { sql, params };
  }

  /**
   * Map database row to AuditLog instance
   */
  private mapRowToAuditLog(row: any): AuditLog {
    return new AuditLog({
      id: row.id,
      action: row.action as AuditAction,
      entityType: row.entity_type,
      entityId: row.entity_id,
      userId: row.user_id,
      timestamp: new Date(row.timestamp),
      changes: JSON.parse(row.changes),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    });
  }

  /**
   * Initialize audit logs table
   */
  public async initializeTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          changes TEXT NOT NULL,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      `;

      this.db.exec(sql, (err) => {
        if (err) {
          reject(new Error(`Failed to initialize audit logs table: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get audit statistics
   */
  public async getStatistics(): Promise<{
    totalLogs: number;
    oldestLog?: Date;
    newestLog?: Date;
    actionCounts: Record<string, number>;
    entityTypeCounts: Record<string, number>;
  }> {
    return new Promise((resolve, reject) => {
      const queries = [
        // Total count
        'SELECT COUNT(*) as total FROM audit_logs',
        // Date range
        'SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM audit_logs',
        // Action counts
        'SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action',
        // Entity type counts
        'SELECT entity_type, COUNT(*) as count FROM audit_logs GROUP BY entity_type'
      ];

      Promise.all(queries.map(sql => this.executeQuery(sql)))
        .then(results => {
          const [totalResult, dateResult, actionResults, entityResults] = results;

          const statistics = {
            totalLogs: totalResult[0]?.total || 0,
            oldestLog: dateResult[0]?.oldest ? new Date(dateResult[0].oldest) : undefined,
            newestLog: dateResult[0]?.newest ? new Date(dateResult[0].newest) : undefined,
            actionCounts: {} as Record<string, number>,
            entityTypeCounts: {} as Record<string, number>
          };

          // Process action counts
          actionResults.forEach((row: any) => {
            statistics.actionCounts[row.action] = row.count;
          });

          // Process entity type counts
          entityResults.forEach((row: any) => {
            statistics.entityTypeCounts[row.entity_type] = row.count;
          });

          resolve(statistics);
        })
        .catch(reject);
    });
  }

  /**
   * Execute a query and return results
   */
  private executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}