import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { QueryBuilderChain, SelectColumn } from '../types';

export class QueryBuilder extends BaseQueryBuilder implements QueryBuilderChain {
  private selectColumns: string[] = ['*'];
  private fromTable: string = '';
  private fromAlias: string = '';

  /**
   * Creates a new QueryBuilder instance
   * @param {any} [transactionContext] - Optional transaction context
   */
  constructor(transactionContext?: any) {
    super(transactionContext);
  }

  /**
   * Sets the columns to select in the query
   * @param {SelectColumn | SelectColumn[]} [columns] - Columns to select (defaults to '*')
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public select(columns?: SelectColumn | SelectColumn[]): QueryBuilderChain {
    if (!columns) {
      this.selectColumns = ['*'];
      return this;
    }

    if (Array.isArray(columns)) {
      this.selectColumns = columns.map(col => {
        if (typeof col === 'string') {
          return col;
        } else {
          // Handle object format like { alias: 'column' }
          const [alias, column] = Object.entries(col)[0] as [string, string];
          return `${SQLHelper.escapeIdentifier(column)} AS ${SQLHelper.escapeIdentifier(alias)}`;
        }
      });
    } else if (typeof columns === 'string') {
      this.selectColumns = [columns];
    } else {
      // Handle object format
      this.selectColumns = Object.entries(columns).map(([alias, column]) => 
        `${SQLHelper.escapeIdentifier(column)} AS ${SQLHelper.escapeIdentifier(alias)}`
      );
    }

    return this;
  }

  /**
   * Sets the table to query from
   * @param {string} table - Table name
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public from(table: string, alias?: string): QueryBuilder {
    this.fromTable = SQLHelper.sanitizeTableName(table);
    this.fromAlias = alias ? SQLHelper.sanitizeTableName(alias) : '';
    return this;
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {string} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public where(column: string, operator: string, value?: any): QueryBuilderChain {
    this.addWhereCondition(column, operator as any, value);
    return this;
  }

  /**
   * Adds a WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to match against
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public whereIn(column: string, values: any[]): QueryBuilderChain {
    this.addWhereCondition(column, 'IN', values);
    return this;
  }

  /**
   * Adds a WHERE NOT IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to exclude
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public whereNotIn(column: string, values: any[]): QueryBuilderChain {
    this.addWhereCondition(column, 'NOT IN', values);
    return this;
  }

  /**
   * Adds a WHERE IS NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public whereNull(column: string): QueryBuilderChain {
    this.addWhereCondition(column, 'IS NULL');
    return this;
  }

  /**
   * Adds a WHERE IS NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public whereNotNull(column: string): QueryBuilderChain {
    this.addWhereCondition(column, 'IS NOT NULL');
    return this;
  }

  /**
   * Adds an INNER JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public join(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('INNER', table, on, alias);
    return this;
  }

  /**
   * Adds a LEFT JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public leftJoin(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('LEFT', table, on, alias);
    return this;
  }

  /**
   * Adds a RIGHT JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public rightJoin(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('RIGHT', table, on, alias);
    return this;
  }

  /**
   * Adds a FULL JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public fullJoin(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('FULL', table, on, alias);
    return this;
  }

  /**
   * Adds an ORDER BY clause to the query
   * @param {string} column - Column name to order by
   * @param {'ASC' | 'DESC'} [direction='ASC'] - Sort direction
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilderChain {
    this.addOrderBy(column, direction);
    return this;
  }

  /**
   * Adds a GROUP BY clause to the query
   * @param {string} column - Column name to group by
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public groupBy(column: string): QueryBuilderChain {
    this.addGroupBy(column);
    return this;
  }

  /**
   * Adds a HAVING clause to the query
   * @param {string} condition - HAVING condition
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public having(condition: string): QueryBuilderChain {
    this.havingCondition = condition;
    return this;
  }

  /**
   * Adds a LIMIT clause to the query
   * @param {number} count - Number of rows to limit
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public limit(count: number): QueryBuilderChain {
    this.limitValue = count;
    return this;
  }

  /**
   * Adds an OFFSET clause to the query
   * @param {number} count - Number of rows to offset
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public offset(count: number): QueryBuilderChain {
    this.offsetValue = count;
    return this;
  }

  /**
   * Adds DISTINCT to the query
   * @returns {QueryBuilderChain} Query builder chain for method chaining
   */
  public distinct(): QueryBuilderChain {
    this.distinctFlag = true;
    return this;
  }

  /**
   * Executes a COUNT query
   * @param {string} [column='*'] - Column to count
   * @returns {Promise<number>} Count result
   */
  public async count(column: string = '*'): Promise<number> {
    const originalSelect = this.selectColumns;
    this.selectColumns = [`COUNT(${column}) as count`];
    
    const query = this.buildQuery();
    const result = await this.executeQuery<{ count: string | number }>(query.sql, query.params);
    
    // Restore original select
    this.selectColumns = originalSelect;
    
    const count = result[0]?.count || 0;
    return typeof count === 'string' ? parseInt(count, 10) : count;
  }

  /**
   * Executes the query and returns the first result
   * @returns {Promise<T | null>} First result or null if no results
   */
  public async first<T = any>(): Promise<T | null> {
    const originalLimit = this.limitValue;
    this.limitValue = 1;
    
    const query = this.buildQuery();
    const result = await this.executeQuery<T>(query.sql, query.params);
    
    // Restore original limit
    this.limitValue = originalLimit;
    
    return result[0] || null;
  }

  /**
   * Executes the query and returns all results
   * @returns {Promise<T[]>} Array of results
   */
  public async get<T = any>(): Promise<T[]> {
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
   * Builds the complete SQL query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When FROM clause is missing
   */
  private buildQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('FROM clause is required');
    }

    const distinctClause = this.buildDistinctClause();
    const selectClause = this.selectColumns.join(', ');
    const fromClause = this.fromAlias 
      ? `${SQLHelper.escapeIdentifier(this.fromTable)} AS ${SQLHelper.escapeIdentifier(this.fromAlias)}`
      : SQLHelper.escapeIdentifier(this.fromTable);
    
    const joinClause = this.buildJoinClause();
    const whereClause = this.buildWhereClause();
    const groupByClause = this.buildGroupByClause();
    const havingClause = this.havingCondition ? ` HAVING ${this.havingCondition}` : '';
    const orderByClause = this.buildOrderByClause();
    const limitOffsetClause = this.buildLimitOffsetClause();

    let sql = `SELECT ${distinctClause}${selectClause} FROM ${fromClause}`;
    
    if (joinClause) {
      sql += ` ${joinClause}`;
    }
    
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    if (groupByClause) {
      sql += ` GROUP BY ${groupByClause}`;
    }
    
    sql += havingClause;
    
    if (orderByClause) {
      sql += ` ORDER BY ${orderByClause}`;
    }
    
    sql += limitOffsetClause;

    return {
      sql,
      params: whereClause.params
    };
  }
} 