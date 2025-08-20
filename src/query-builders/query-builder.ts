import { BaseQueryBuilder } from './base-query-builder'
import type { OrderDirection, SelectColumn } from '../types'
import type { Transaction } from '../core/transaction'
import { WhereQueryBuilder } from './where-query-builder'
import { use } from 'typescript-mix'
import { HavingQueryBuilder } from './having-query-builder'

export interface QueryBuilder<M>
  extends BaseQueryBuilder,
    WhereQueryBuilder<QueryBuilder<M>>,
    HavingQueryBuilder<QueryBuilder<M>> {}

export class QueryBuilder<M> extends BaseQueryBuilder {
  @use(WhereQueryBuilder, HavingQueryBuilder) this: any

  private alreadyRemovedStar: boolean = false
  public selectColumns: string[] = ['*']
  public fromTable: string = ''
  public fromAlias: string = ''
  public insertData: Record<string, any>[] = []
  public updateData: Record<string, any> = {}
  public queryMode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  public upsertData: Record<string, any> = {}
  public conflictColumns: string[] = []

  /**
   * Sets the transaction context
   * @param {Transaction} trx - Transaction instance
   * @returns {QueryBuilder} Query builder instance
   */
  useTransaction(trx: Transaction): QueryBuilder<M> {
    this.setDriver(trx.getDriver())
    return this
  }

  /**
   * Sets the table for all operations
   * @param {string} table - Table name
   * @param {string} [alias] - Optional table alias (for select queries)
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder<M> {
    this.fromTable = table
    this.fromAlias = alias ? alias : ''
    return this
  }

  /**
   * Sets the table to query from (alias for table method)
   * @param {string} table - Table name
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public from(table: string, alias?: string): QueryBuilder<M> {
    return this.table(table, alias)
  }

  /**
   * Sets the table to insert into (alias for table method)
   * @param {string} table - Table name
   * @returns {QueryBuilder} Query builder instance
   */
  public into(table: string): QueryBuilder<M> {
    return this.table(table)
  }

  /**
   * Initiates a SELECT query
   * @returns {QueryBuilder} Query builder instance
   */
  public query(): QueryBuilder<M> {
    this.queryMode = 'select'
    return this
  }

  /**
   * Sets the columns to select in the query
   * @param {SelectColumn | SelectColumn[]} [columns] - Columns to select (defaults to '*')
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public select(...columns: SelectColumn[]): QueryBuilder<M>
  public select(column: SelectColumn): QueryBuilder<M>
  public select(columns: SelectColumn[]): QueryBuilder<M>
  public select(columns?: SelectColumn | SelectColumn[], ...rest: SelectColumn[]): QueryBuilder<M> {
    this.queryMode = 'select'

    if (!columns) {
      this.selectColumns = ['*']
      return this
    }

    // remove * from selectColumns but only one time
    if (!this.alreadyRemovedStar) {
      this.selectColumns = this.selectColumns.filter((col) => col !== '*')
      this.alreadyRemovedStar = true
    }

    if (Array.isArray(columns)) {
      const newColumns = columns.map((col) => {
        if (typeof col === 'string') {
          return col
        } else {
          // Handle object format like { alias: 'column' }
          const [alias, column] = Object.entries(col)[0] as [string, string]
          return `${this.sqlHelper.safeEscapeIdentifier(column)} AS ${this.sqlHelper.safeEscapeIdentifier(alias)}`
        }
      })
      this.selectColumns.push(...newColumns)
    } else if (typeof columns === 'string') {
      this.selectColumns.push(columns)
    } else {
      // Handle object format
      const newColumns = Object.entries(columns).map(
        ([alias, column]) =>
          `${this.sqlHelper.safeEscapeIdentifier(column)} AS ${this.sqlHelper.safeEscapeIdentifier(alias)}`
      )
      this.selectColumns.push(...newColumns)
    }

    if (rest.length > 0) {
      this.select(rest)
    }

    return this
  }

  /**
   * Executes an UPSERT operation
   * @param {Record<string, any>} data - Data to upsert
   * @returns {Promise<any>} Upsert result
   */
  public async upsert(data: Record<string, any>): Promise<any> {
    this.queryMode = 'upsert'
    this.upsertData = data
    const query = this.buildQuery()
    return await this.executeQuery(query.sql, query.params)
  }

