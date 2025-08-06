import { SQL } from 'bun';
import type { ConnectionConfig } from '../types';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private sqlInstance: Bun.SQL;
  private config: ConnectionConfig;

  private constructor(config: ConnectionConfig) {
    this.config = config;
    this.sqlInstance = new SQL(config)
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

  public getSQL(): Bun.SQL {
    return this.sqlInstance;
  }

  public getConfig(): ConnectionConfig {
    return this.config;
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