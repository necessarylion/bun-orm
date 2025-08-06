import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { InsertQueryBuilderChain } from '../types';

export class InsertQueryBuilder extends BaseQueryBuilder implements InsertQueryBuilderChain {
  private tableName: string = '';
  private insertData: Record<string, any>[] = [];
  private returningColumns: string[] = ['*'];

  /**
   * Creates a new InsertQueryBuilder instance
   * @param {any} [transactionContext] - Optional transaction context
   */
  constructor(transactionContext?: any) {
    super(transactionContext);
  }

  /**
   * Sets the table to insert into
   * @param {string} table - Table name
   * @returns {InsertQueryBuilderChain} Insert query builder chain for method chaining
   */
  public into(table: string): InsertQueryBuilderChain {
    this.tableName = SQLHelper.sanitizeTableName(table);
    return this;
  }

  /**
   * Sets the data to insert
   * @param {Record<string, any> | Record<string, any>[]} data - Data to insert (single object or array of objects)
   * @returns {InsertQueryBuilderChain} Insert query builder chain for method chaining
   */
  public values(data: Record<string, any> | Record<string, any>[]): InsertQueryBuilderChain {
    if (Array.isArray(data)) {
      this.insertData = data;
    } else {
      this.insertData = [data];
    }
    return this;
  }

  /**
   * Sets the columns to return after insert
   * @param {string | string[]} [columns] - Columns to return (defaults to '*')
   * @returns {InsertQueryBuilderChain} Insert query builder chain for method chaining
   */
  public returning(columns?: string | string[]): InsertQueryBuilderChain {
    if (!columns) {
      this.returningColumns = ['*'];
    } else if (Array.isArray(columns)) {
      this.returningColumns = columns;
    } else {
      this.returningColumns = [columns];
    }
    return this;
  }

  /**
   * Executes the INSERT query
   * @returns {Promise<T[]>} Inserted records (if returning is specified)
   */
  public async execute<T = any>(): Promise<T[]> {
    const query = this.buildQuery();
    return await this.executeQuery<T>(query.sql, query.params);
  }

  /**
   * Returns the raw SQL query and parameters
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  public override raw(): { sql: string; params: any[] } {
    return this.buildQuery();
  }

  /**
   * Builds the complete INSERT SQL query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When table name or data is missing
   */
  private buildQuery(): { sql: string; params: any[] } {
    if (!this.tableName) {
      throw new Error('Table name is required. Use .into() method.');
    }

    if (this.insertData.length === 0) {
      throw new Error('No data provided for insert. Use .values() method.');
    }

    const { columns, placeholders, params } = SQLHelper.buildInsertValues(this.insertData);
    const tableClause = SQLHelper.escapeIdentifier(this.tableName);
    const returningClause = this.returningColumns.length > 0 
      ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : SQLHelper.buildColumnList(this.returningColumns)}`
      : '';

    const sql = `INSERT INTO ${tableClause} (${columns}) VALUES ${placeholders}${returningClause}`;

    return { sql, params };
  }
} 