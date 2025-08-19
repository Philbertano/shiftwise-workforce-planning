import { Database } from 'sqlite3';
import { Pool, PoolClient } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql';
  connectionString: string;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export interface TransactionContext {
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  run: (sql: string, params?: any[]) => Promise<void>;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private config: DatabaseConfig;
  private sqliteDb?: Database;
  private pgPool?: Pool;
  private isConnected: boolean = false;
  private connectionPromise?: Promise<void>;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private loadConfig(): DatabaseConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (nodeEnv === 'production' && process.env.POSTGRES_URL) {
      return {
        type: 'postgresql',
        connectionString: process.env.POSTGRES_URL,
        pool: {
          min: parseInt(process.env.DB_POOL_MIN || '2'),
          max: parseInt(process.env.DB_POOL_MAX || '10'),
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
          connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
          acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000')
        },
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000')
      };
    }

    // Default to SQLite for development
    const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || './data/shiftwise.db';
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return {
      type: 'sqlite',
      connectionString: dbPath,
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.performConnection();
    return this.connectionPromise;
  }

  private async performConnection(): Promise<void> {
    const maxRetries = this.config.retryAttempts || 3;
    const retryDelay = this.config.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.config.type === 'sqlite') {
          await this.connectSQLite();
        } else {
          await this.connectPostgreSQL();
        }
        
        this.isConnected = true;
        console.log(`Database connected successfully (${this.config.type})`);
        return;
      } catch (error) {
        console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error}`);
        }
        
        await this.sleep(retryDelay * attempt);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async connectSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sqliteDb = new Database(this.config.connectionString, (err) => {
        if (err) {
          reject(err);
        } else {
          // Configure SQLite for better performance and reliability
          this.sqliteDb!.serialize(() => {
            this.sqliteDb!.run('PRAGMA foreign_keys = ON');
            this.sqliteDb!.run('PRAGMA journal_mode = WAL');
            this.sqliteDb!.run('PRAGMA synchronous = NORMAL');
            this.sqliteDb!.run('PRAGMA cache_size = 1000');
            this.sqliteDb!.run('PRAGMA temp_store = MEMORY');
            resolve();
          });
        }
      });
    });
  }

  private async connectPostgreSQL(): Promise<void> {
    this.pgPool = new Pool({
      connectionString: this.config.connectionString,
      min: this.config.pool?.min || 2,
      max: this.config.pool?.max || 10,
      idleTimeoutMillis: this.config.pool?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.config.pool?.connectionTimeoutMillis || 5000,
      acquireTimeoutMillis: this.config.pool?.acquireTimeoutMillis || 10000,
      statement_timeout: 30000,
      query_timeout: 30000
    });

    // Set up error handling
    this.pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
      this.isConnected = false;
    });

    this.pgPool.on('connect', () => {
      console.log('New PostgreSQL client connected');
    });

    // Test connection
    const client = await this.pgPool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  public async query(sql: string, params: any[] = []): Promise<any[]> {
    await this.ensureConnected();
    
    try {
      if (this.config.type === 'sqlite') {
        return this.querySQLite(sql, params);
      } else {
        return this.queryPostgreSQL(sql, params);
      }
    } catch (error) {
      console.error('Database query error:', { sql: sql.substring(0, 100), params, error });
      throw error;
    }
  }

  public async queryWithResult(sql: string, params: any[] = []): Promise<QueryResult> {
    await this.ensureConnected();
    
    try {
      if (this.config.type === 'sqlite') {
        const rows = await this.querySQLite(sql, params);
        return { rows, rowCount: rows.length };
      } else {
        return this.queryPostgreSQLWithResult(sql, params);
      }
    } catch (error) {
      console.error('Database query error:', { sql: sql.substring(0, 100), params, error });
      throw error;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private async querySQLite(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  private async queryPostgreSQL(sql: string, params: any[] = []): Promise<any[]> {
    const client = await this.pgPool!.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private async queryPostgreSQLWithResult(sql: string, params: any[] = []): Promise<QueryResult> {
    const client = await this.pgPool!.connect();
    try {
      const result = await client.query(sql, params);
      return { rows: result.rows, rowCount: result.rowCount || 0 };
    } finally {
      client.release();
    }
  }

  public async run(sql: string, params: any[] = []): Promise<void> {
    await this.ensureConnected();
    
    try {
      if (this.config.type === 'sqlite') {
        return this.runSQLite(sql, params);
      } else {
        await this.queryPostgreSQL(sql, params);
      }
    } catch (error) {
      console.error('Database run error:', { sql: sql.substring(0, 100), params, error });
      throw error;
    }
  }

  private async runSQLite(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.run(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async close(): Promise<void> {
    this.isConnected = false;
    this.connectionPromise = undefined;

    if (this.sqliteDb) {
      return new Promise((resolve) => {
        this.sqliteDb!.close(() => {
          console.log('SQLite database connection closed');
          resolve();
        });
      });
    }
    
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('PostgreSQL pool closed');
    }
  }

  public async transaction<T>(callback: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    await this.ensureConnected();

    if (this.config.type === 'sqlite') {
      return this.transactionSQLite(callback);
    } else {
      return this.transactionPostgreSQL(callback);
    }
  }

  private async transactionSQLite<T>(callback: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.serialize(async () => {
        try {
          await this.runSQLite('BEGIN TRANSACTION');
          
          const ctx: TransactionContext = {
            query: async (sql: string, params: any[] = []) => {
              const rows = await this.querySQLite(sql, params);
              return { rows, rowCount: rows.length };
            },
            run: async (sql: string, params: any[] = []) => {
              await this.runSQLite(sql, params);
            }
          };

          const result = await callback(ctx);
          await this.runSQLite('COMMIT');
          resolve(result);
        } catch (error) {
          try {
            await this.runSQLite('ROLLBACK');
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
          reject(error);
        }
      });
    });
  }

  private async transactionPostgreSQL<T>(callback: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pgPool!.connect();
    
    try {
      await client.query('BEGIN');
      
      const ctx: TransactionContext = {
        query: async (sql: string, params: any[] = []) => {
          const result = await client.query(sql, params);
          return { rows: result.rows, rowCount: result.rowCount || 0 };
        },
        run: async (sql: string, params: any[] = []) => {
          await client.query(sql, params);
        }
      };

      const result = await callback(ctx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      await this.ensureConnected();
      
      if (this.config.type === 'sqlite') {
        await this.querySQLite('SELECT 1');
      } else {
        await this.queryPostgreSQL('SELECT 1');
      }

      return {
        healthy: true,
        details: {
          type: this.config.type,
          connected: this.isConnected,
          poolSize: this.config.type === 'postgresql' ? {
            total: this.pgPool?.totalCount || 0,
            idle: this.pgPool?.idleCount || 0,
            waiting: this.pgPool?.waitingCount || 0
          } : null
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          type: this.config.type,
          connected: this.isConnected,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public getConfig(): DatabaseConfig {
    return this.config;
  }

  // Static convenience methods for testing
  public static async initialize(): Promise<void> {
    const instance = DatabaseManager.getInstance();
    await instance.connect();
  }

  public static async query(sql: string, params: any[] = []): Promise<any[]> {
    const instance = DatabaseManager.getInstance();
    return instance.query(sql, params);
  }

  public static async run(sql: string, params: any[] = []): Promise<void> {
    const instance = DatabaseManager.getInstance();
    return instance.run(sql, params);
  }

  public static async close(): Promise<void> {
    const instance = DatabaseManager.getInstance();
    return instance.close();
  }

  public static async runMigrations(): Promise<void> {
    const { runMigrations } = await import('./migrate');
    return runMigrations();
  }
}