import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { UpdateQueryBuilderChain } from '../types';

export class UpdateQueryBuilder extends BaseQueryBuilder implements UpdateQueryBuilderChain {
  private tableName: string = '';
  private updateData: Record<string, any> = {};
  private returningColumns: string[] = [];

  /**
   * Creates a new UpdateQueryBuilder instance
   * @param {any} [transactionContext] - Optional transaction context
   */
  constructor(transactionContext?: any) {
    super(transactionContext);
  }

  /**
   * Sets the table to update
   * @param {string} table - Table name
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public table(table: string): UpdateQueryBuilderChain {
    this.tableName = SQLHelper.sanitizeTableName(table);
    return this;
  }

  /**
   * Sets the data to update
   * @param {Record<string, any>} data - Data to update
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public set(data: Record<string, any>): UpdateQueryBuilderChain {
    this.updateData = data;
    return this;
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {string} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public where(column: string, operator: string, value?: any): UpdateQueryBuilderChain {
    this.addWhereCondition(column, operator as any, value);
    return this;
  }

  /**
   * Adds a WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to match against
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public whereIn(column: string, values: any[]): UpdateQueryBuilderChain {
    this.addWhereCondition(column, 'IN', values);
    return this;
  }

  /**
   * Adds a WHERE IS NULL condition to the query
   * @param {string} column - Column name
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public whereNull(column: string): UpdateQueryBuilderChain {
    this.addWhereCondition(column, 'IS NULL');
    return this;
  }

  /**
   * Adds a WHERE IS NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public whereNotNull(column: string): UpdateQueryBuilderChain {
    this.addWhereCondition(column, 'IS NOT NULL');
    return this;
  }

  /**
   * Sets the columns to return after update
   * @param {string | string[]} [columns] - Columns to return (defaults to '*')
   * @returns {UpdateQueryBuilderChain} Update query builder chain for method chaining
   */
  public returning(columns?: string | string[]): UpdateQueryBuilderChain {
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
   * Executes the UPDATE query
   * @returns {Promise<T[]>} Updated records (if returning is specified)
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
   * Builds the complete UPDATE SQL query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When table name or data is missing
   */
  private buildQuery(): { sql: string; params: any[] } {
    if (!this.tableName) {
      throw new Error('Table name is required. Use .table() method.');
    }

    if (Object.keys(this.updateData).length === 0) {
      throw new Error('No data provided for update. Use .set() method.');
    }

    const tableClause = SQLHelper.escapeIdentifier(this.tableName);
    const { sql: setClause, params: setParams } = SQLHelper.buildSetClause(this.updateData);
    const whereClause = this.buildWhereClause();
    const returningClause = this.returningColumns.length > 0 
      ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : SQLHelper.buildColumnList(this.returningColumns)}`
      : '';

    let sql = `UPDATE ${tableClause} SET ${setClause}`;
    
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    sql += returningClause;

    // Need to adjust the parameter numbers in the WHERE clause
    let finalSql = sql;
    const finalParams = [...setParams];
    
    if (whereClause.sql) {
      // Replace parameter placeholders in WHERE clause to account for SET parameters
      let whereSql = whereClause.sql;
      const whereParams = [...whereClause.params];
      
      // Sort the replacements by parameter number (descending) to avoid conflicts
      const replacements: Array<{ old: string; new: string; index: number }> = [];
      for (let i = 0; i < whereParams.length; i++) {
        const oldPlaceholder = `$${i + 1}`;
        const newPlaceholder = `$${setParams.length + i + 1}`;
        replacements.push({ old: oldPlaceholder, new: newPlaceholder, index: i });
      }
      
      // Sort by index descending to replace from highest to lowest
      replacements.sort((a, b) => b.index - a.index);
      
      for (const replacement of replacements) {
        whereSql = whereSql.replace(new RegExp(`\\${replacement.old}(?!\\d)`, 'g'), replacement.new);
      }
      
      finalSql = finalSql.replace(whereClause.sql, whereSql);
      finalParams.push(...whereParams);
    }

    return {
      sql: finalSql,
      params: finalParams
    };
  }
} 