  /**
   * Sets the conflict columns for upsert operations (ON CONFLICT)
   * @param {string | string[]} columns - Column(s) to check for conflicts
   * @returns {QueryBuilder} Query builder instance
   */
  public onConflict(columns: string | string[]): QueryBuilder<M> {
    this.conflictColumns = Array.isArray(columns) ? columns : [columns]
    return this
  }

  /**
   * Sets the data to insert and executes the INSERT operation
   * @param {Record<string, any> | Record<string, any>[]} data - Data to insert (single object or array of objects)
   * @returns {Promise<T[]>} Inserted records (if returning is specified)
   */
  public async insert<T = any>(data: Record<string, any> | Record<string, any>[]): Promise<T[]> {
    this.queryMode = 'insert'
    if (Array.isArray(data)) {
      this.insertData = data
    } else {
      this.insertData = [data]
    }
    const query = this.buildQuery()
    return await this.executeQuery<T>(query.sql, query.params)
  }

  /**
   * Sets the data to update and executes the UPDATE operation
   * @param {Record<string, any>} data - Data to update
   * @returns {Promise<T[]>} Updated records (if returning is specified)
   */
  public async update<T = any>(data: Record<string, any>): Promise<T[]> {
    this.queryMode = 'update'
    this.updateData = data
    const query = this.buildQuery()
    return await this.executeQuery<T>(query.sql, query.params)
  }

  /**
   * Executes a DELETE operation
   * @returns {Promise<T[]>} Deleted records (if returning is specified)
   */
  public async delete<T = any>(): Promise<T[]> {
    this.queryMode = 'delete'
    const query = this.buildQuery()
    return await this.executeQuery<T>(query.sql, query.params)
  }

  /**
   * Adds an INNER JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public join(table: string, on: string, alias?: string): QueryBuilder<M> {
    this.addJoin('INNER', table, on, alias)
    return this
  }

  /**
   * Adds a LEFT JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public leftJoin(table: string, on: string, alias?: string): QueryBuilder<M> {
    this.addJoin('LEFT', table, on, alias)
    return this
  }

  /**
   * Adds a RIGHT JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public rightJoin(table: string, on: string, alias?: string): QueryBuilder<M> {
    this.addJoin('RIGHT', table, on, alias)
    return this
  }

  /**
   * Adds a FULL JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public fullJoin(table: string, on: string, alias?: string): QueryBuilder<M> {
    this.addJoin('FULL', table, on, alias)
    return this
  }

  /**
   * Adds an ORDER BY clause to the query
   * @param {string} column - Column name to order by
   * @param {OrderDirection} [direction='ASC'] - Sort direction
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orderBy(column: string, direction: OrderDirection = 'ASC'): QueryBuilder<M> {
    this.addOrderBy(column, direction)
    return this
  }

  /**
   * Adds a GROUP BY clause to the query
   * @param {string} column - Column name to group by
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public groupBy(column: string): QueryBuilder<M> {
    this.addGroupBy(column)
    return this
  }

  /**
   * Adds a LIMIT clause to the query
   * @param {number} count - Number of rows to limit
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public limit(count: number): QueryBuilder<M> {
    this.limitValue = count
    return this
  }

  /**
   * Adds an OFFSET clause to the query
   * @param {number} count - Number of rows to offset
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public offset(count: number): QueryBuilder<M> {
    this.offsetValue = count
    return this
  }

  /**
   * Adds DISTINCT to the query
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public distinct(): QueryBuilder<M> {
    this.distinctFlag = true
    return this
  }

  /**
   * Sets the columns to return after insert/update/delete
   * @param {string | string[]} [columns] - Columns to return (defaults to '*')
   * @returns {QueryBuilder} Query builder instance
   */
  public returning(columns?: string | string[]): QueryBuilder<M> {
    if (!columns) {
      this.returningColumns = ['*']
    } else if (Array.isArray(columns)) {
      this.returningColumns = columns
    } else {
      this.returningColumns = [columns]
    }
    return this
  }

