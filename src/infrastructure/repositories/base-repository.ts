import { DatabaseConnection } from '../connection/database-connection';
import { QueryResult } from '../../domain/entities/query-result';

/**
 * Base repository interface
 */
export interface IBaseRepository<T> {
  find(id: number | string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: number | string, data: Partial<T>): Promise<T | null>;
  delete(id: number | string): Promise<boolean>;
  count(): Promise<number>;
}

/**
 * Base repository implementation
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(
    protected connection: DatabaseConnection,
    tableName: string,
    primaryKey: string = 'id'
  ) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find a record by ID
   */
  async find(id: number | string): Promise<T | null> {
    const sql = this.connection.getSql();
    const result = await sql`
      SELECT * FROM ${sql(this.tableName)}
      WHERE ${sql(this.primaryKey)} = ${id}
      LIMIT 1
    `;
    
    return result.length > 0 ? result[0] as T : null;
  }

  /**
   * Find all records
   */
  async findAll(): Promise<T[]> {
    const sql = this.connection.getSql();
    const result = await sql`
      SELECT * FROM ${sql(this.tableName)}
    `;
    
    return result as T[];
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const sql = this.connection.getSql();
    const [result] = await sql`
      INSERT INTO ${sql(this.tableName)} ${sql(data)}
      RETURNING *
    `;
    
    return result as T;
  }

  /**
   * Update a record
   */
  async update(id: number | string, data: Partial<T>): Promise<T | null> {
    const sql = this.connection.getSql();
    const result = await sql`
      UPDATE ${sql(this.tableName)}
      SET ${sql(data)}
      WHERE ${sql(this.primaryKey)} = ${id}
      RETURNING *
    `;
    
    return result.length > 0 ? result[0] as T : null;
  }

  /**
   * Delete a record
   */
  async delete(id: number | string): Promise<boolean> {
    const sql = this.connection.getSql();
    const result = await sql`
      DELETE FROM ${sql(this.tableName)}
      WHERE ${sql(this.primaryKey)} = ${id}
    `;
    
    return result.length > 0;
  }

  /**
   * Count total records
   */
  async count(): Promise<number> {
    const sql = this.connection.getSql();
    const result = await sql`
      SELECT COUNT(*) as count FROM ${sql(this.tableName)}
    `;
    
    return result[0]?.count || 0;
  }

  /**
   * Execute a custom query
   */
  protected async executeQuery(query: string, params?: any[]): Promise<any[]> {
    return await this.connection.execute(query, params);
  }

  /**
   * Execute a transaction
   */
  protected async executeTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return await this.connection.transaction(async () => {
      return await callback();
    });
  }
} 