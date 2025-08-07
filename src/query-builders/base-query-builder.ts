import { getConnection } from '../core/connection'
import { SQLHelper } from '../utils/sql-helper'
import type {
  WhereCondition,
  JoinCondition,
  OrderByCondition,
  GroupByCondition,
  FullWhereOperators,
  JoinType,
  OrderDirection,
} from '../types'

export abstract class BaseQueryBuilder {
  protected sql: Bun.SQL
  protected whereRawConditions: Array<{ sql: string; params: any[] }> = []
  protected whereConditions: WhereCondition[] = []
  protected joins: JoinCondition[] = []
  protected orderByConditions: OrderByCondition[] = []
  protected groupByConditions: GroupByCondition[] = []
  protected havingCondition: string = ''
  protected limitValue: number | null = null
  protected offsetValue: number | null = null
  protected distinctFlag: boolean = false
  protected sqlHelper: SQLHelper = SQLHelper.getInstance()

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
   * @param {FullWhereOperators} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   */
  protected addWhereCondition(column: string, operator: FullWhereOperators, value?: any): void {
    this.whereConditions.push({ column, operator, value })
  }

  /**
   * Adds a raw WHERE condition to the query
   * @param {string} sql - Raw SQL condition
   * @param {any[]} params - Parameters for the raw SQL condition
   */
  protected addWhereRawCondition(sql: string, params: any[]): void {
    this.whereRawConditions.push({ sql, params })
  }

  /**
   * Adds a JOIN clause to the query
   * @param {JoinType} type - Type of join
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   */
  protected addJoin(type: JoinType, table: string, on: string, alias?: string): void {
    this.joins.push({ type, table, on, alias })
  }

  /**
   * Adds an ORDER BY clause to the query
   * @param {string} column - Column name to order by
   * @param {'ASC' | 'DESC'} [direction='ASC'] - Sort direction
   */
  protected addOrderBy(column: string, direction: OrderDirection = 'ASC'): void {
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
    return this.sqlHelper.buildWhereConditions(this.whereConditions, this.whereRawConditions)
  }

  /**
   * Builds the JOIN clause from join conditions
   * @returns {string} SQL JOIN clause
   */
  protected buildJoinClause(): string {
    return this.sqlHelper.buildJoinClause(this.joins)
  }

  /**
   * Builds the ORDER BY clause from order conditions
   * @returns {string} SQL ORDER BY clause
   */
  protected buildOrderByClause(): string {
    return this.sqlHelper.buildOrderByClause(this.orderByConditions)
  }

  /**
   * Builds the GROUP BY clause from group conditions
   * @returns {string} SQL GROUP BY clause
   */
  protected buildGroupByClause(): string {
    return this.sqlHelper.buildGroupByClause(this.groupByConditions.map((g) => g.column))
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
   * @param {string} query - SQL query string (built safely with parameterized queries)
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<T[]>} Query results
   *
   * Note: This uses sql.unsafe() but is safe because:
   * - All user values are passed as parameters, not concatenated into SQL
   * - Table/column names are properly escaped with this.sqlHelper.safeEscapeIdentifier()
   * - The SQL is built from controlled, validated input
   */
  protected async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
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