  /**
   * Executes an AVG query
   * @param {string} column - Column to average
   * @returns {Promise<number>} Average result
   */
  public async avg(column: string): Promise<number> {
    const originalSelect = this.selectColumns
    this.selectColumns = [`AVG(${column}) as avg`]

    const query = this.buildQuery()
    const result = await this.executeQuery<{ avg: string | number }>(query.sql, query.params)

    // Restore original select
    this.selectColumns = originalSelect
    const avg = result[0]?.avg || 0

    return typeof avg === 'string' ? parseFloat(avg) : avg
  }

  /**
   * Executes a SUM query
   * @param {string} column - Column to sum
   * @returns {Promise<number>} Sum result
   */
  public async sum(column: string): Promise<number> {
    const originalSelect = this.selectColumns
    this.selectColumns = [`SUM(${column}) as sum`]

    const query = this.buildQuery()
    const result = await this.executeQuery<{ sum: string | number }>(query.sql, query.params)

    // Restore original select
    this.selectColumns = originalSelect

    const sum = result[0]?.sum || 0
    return typeof sum === 'string' ? parseFloat(sum) : sum
  }

  /**
   * Executes a COUNT query
   * @param {string} [column='*'] - Column to count
   * @returns {Promise<number>} Count result
   */
  public async count(column: string = '*'): Promise<number> {
    const originalSelect = this.selectColumns
    this.selectColumns = [`COUNT(${column}) as count`]

    const query = this.buildQuery()
    const result = await this.executeQuery<{ count: string | number }>(query.sql, query.params)

    // Restore original select
    this.selectColumns = originalSelect

    const count = result[0]?.count || 0
    return typeof count === 'string' ? parseInt(count, 10) : count
  }

  /**
   * Executes the query and returns the first result
   * @returns {Promise<M & S | null>} First result
   */
  public async first<S>(): Promise<(M & S) | null>
  public async first<T, S>(): Promise<(T & S) | null>
  public async first(): Promise<M | null>
  public async first<T = any>(): Promise<T | null> {
    const originalLimit = this.limitValue
    this.limitValue = 1

    const query = this.buildQuery()
    const result = await this.executeQuery<T>(query.sql, query.params)

    // Restore original limit
    this.limitValue = originalLimit

    return result[0] || null
  }

  /**
   * Executes the query and returns the results
   * @returns {Promise<Array<M & S> | Array<T & S> | M[] | T[]>} Results
   */
  public async get<S>(): Promise<Array<M & S>>
  public async get<T, S>(): Promise<Array<T & S>>
  public async get(): Promise<M[]>
  public async get<T = any>(): Promise<T[]> {
    const query = this.buildQuery()
    return await this.executeQuery<T>(query.sql, query.params)
  }

  /**
   * Returns the raw SQL query and parameters
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  public toSql(): { sql: string; params: any[] } {
    const query = this.buildQuery()
    return {
      sql: query.sql.replace(/\s+/g, ' '),
      params: query.params,
    }
  }

  /**
   * Returns the SQL query as a string
   * @returns {string} SQL query
   */
  public toQuery(): string {
    const { sql, params } = this.buildQuery()
    return this.sqlHelper.toSql(sql, params)
  }

  /**
   * Builds the complete SQL query based on the current mode
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When required parameters are missing
   */
  private buildQuery(): { sql: string; params: any[] } {
    switch (this.queryMode) {
      case 'select':
        return this.driver.buildSelectQuery(this)
      case 'insert':
        return this.driver.buildInsertQuery(this)
      case 'update':
        return this.driver.buildUpdateQuery(this)
      case 'delete':
        return this.driver.buildDeleteQuery(this)
      case 'upsert':
        return this.driver.buildUpsertQuery(this)
      default:
        throw new Error('Invalid query mode')
    }
  }
}
