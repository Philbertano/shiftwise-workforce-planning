#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { DatabaseManager } from './config';

interface Migration {
  version: string;
  name: string;
  sql: string;
  checksum: string;
}

interface MigrationRecord {
  version: string;
  name: string;
  checksum: string;
  executed_at: Date;
}

export class MigrationManager {
  private dbManager: DatabaseManager;
  private migrationsPath: string;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async runMigrations(): Promise<void> {
    console.log('Starting database migrations...');
    
    try {
      await this.dbManager.connect();
      await this.ensureMigrationsTable();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations found.');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('Database migrations completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.dbManager.run(sql);
  }

  private async getPendingMigrations(): Promise<Migration[]> {
    // First, run the initial schema if no migrations exist
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      return [await this.getInitialSchemaMigration()];
    }

    // Load migration files from migrations directory
    const migrationFiles = this.loadMigrationFiles();
    const pendingMigrations: Migration[] = [];

    for (const migration of migrationFiles) {
      const executed = executedMigrations.find(m => m.version === migration.version);
      
      if (!executed) {
        pendingMigrations.push(migration);
      } else if (executed.checksum !== migration.checksum) {
        throw new Error(`Migration ${migration.version} has been modified after execution. Checksum mismatch.`);
      }
    }

    return pendingMigrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const rows = await this.dbManager.query(
        'SELECT version, name, checksum, executed_at FROM schema_migrations ORDER BY version'
      );
      
      return rows.map(row => ({
        version: row.version,
        name: row.name,
        checksum: row.checksum,
        executed_at: new Date(row.executed_at)
      }));
    } catch (error) {
      // Table doesn't exist yet
      return [];
    }
  }

  private async getInitialSchemaMigration(): Migration {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const checksum = this.calculateChecksum(sql);
    
    return {
      version: '001_initial_schema',
      name: 'Initial database schema',
      sql,
      checksum
    };
  }

  private loadMigrationFiles(): Migration[] {
    const migrations: Migration[] = [];
    
    if (!fs.existsSync(this.migrationsPath)) {
      return migrations;
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(this.migrationsPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const version = file.replace('.sql', '');
      const name = this.extractMigrationName(version);
      const checksum = this.calculateChecksum(sql);

      migrations.push({ version, name, sql, checksum });
    }

    return migrations;
  }

  private extractMigrationName(version: string): string {
    // Extract name from version like "002_add_user_preferences" -> "Add user preferences"
    const parts = version.split('_').slice(1);
    return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private async executeMigration(migration: Migration): Promise<void> {
    console.log(`Executing migration: ${migration.version} - ${migration.name}`);
    
    await this.dbManager.transaction(async (ctx) => {
      // Split SQL into statements and execute each one
      const statements = migration.sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        try {
          await ctx.run(statement);
        } catch (error) {
          console.error(`Error executing statement in migration ${migration.version}:`);
          console.error(statement.substring(0, 200) + '...');
          throw error;
        }
      }

      // Record the migration
      await ctx.run(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)',
        [migration.version, migration.name, migration.checksum]
      );
    });

    console.log(`✓ Migration ${migration.version} completed`);
  }

  async rollback(targetVersion?: string): Promise<void> {
    console.log('Rolling back migrations...');
    
    try {
      await this.dbManager.connect();
      
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }

      // Find migrations to rollback
      const migrationsToRollback = targetVersion
        ? executedMigrations.filter(m => m.version > targetVersion).reverse()
        : [executedMigrations[executedMigrations.length - 1]];

      for (const migration of migrationsToRollback) {
        await this.rollbackMigration(migration);
      }
      
      console.log('Rollback completed successfully!');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  private async rollbackMigration(migration: MigrationRecord): Promise<void> {
    console.log(`Rolling back migration: ${migration.version} - ${migration.name}`);
    
    // Look for rollback file
    const rollbackPath = path.join(this.migrationsPath, `${migration.version}.rollback.sql`);
    
    if (!fs.existsSync(rollbackPath)) {
      throw new Error(`Rollback file not found for migration ${migration.version}`);
    }

    const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
    
    await this.dbManager.transaction(async (ctx) => {
      const statements = rollbackSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await ctx.run(statement);
      }

      // Remove migration record
      await ctx.run('DELETE FROM schema_migrations WHERE version = ?', [migration.version]);
    });

    console.log(`✓ Migration ${migration.version} rolled back`);
  }

  async getStatus(): Promise<{ executed: MigrationRecord[]; pending: Migration[] }> {
    await this.dbManager.connect();
    await this.ensureMigrationsTable();
    
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    
    return { executed, pending };
  }
}

async function runMigrations() {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      await DatabaseManager.getInstance().close();
    }
  }
}

async function rollbackMigrations(targetVersion?: string) {
  const migrationManager = new MigrationManager();
  
  try {
    await migrationManager.rollback(targetVersion);
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await DatabaseManager.getInstance().close();
  }
}

async function migrationStatus() {
  const migrationManager = new MigrationManager();
  
  try {
    const status = await migrationManager.getStatus();
    
    console.log('\n=== Migration Status ===');
    console.log(`Executed migrations: ${status.executed.length}`);
    status.executed.forEach(m => {
      console.log(`  ✓ ${m.version} - ${m.name} (${m.executed_at.toISOString()})`);
    });
    
    console.log(`\nPending migrations: ${status.pending.length}`);
    status.pending.forEach(m => {
      console.log(`  ○ ${m.version} - ${m.name}`);
    });
  } catch (error) {
    console.error('Failed to get migration status:', error);
    process.exit(1);
  } finally {
    await DatabaseManager.getInstance().close();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'up':
    case 'migrate':
      runMigrations();
      break;
    case 'down':
    case 'rollback':
      rollbackMigrations(arg);
      break;
    case 'status':
      migrationStatus();
      break;
    default:
      console.log('Usage: tsx migrate.ts [up|down|status] [target_version]');
      console.log('  up/migrate: Run pending migrations');
      console.log('  down/rollback [version]: Rollback to target version (or last migration)');
      console.log('  status: Show migration status');
      process.exit(1);
  }
}

export { runMigrations, rollbackMigrations, migrationStatus };