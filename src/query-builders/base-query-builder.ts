import { getConnection } from '../core/connection'
import { SQLHelper } from '../utils/sql-helper'
import type {
  WhereCondition,
  JoinCondition,
  OrderByCondition,
  GroupByCondition,
} from '../types'

export abstract class BaseQueryBuilder {
  protected sql: Bun.SQL
  protected whereConditions: WhereCondition[] = []
  protected joins: JoinCondition[] = []
  protected orderByConditions: OrderByCondition[] = []
  protected groupByConditions: GroupByCondition[] = []
  protected havingCondition: string = ''
  protected limitValue: number | null = null
  protected offsetValue: number | null = null
  protected distinctFlag: boolean = false

  /**
   * Creates a new BaseQueryBuilder instance
   * @param {Bun.SQL} [transactionContext] - Optional transaction context
   */
  constructor(transactionContext?: Bun.SQL) {
    this.sql = transactionContext ?? getConnection().getSQL()
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {'=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL'} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   */
  protected addWhereCondition(
    column: string,
    operator:
      | '='
      | '!='
      | '>'
      | '<'
      | '>='
      | '<='
      | 'LIKE'
      | 'ILIKE'
      | 'IN'
      | 'NOT IN'
      | 'IS NULL'
      | 'IS NOT NULL',
    value?: any
  ): void {
    this.whereConditions.push({ column, operator, value })
  }

  /**
   * Adds a JOIN clause to the query
   * @param {'INNER' | 'LEFT' | 'RIGHT' | 'FULL'} type - Type of join
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   */
  protected addJoin(
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL',
    table: string,
    on: string,
    alias?: string
  ): void {
    this.joins.push({ type, table, on, alias })
  }

  /**
   * Adds an ORDER BY clause to the query
   * @param {string} column - Column name to order by
   * @param {'ASC' | 'DESC'} [direction='ASC'] - Sort direction
   */
  protected addOrderBy(
    column: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): void {
    this.orderByConditions.push({ column, direction })
  }

  /**
   * Adds a GROUP BY clause to the query
   * @param {string} column - Column name to group by
   */
  protected addGroupBy(column: string): void {
    this.groupByConditions.push({ column })
  }

  /**
   * Builds the WHERE clause from conditions
   * @returns {{ sql: string; params: any[] }} SQL fragment and parameters
   */
  protected buildWhereClause(): { sql: string; params: any[] } {
    return SQLHelper.buildWhereConditions(this.whereConditions)
  }

  /**
   * Builds the JOIN clause from join conditions
   * @returns {string} SQL JOIN clause
   */
  protected buildJoinClause(): string {
    return SQLHelper.buildJoinClause(this.joins)
  }

  /**
   * Builds the ORDER BY clause from order conditions
   * @returns {string} SQL ORDER BY clause
   */
  protected buildOrderByClause(): string {
    return SQLHelper.buildOrderByClause(this.orderByConditions)
  }

  /**
   * Builds the GROUP BY clause from group conditions
   * @returns {string} SQL GROUP BY clause
   */
  protected buildGroupByClause(): string {
    return SQLHelper.buildGroupByClause(
      this.groupByConditions.map((g) => g.column)
    )
  }

  /**
   * Builds the LIMIT and OFFSET clause
   * @returns {string} SQL LIMIT/OFFSET clause
   */
  protected buildLimitOffsetClause(): string {
    let clause = ''
    if (this.limitValue !== null) {
      clause += ` LIMIT ${this.limitValue}`
    }
    if (this.offsetValue !== null) {
      clause += ` OFFSET ${this.offsetValue}`
    }
    return clause
  }

  /**
   * Builds the DISTINCT clause
   * @returns {string} SQL DISTINCT clause
   */
  protected buildDistinctClause(): string {
    return this.distinctFlag ? 'DISTINCT ' : ''
  }

  /**
   * Executes a query with the given SQL and parameters
   * @param {string} query - SQL query string
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<T[]>} Query results
   */
  protected async executeQuery<T = any>(
    query: string,
    params: any[] = []
  ): Promise<T[]> {
    try {
      const result = await this.sql.unsafe(query, params)
      return result
    } catch (error) {
      console.error('Query execution error:', error)
      throw error
    }
  }

  /**
   * Executes a COUNT query
   * @param {string} [column='*'] - Column to count
   * @returns {Promise<number>} Count result
   */
  protected async executeCountQuery(column: string = '*'): Promise<number> {
    const countQuery = `SELECT COUNT(${column}) as count`
    const result = await this.executeQuery<{ count: number }>(countQuery)
    return result[0]?.count || 0
  }

  /**
   * Returns the raw SQL query and parameters (must be implemented by subclasses)
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When not implemented by subclass
   */
  public raw(): { sql: string; params: any[] } {
    throw new Error('raw() method must be implemented by subclasses')
  }

  /**
   * Sets the transaction context (used internally)
   * @param {any} context - Transaction context
   */
  public setTransactionContext(context: Bun.SQL): void {
    this.sql = context
  }
}
