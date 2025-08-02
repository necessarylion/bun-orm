import { createConnection, getConnection } from './connection';
import { QueryBuilder } from '../query-builders/query-builder';
import { InsertQueryBuilder } from '../query-builders/insert-query-builder';
import { UpdateQueryBuilder } from '../query-builders/update-query-builder';
import { DeleteQueryBuilder } from '../query-builders/delete-query-builder';
import type { ConnectionConfig } from '../types';

export class Spark {
  private static instance: Spark;

  private constructor() {}

  public static getInstance(): Spark {
    if (!Spark.instance) {
      Spark.instance = new Spark();
    }
    return Spark.instance;
  }

  public static initialize(config: ConnectionConfig): Spark {
    createConnection(config);
    return Spark.getInstance();
  }

  // SELECT queries
  public select(columns?: string | string[]): QueryBuilder {
    const queryBuilder = new QueryBuilder();
    if (columns) {
      queryBuilder.select(columns);
    }
    return queryBuilder;
  }

  public from(table: string, alias?: string): QueryBuilder {
    return new QueryBuilder().from(table, alias);
  }

  public table(table: string, alias?: string): QueryBuilder {
    return new QueryBuilder().from(table, alias);
  }

  // INSERT queries
  public insert(data?: Record<string, any> | Record<string, any>[]): InsertQueryBuilder {
    const insertBuilder = new InsertQueryBuilder();
    if (data) {
      insertBuilder.values(data);
    }
    return insertBuilder;
  }

  // UPDATE queries
  public update(data?: Record<string, any>): UpdateQueryBuilder {
    const updateBuilder = new UpdateQueryBuilder();
    if (data) {
      updateBuilder.set(data);
    }
    return updateBuilder;
  }

  // DELETE queries
  public delete(): DeleteQueryBuilder {
    return new DeleteQueryBuilder();
  }

  // Raw SQL
  public raw(sql: string, params: any[] = []): Promise<any[]> {
    const connection = getConnection();
    return connection.getSQL().unsafe(sql, params);
  }

  // Schema operations
  public async createTable(tableName: string, callback: (table: any) => void): Promise<void> {
    // This is a simplified version - in a full implementation you'd want a schema builder
    console.warn('createTable is not fully implemented in this version');
  }

  public async dropTable(tableName: string): Promise<void> {
    const connection = getConnection();
    await connection.getSQL().unsafe(`DROP TABLE IF EXISTS "${tableName}"`);
  }

  public async hasTable(tableName: string): Promise<boolean> {
    const connection = getConnection();
    const result = await connection.getSQL().unsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      ) as exists
    `, [tableName]);
    return result[0]?.exists || false;
  }

  // Connection management
  public async testConnection(): Promise<boolean> {
    const connection = getConnection();
    return await connection.testConnection();
  }

  public async close(): Promise<void> {
    const connection = getConnection();
    await connection.close();
  }
}

// Convenience functions
export function spark(config?: ConnectionConfig): Spark {
  if (config) {
    return Spark.initialize(config);
  }
  return Spark.getInstance();
}

// Export individual query builders for direct use
export { QueryBuilder } from '../query-builders/query-builder';
export { InsertQueryBuilder } from '../query-builders/insert-query-builder';
export { UpdateQueryBuilder } from '../query-builders/update-query-builder';
export { DeleteQueryBuilder } from '../query-builders/delete-query-builder'; 