import { BaseQueryBuilder } from './base-query-builder'
import type {
  QueryBuilderInterface,
  SelectColumn,
  WhereOperator,
} from '../types'

export class QueryBuilder
  extends BaseQueryBuilder
  implements QueryBuilderInterface
{
  private alreadyRemovedStar: boolean = false
  private selectColumns: string[] = ['*']
  private fromTable: string = ''
  private fromAlias: string = ''
  private insertData: Record<string, any>[] = []
  private updateData: Record<string, any> = {}
  private returningColumns: string[] = ['*']
  private queryMode: 'select' | 'insert' | 'update' | 'delete' = 'select'

  /**
   * Sets the table for all operations
   * @param {string} table - Table name
   * @param {string} [alias] - Optional table alias (for select queries)
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder {
    this.fromTable = this.sqlHelper.sanitizeTableName(table)
    this.fromAlias = alias ? this.sqlHelper.sanitizeTableName(alias) : ''
    return this
  }

  /**
   * Sets the table to query from (alias for table method)
   * @param {string} table - Table name
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public from(table: string, alias?: string): QueryBuilder {
    return this.table(table, alias)
  }

  /**
   * Sets the table to insert into (alias for table method)
   * @param {string} table - Table name
   * @returns {QueryBuilder} Query builder instance
   */
  public into(table: string): QueryBuilder {
    return this.table(table)
  }

  /**
   * Initiates a SELECT query
   * @returns {QueryBuilder} Query builder instance
   */
  public query(): QueryBuilder {
    this.queryMode = 'select'
    return this
  }

  /**
   * Sets the columns to select in the query
   * @param {SelectColumn | SelectColumn[]} [columns] - Columns to select (defaults to '*')
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public select(
    columns?: SelectColumn | SelectColumn[]
  ): QueryBuilderInterface {
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
          return `${this.sqlHelper.escapeIdentifier(column)} AS ${this.sqlHelper.escapeIdentifier(alias)}`
        }
      })
      this.selectColumns.push(...newColumns)
    } else if (typeof columns === 'string') {
      this.selectColumns.push(columns)
    } else {
      // Handle object format
      const newColumns = Object.entries(columns).map(
        ([alias, column]) =>
          `${this.sqlHelper.escapeIdentifier(column)} AS ${this.sqlHelper.escapeIdentifier(alias)}`
      )
      this.selectColumns.push(...newColumns)
    }

    return this
  }

  /**
   * Sets the data to insert and executes the INSERT operation
   * @param {Record<string, any> | Record<string, any>[]} data - Data to insert (single object or array of objects)
   * @returns {Promise<T[]>} Inserted records (if returning is specified)
   */
  public async insert<T = any>(
    data: Record<string, any> | Record<string, any>[]
  ): Promise<T[]> {
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
   * Adds a WHERE condition to the query
   * Supports both syntaxes:
   * - where('id', '=', 2) - with explicit operator
   * - where('id', 2) - defaults to '=' operator
   */
  public where(column: string, value: NonNullable<any>): QueryBuilderInterface
  public where(
    column: string,
    operator: WhereOperator,
    value: NonNullable<any>
  ): QueryBuilderInterface
  public where(
    column: string,
    operatorOrValue: NonNullable<any>,
    value?: NonNullable<any>
  ): QueryBuilderInterface {
    // Check if second parameter is an operator or a value
    const operators = [
      '=',
      '!=',
      '>',
      '<',
      '>=',
      '<=',
      'LIKE',
      'ILIKE',
      'IN',
      'NOT IN',
    ] as const

    if (
      typeof operatorOrValue === 'string' &&
      operators.includes(operatorOrValue as any)
    ) {
      // where('id', '=', 2) syntax
      this.addWhereCondition(column, operatorOrValue as any, value)
    } else {
      // where('id', 2) syntax - default to '=' operator
      this.addWhereCondition(column, '=', operatorOrValue)
    }
    return this
  }

  /**
   * Adds a WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {NonNullable<any>[]} values - Array of values to match against
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public whereIn(
    column: string,
    values: NonNullable<any>[]
  ): QueryBuilderInterface {
    this.addWhereCondition(column, 'IN', values)
    return this
  }

  /**
   * Adds a WHERE NOT IN condition to the query
   * @param {string} column - Column name
   * @param {NonNullable<any>[]} values - Array of values to exclude
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public whereNotIn(
    column: string,
    values: NonNullable<any>[]
  ): QueryBuilderInterface {
    this.addWhereCondition(column, 'NOT IN', values)
    return this
  }

  /**
   * Adds a WHERE IS NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public whereNull(column: string): QueryBuilderInterface {
    this.addWhereCondition(column, 'IS NULL')
    return this
  }

  /**
   * Adds a WHERE IS NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public whereNotNull(column: string): QueryBuilderInterface {
    this.addWhereCondition(column, 'IS NOT NULL')
    return this
  }

  /**
   * Adds an INNER JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public join(
    table: string,
    on: string,
    alias?: string
  ): QueryBuilderInterface {
    this.addJoin('INNER', table, on, alias)
    return this
  }

  /**
   * Adds a LEFT JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public leftJoin(
    table: string,
    on: string,
    alias?: string
  ): QueryBuilderInterface {
    this.addJoin('LEFT', table, on, alias)
    return this
  }

  /**
   * Adds a RIGHT JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public rightJoin(
    table: string,
    on: string,
    alias?: string
  ): QueryBuilderInterface {
    this.addJoin('RIGHT', table, on, alias)
    return this
  }

  /**
   * Adds a FULL JOIN to the query
   * @param {string} table - Table name to join
   * @param {string} on - Join condition
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public fullJoin(
    table: string,
    on: string,
    alias?: string
  ): QueryBuilderInterface {
    this.addJoin('FULL', table, on, alias)
    return this
  }

  /**
   * Adds an ORDER BY clause to the query
   * @param {string} column - Column name to order by
   * @param {'ASC' | 'DESC'} [direction='ASC'] - Sort direction
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public orderBy(
    column: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): QueryBuilderInterface {
    this.addOrderBy(column, direction)
    return this
  }

  /**
   * Adds a GROUP BY clause to the query
   * @param {string} column - Column name to group by
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public groupBy(column: string): QueryBuilderInterface {
    this.addGroupBy(column)
    return this
  }

  /**
   * Adds a HAVING clause to the query
   * @param {string} condition - HAVING condition
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public having(condition: string): QueryBuilderInterface {
    this.havingCondition = condition
    return this
  }

  /**
   * Adds a LIMIT clause to the query
   * @param {number} count - Number of rows to limit
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public limit(count: number): QueryBuilderInterface {
    this.limitValue = count
    return this
  }

  /**
   * Adds an OFFSET clause to the query
   * @param {number} count - Number of rows to offset
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public offset(count: number): QueryBuilderInterface {
    this.offsetValue = count
    return this
  }

  /**
   * Adds DISTINCT to the query
   * @returns {QueryBuilderInterface} Query builder chain for method chaining
   */
  public distinct(): QueryBuilderInterface {
    this.distinctFlag = true
    return this
  }

  /**
   * Sets the columns to return after insert/update/delete
   * @param {string | string[]} [columns] - Columns to return (defaults to '*')
   * @returns {QueryBuilder} Query builder instance
   */
  public returning(columns?: string | string[]): QueryBuilder {
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
   * Executes a COUNT query
   * @param {string} [column='*'] - Column to count
   * @returns {Promise<number>} Count result
   */
  public async count(column: string = '*'): Promise<number> {
    const originalSelect = this.selectColumns
    this.selectColumns = [`COUNT(${column}) as count`]

    const query = this.buildQuery()
    const result = await this.executeQuery<{ count: string | number }>(
      query.sql,
      query.params
    )

    // Restore original select
    this.selectColumns = originalSelect

    const count = result[0]?.count || 0
    return typeof count === 'string' ? parseInt(count, 10) : count
  }

  /**
   * Executes the query and returns the first result
   * @returns {Promise<T | null>} First result or null if no results
   */
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
   * Executes the query and returns all results
   * @returns {Promise<T[]>} Array of results
   */
  public async get<T = any>(): Promise<T[]> {
    const query = this.buildQuery()
    return await this.executeQuery<T>(query.sql, query.params)
  }

  /**
   * Returns the raw SQL query and parameters
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  public override raw(): { sql: string; params: any[] } {
    return this.buildQuery()
  }

  /**
   * Builds the complete SQL query based on the current mode
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   * @throws {Error} When required parameters are missing
   */
  private buildQuery(): { sql: string; params: any[] } {
    switch (this.queryMode) {
      case 'select':
        return this.buildSelectQuery()
      case 'insert':
        return this.buildInsertQuery()
      case 'update':
        return this.buildUpdateQuery()
      case 'delete':
        return this.buildDeleteQuery()
      default:
        throw new Error('Invalid query mode')
    }
  }

  /**
   * Builds a SELECT query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  private buildSelectQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    const distinctClause = this.buildDistinctClause()
    const selectClause = this.selectColumns.join(', ')
    const fromClause = this.fromAlias
      ? `${this.sqlHelper.escapeIdentifier(this.fromTable)} AS ${this.sqlHelper.escapeIdentifier(this.fromAlias)}`
      : this.sqlHelper.escapeIdentifier(this.fromTable)

    const joinClause = this.buildJoinClause()
    const whereClause = this.buildWhereClause()
    const groupByClause = this.buildGroupByClause()
    const havingClause = this.havingCondition
      ? ` HAVING ${this.havingCondition}`
      : ''
    const orderByClause = this.buildOrderByClause()
    const limitOffsetClause = this.buildLimitOffsetClause()

    let sql = `SELECT ${distinctClause}${selectClause} FROM ${fromClause}`

    if (joinClause) {
      sql += ` ${joinClause}`
    }

    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`
    }

    if (groupByClause) {
      sql += ` GROUP BY ${groupByClause}`
    }

    sql += havingClause

    if (orderByClause) {
      sql += ` ORDER BY ${orderByClause}`
    }

    sql += limitOffsetClause

    return {
      sql,
      params: whereClause.params,
    }
  }

  /**
   * Builds an INSERT query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  private buildInsertQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    if (this.insertData.length === 0) {
      throw new Error('No data provided for insert. Use .insert() method.')
    }

    const { columns, placeholders, params } = this.sqlHelper.buildInsertValues(
      this.insertData
    )
    const tableClause = this.sqlHelper.escapeIdentifier(this.fromTable)
    const returningClause =
      this.returningColumns.length > 0
        ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(this.returningColumns)}`
        : ''

    const sql = `INSERT INTO ${tableClause} (${columns}) VALUES ${placeholders}${returningClause}`

    return { sql, params }
  }

  /**
   * Builds an UPDATE query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  private buildUpdateQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    if (Object.keys(this.updateData).length === 0) {
      throw new Error('No data provided for update. Use .update() method.')
    }

    const tableClause = this.sqlHelper.escapeIdentifier(this.fromTable)
    const { sql: setClause, params: setParams } = this.sqlHelper.buildSetClause(
      this.updateData
    )
    const whereClause = this.buildWhereClause()
    const returningClause =
      this.returningColumns.length > 0
        ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(this.returningColumns)}`
        : ''

    let sql = `UPDATE ${tableClause} SET ${setClause}`

    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`
    }

    sql += returningClause

    // Need to adjust the parameter numbers in the WHERE clause
    let finalSql = sql
    const finalParams = [...setParams]

    if (whereClause.sql) {
      // Replace parameter placeholders in WHERE clause to account for SET parameters
      let whereSql = whereClause.sql
      const whereParams = [...whereClause.params]

      // Sort the replacements by parameter number (descending) to avoid conflicts
      const replacements: Array<{ old: string; new: string; index: number }> =
        []
      for (let i = 0; i < whereParams.length; i++) {
        const oldPlaceholder = `$${i + 1}`
        const newPlaceholder = `$${setParams.length + i + 1}`
        replacements.push({
          old: oldPlaceholder,
          new: newPlaceholder,
          index: i,
        })
      }

      // Sort by index descending to replace from highest to lowest
      replacements.sort((a, b) => b.index - a.index)

      for (const replacement of replacements) {
        whereSql = whereSql.replace(
          new RegExp(`\\${replacement.old}(?!\\d)`, 'g'),
          replacement.new
        )
      }

      finalSql = finalSql.replace(whereClause.sql, whereSql)
      finalParams.push(...whereParams)
    }

    return {
      sql: finalSql,
      params: finalParams,
    }
  }

  /**
   * Builds a DELETE query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  private buildDeleteQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    const tableClause = this.sqlHelper.escapeIdentifier(this.fromTable)
    const whereClause = this.buildWhereClause()
    const returningClause =
      this.returningColumns.length > 0
        ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(this.returningColumns)}`
        : ''

    let sql = `DELETE FROM ${tableClause}`

    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`
    }

    sql += returningClause

    return {
      sql,
      params: whereClause.params,
    }
  }
}
