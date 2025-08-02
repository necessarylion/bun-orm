import { sql } from 'bun';
import type { ConnectionConfig } from '../types';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private sqlInstance: any;
  private config: ConnectionConfig;

  private constructor(config: ConnectionConfig) {
    this.config = config;
    this.initialize();
  }

  public static getInstance(config?: ConnectionConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration is required for first initialization');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  private initialize(): void {
    // Bun's SQL automatically uses environment variables
    // We'll set them programmatically for our connection
    process.env.PGHOST = this.config.host;
    process.env.PGPORT = this.config.port.toString();
    process.env.PGDATABASE = this.config.database;
    process.env.PGUSER = this.config.username;
    process.env.PGPASSWORD = this.config.password;

    if (this.config.ssl) {
      process.env.PGSSLMODE = 'require';
    }

    // Initialize the SQL instance
    this.sqlInstance = sql;
  }

  public getSQL(): any {
    return this.sqlInstance;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.sqlInstance`SELECT 1 as test`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.sqlInstance.close();
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

export function createConnection(config: ConnectionConfig): DatabaseConnection {
  return DatabaseConnection.getInstance(config);
}

export function getConnection(): DatabaseConnection {
  return DatabaseConnection.getInstance();
} 