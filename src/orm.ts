import { DatabaseConnection, type DatabaseConfig } from './infrastructure/connection/database-connection';
import { QueryBuilder, InsertQueryBuilder, UpdateQueryBuilder, DeleteQueryBuilder } from './application/services';
import { Table, Column } from './domain/value-objects';

/**
 * Main ORM class providing a unified interface for database operations
 */
export class BunORM {
  private connection: DatabaseConnection;

  constructor(config: DatabaseConfig) {
    this.connection = DatabaseConnection.getInstance(config);
  }

  /**
   * Initialize the database connection
   */
  async connect(): Promise<void> {
    await this.connection.connect();
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  /**
   * Create a new query builder instance
   */
  query<T = any>(): QueryBuilder<T> {
    return new QueryBuilder<T>(this.connection);
  }

  /**
   * Create a new insert query builder instance
   */
  insert<T = any>(): InsertQueryBuilder<T> {
    return new InsertQueryBuilder<T>(this.connection);
  }

  /**
   * Create a new update query builder instance
   */
  update<T = any>(): UpdateQueryBuilder<T> {
    return new UpdateQueryBuilder<T>(this.connection);
  }

  /**
   * Create a new delete query builder instance
   */
  delete<T = any>(): DeleteQueryBuilder<T> {
    return new DeleteQueryBuilder<T>(this.connection);
  }

  /**
   * Create a table reference
   */
  table(name: string, schema?: string): Table {
    return new Table(name, schema);
  }

  /**
   * Create a column reference
   */
  column(name: string, table?: string): Column {
    return new Column(name, table);
  }

  /**
   * Execute a raw SQL query
   */
  async raw<T = any>(query: string, params?: any[]): Promise<T[]> {
    return await this.connection.execute<T>(query, params);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (orm: BunORM) => Promise<T>): Promise<T> {
    return await this.connection.transaction(async () => {
      return await callback(this);
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection.isConnected();
  }

  /**
   * Get connection configuration
   */
  getConfig(): DatabaseConfig {
    return this.connection.getConfig();
  }
}

/**
 * Factory function to create a new ORM instance
 */
export function createORM(config: DatabaseConfig): BunORM {
  return new BunORM(config);
}

/**
 * Default ORM instance (singleton pattern)
 */
let defaultORM: BunORM | null = null;

/**
 * Initialize the default ORM instance
 */
export function initializeORM(config: DatabaseConfig): BunORM {
  if (!defaultORM) {
    defaultORM = new BunORM(config);
  }
  return defaultORM;
}

/**
 * Get the default ORM instance
 */
export function getORM(): BunORM {
  if (!defaultORM) {
    throw new Error('ORM not initialized. Call initializeORM(config) first.');
  }
  return defaultORM;
} 