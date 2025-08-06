import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { DeleteQueryBuilderChain } from '../types';

export class DeleteQueryBuilder extends BaseQueryBuilder implements DeleteQueryBuilderChain {
  private tableName: string = '';
  private returningColumns: string[] = ['*'];

  /**
   * Creates a new DeleteQueryBuilder instance
   * @param {any} [transactionContext] - Optional transaction context
   */
  constructor(transactionContext?: any) {
    super(transactionContext);
  }

  /**
   * Sets the table to delete from
   * @param {string} table - Table name
   * @returns {DeleteQueryBuilderChain} Delete query builder chain for method chaining
   */
  public from(table: string): DeleteQueryBuilderChain {
    this.tableName = SQLHelper.sanitizeTableName(table);
    return this;
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {string} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   * @returns {DeleteQueryBuilderChain} Delete query builder chain for method chaining
   */
  public where(column: string, operator: string, value?: any): DeleteQueryBuilderChain {
    this.addWhereCondition(column, operator as any, value);
    return this;
  }

  /**
   * Adds a WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to match against
   * @returns {DeleteQueryBuilderChain} Delete query builder chain for method chaining
   */
  public whereIn(column: string, values: any[]): DeleteQueryBuilderChain {
    this.addWhereCondition(column, 'IN', values);
    return this;
  }

  /**
   * Adds a WHERE IS NULL condition to the query
   * @param {string} column - Column name
   * @returns {DeleteQueryBuilderChain} Delete query builder chain for method chaining
   */
  public whereNull(column: string): DeleteQueryBuilderChain {
    this.addWhereCondition(column, 'IS NULL');
    return this;
  }

  /**
   * Adds a WHERE IS NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {DeleteQueryBuilderChain} Delete query builder chain for method chaining
   */
  public whereNotNull(column: string): DeleteQueryBuilderChain {
    this.addWhereCondition(column, 'IS NOT NULL');
    return this;
  }

  /**
   * Sets the columns to return after delete
   * @param {string | string[]} [columns] - Columns to return (defaults to '*')
   * @returns {DeleteQueryBuilderChain} Delete query builder chain for method chaining
   */
  public returning(columns?: string | string[]): DeleteQueryBuilderChain {
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
   * Executes the DELETE query
   * @returns {Promise<T[]>} Deleted records (if returning is specified)
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
   * Builds the complete DELETE SQL query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When table name is missing
   */
  private buildQuery(): { sql: string; params: any[] } {
    if (!this.tableName) {
      throw new Error('Table name is required. Use .from() method.');
    }

    const tableClause = SQLHelper.escapeIdentifier(this.tableName);
    const whereClause = this.buildWhereClause();
    const returningClause = this.returningColumns.length > 0 
      ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : SQLHelper.buildColumnList(this.returningColumns)}`
      : '';

    let sql = `DELETE FROM ${tableClause}`;
    
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    sql += returningClause;

    return {
      sql,
      params: whereClause.params
    };
  }
} 