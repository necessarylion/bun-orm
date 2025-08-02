import { DatabaseConnection } from '../../infrastructure/connection/database-connection';
import { QueryResult } from '../../domain/entities/query-result';

/**
 * Insert query builder for PostgreSQL using Bun's SQL API
 */
export class InsertQueryBuilder<T = any> {
  private table: string = '';
  private _columns: string[] = [];
  private _values: any[][] = [];
  private returningColumns: string[] = [];

  constructor(private connection: DatabaseConnection) {}

  /**
   * Set the table to insert into
   */
  into(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * Set the columns to insert
   */
  columns(...columns: string[]): this {
    this._columns = columns;
    return this;
  }

  /**
   * Add a single row of values
   */
  values(...values: any[]): this {
    if (this._columns.length > 0 && values.length !== this._columns.length) {
      throw new Error(`Expected ${this._columns.length} values, got ${values.length}`);
    }
    this._values.push(values);
    return this;
  }

  /**
   * Add multiple rows of values
   */
  valuesBatch(valuesArray: any[][]): this {
    for (const values of valuesArray) {
      this._values.push(values);
    }
    return this;
  }

  /**
   * Insert a single object
   */
  insert(data: Partial<T>): this {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (this._columns.length === 0) {
      this._columns = keys;
    }
    
    this._values.push(values);
    return this;
  }

  /**
   * Insert multiple objects
   */
  insertMany(dataArray: Partial<T>[]): this {
    for (const data of dataArray) {
      this.insert(data);
    }
    return this;
  }

  /**
   * Set columns to return after insert
   */
  returning(...columns: string[]): this {
    this.returningColumns = columns.length > 0 ? columns : [];
    return this;
  }

  /**
   * Build the INSERT query
   */
  private buildQuery(): { query: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    const params: any[] = [];
    let paramIndex = 0;

    // Build the INSERT statement
    let query = `INSERT INTO ${this.table}`;

    // Add columns if specified
    if (this._columns.length > 0) {
      query += ` (${this._columns.join(', ')})`;
    }

    // Add VALUES clause
    if (this._values.length === 0) {
      // For SQL generation without values, use placeholder
      query += ` VALUES ()`;
    } else {
      const valueClauses = this._values.map(row => {
        const placeholders = row.map(() => `$${++paramIndex}`).join(', ');
        params.push(...row);
        return `(${placeholders})`;
      });

      query += ` VALUES ${valueClauses.join(', ')}`;
    }

    // Add RETURNING clause
    if (this.returningColumns.length > 0) {
      query += ` RETURNING ${this.returningColumns.join(', ')}`;
    }

    return { query, params };
  }

  /**
   * Execute the INSERT query
   */
  async execute(): Promise<QueryResult<T>> {
    if (this._values.length === 0) {
      throw new Error('No values to insert');
    }
    
    const { query, params } = this.buildQuery();
    const sql = this.connection.getSql();
    
    try {
      const result = sql.prepare(query).all(params);
      return new QueryResult<T>(
        result as T[], 
        result.length, 
        result.length,
        result.length > 0 ? result[0]?.id : undefined
      );
    } catch (error) {
      throw new Error(`Insert query execution failed: ${error}`);
    }
  }

  /**
   * Get the raw SQL query
   */
  toSql(): string {
    return this.buildQuery().query;
  }

  /**
   * Reset the insert query builder
   */
  reset(): this {
    this.table = '';
    this._columns = [];
    this._values = [];
    this.returningColumns = [];
    return this;
  }
} 