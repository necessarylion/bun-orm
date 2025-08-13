import { type DatabaseConnection, getConnection } from '../core/connection'
import { SQLHelper } from '../utils/sql-helper'
import { NestedQueryBuilder } from './nested-query-builder'
import type {
  WhereCondition,
  WhereGroupCondition,
  WhereCallback,
  JoinCondition,
  OrderByCondition,
  GroupByCondition,
  FullWhereOperators,
  JoinType,
  OrderDirection,
} from '../types'
import type { Model } from '../core/model'
import { cloneInstance } from '../utils/model-helper'
import type { Database } from 'bun:sqlite'

export abstract class BaseQueryBuilder {
  public connection: DatabaseConnection
  public sql: Bun.SQL | Database
  public returningColumns: string[] = ['*']
  public whereConditions: WhereCondition[] = []
  public whereGroupConditions: WhereGroupCondition[] = []
  public joins: JoinCondition[] = []
  public orderByConditions: OrderByCondition[] = []
  public groupByConditions: GroupByCondition[] = []
  public havingCondition: string = ''
  public limitValue: number | null = null
  public offsetValue: number | null = null
  public distinctFlag: boolean = false
  public sqlHelper: SQLHelper = SQLHelper.getInstance()
  public modelInstance: Model

  /**
   * Hydrates a model instance with data
   * @param {Model} _instance - Model instance to hydrate
   * @param {Record<string, any>} _data - Data to hydrate the model instance with
   * @returns {any} The hydrated model instance
   */
  hydrate(_instance: Model, _data: Record<string, any>): any {}

  /**
   * Creates a new BaseQueryBuilder instance
   * @param {Bun.SQL | Database} [transactionContext] - Optional transaction context
   */
  constructor(transactionContext?: Bun.SQL | Database) {
    this.connection = getConnection()
    this.sql = transactionContext ?? this.getDefaultSQL()
  }

  /**
   * Gets the default SQL instance based on the current driver
   * @returns {Bun.SQL | Database} The default SQL instance
   */
  private getDefaultSQL(): Bun.SQL | Database {
    const driver = this.connection.getDriver()
    if (driver === 'sqlite') {
      return this.connection.getSQLite()
    } else {
      return this.connection.getSQL()
    }
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
   * Adds a callback-based WHERE condition to the query
   * @param {WhereCallback} callback - Callback function that receives a NestedQueryBuilder
   */
  protected addWhereCallback(callback: WhereCallback): void {
    const nestedBuilder = new NestedQueryBuilder()
    callback(nestedBuilder)
    const conditions = nestedBuilder.getConditions()

    if (conditions.length === 1 && conditions[0] && 'type' in conditions[0]) {
      // Single group condition
      this.whereGroupConditions.push(conditions[0] as WhereGroupCondition)
    } else {
      // Multiple conditions - wrap in AND group
      this.whereGroupConditions.push({
        type: 'AND',
        conditions: conditions as WhereCondition[],
      })
    }
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
   * @param {OrderDirection} [direction='ASC'] - Sort direction
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
  public async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const config = this.connection.getConfig()
      if (config.debug === true) {
        console.log('-----------------------------------------------------')
        console.log(`\x1b[33m${query.replace(/\s+/g, ' ')}\x1b[0m`)
      }

      let result: any[]
      if ('query' in this.sql && typeof this.sql.query === 'function') {
        // SQLite
        const sqliteQuery = (this.sql as Database).query(query)
        result = sqliteQuery.all(...params)
      } else {
        // PostgreSQL
        result = await (this.sql as Bun.SQL).unsafe(query, params)
      }

      if (this.modelInstance !== undefined) {
        return result.map((d: any, index: number) => {
          if (index === 0) return this.hydrate(this.modelInstance, d)
          return this.hydrate(cloneInstance(this.modelInstance), d)
        })
      }
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
  public setTransactionContext(context: Bun.SQL | Database): void {
    this.sql = context
  }
}
