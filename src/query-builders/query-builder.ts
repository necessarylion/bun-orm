import { BaseQueryBuilder } from './base-query-builder'
import type { FullWhereOperators, OrderDirection, SelectColumn, WhereCallback } from '../types'
import { ALLOWED_WHERE_OPERATORS } from '../utils/sql-constants'
import type { Transaction } from '../core/transaction'

export class QueryBuilder<M> extends BaseQueryBuilder {
  private alreadyRemovedStar: boolean = false
  private selectColumns: string[] = ['*']
  private fromTable: string = ''
  private fromAlias: string = ''
  private insertData: Record<string, any>[] = []
  private updateData: Record<string, any> = {}
  private returningColumns: string[] = ['*']
  private queryMode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private upsertData: Record<string, any> = {}
  private conflictColumns: string[] = []

  /**
   * Sets the transaction context
   * @param {Transaction} trx - Transaction instance
   * @returns {QueryBuilder} Query builder instance
   */
  useTransaction(trx: Transaction): QueryBuilder<M> {
    this.sql = trx.getTransactionContext()
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
   * Adds a WHERE condition to the query
   * Supports both syntaxes:
   * - where('id', '=', 2) - with explicit operator
   * - where('id', 2) - defaults to '=' operator
   */
  public where(columnOrCallback: string | WhereCallback, operatorOrValue?: any, value?: any): QueryBuilder<M> {
    // Handle callback-based where
    if (typeof columnOrCallback === 'function') {
      this.addWhereCallback(columnOrCallback)
      return this
    }

    // Handle regular where conditions
    const column = columnOrCallback as string
    let operator: FullWhereOperators = '='
    let conditionValue: any

    if (typeof operatorOrValue === 'string' && ALLOWED_WHERE_OPERATORS.includes(operatorOrValue)) {
      // where('id', '=', 2) syntax
      operator = operatorOrValue as FullWhereOperators
      conditionValue = value
    } else {
      // where('id', 2) syntax - default to '=' operator
      conditionValue = operatorOrValue
    }

    // support for null values with = and != operators
    if (operator === '=' && conditionValue === null) {
      operator = 'IS NULL'
      conditionValue = undefined
    } else if (operator === '!=' && conditionValue === null) {
      operator = 'IS NOT NULL'
      conditionValue = undefined
    }

    this.addWhereCondition(column, operator, conditionValue)
    return this
  }

  /**
   * Adds a raw WHERE condition to the query
   * @param {string} sql - Raw SQL condition
   * @param {any[]} params - Parameters for the raw SQL condition
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public whereRaw(sql: string, params?: any[]): QueryBuilder<M> {
    this.addWhereCondition(sql, 'RAW', params)
    return this
  }

  /**
   * Adds a WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {NonNullable<any>[]} values - Array of values to match against
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public whereIn(column: string, values: NonNullable<any>[]): QueryBuilder<M> {
    this.addWhereCondition(column, 'IN', values)
    return this
  }

  /**
   * Adds a WHERE NOT IN condition to the query
   * @param {string} column - Column name
   * @param {NonNullable<any>[]} values - Array of values to exclude
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public whereNotIn(column: string, values: NonNullable<any>[]): QueryBuilder<M> {
    this.addWhereCondition(column, 'NOT IN', values)
    return this
  }

  /**
   * Adds a WHERE IS NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public whereNull(column: string): QueryBuilder<M> {
    this.addWhereCondition(column, 'IS NULL')
    return this
  }

  /**
   * Adds a WHERE IS NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public whereNotNull(column: string): QueryBuilder<M> {
    this.addWhereCondition(column, 'IS NOT NULL')
    return this
  }

  /**
   * Adds an OR WHERE condition to the query
   * @param {string} column - Column name
   * @param {any} operatorOrValue - Operator or value
   * @param {any} [value] - Value to compare against
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orWhere(column: string, operatorOrValue: any, value?: any): QueryBuilder<M> {
    let operator: FullWhereOperators = '='
    let conditionValue: any

    if (typeof operatorOrValue === 'string' && ALLOWED_WHERE_OPERATORS.includes(operatorOrValue)) {
      operator = operatorOrValue as FullWhereOperators
      conditionValue = value
    } else {
      conditionValue = operatorOrValue
    }

    if (operator === '=' && conditionValue === null) {
      operator = 'IS NULL'
      conditionValue = undefined
    } else if (operator === '!=' && conditionValue === null) {
      operator = 'IS NOT NULL'
      conditionValue = undefined
    }

    // Create an OR group with existing conditions
    const orGroup = {
      type: 'OR' as const,
      conditions: [
        ...this.whereConditions.map((c) => ({ column: c.column, operator: c.operator, value: c.value })),
        { column, operator, value: conditionValue },
      ],
    }

    this.whereGroupConditions.push(orGroup)
    this.whereConditions = [] // Clear regular conditions since they're now in the OR group
    return this
  }

  /**
   * Adds an OR raw WHERE condition to the query
   * @param {string} sql - Raw SQL condition
   * @param {any[]} params - Parameters for the raw SQL condition
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orWhereRaw(sql: string, params?: any[]): QueryBuilder<M> {
    const orGroup = {
      type: 'OR' as const,
      conditions: [
        ...this.whereConditions.map((c) => ({ column: c.column, operator: c.operator, value: c.value })),
        { column: sql, operator: 'RAW' as FullWhereOperators, value: params },
      ],
    }

    this.whereGroupConditions.push(orGroup)
    this.whereConditions = []
    return this
  }

  /**
   * Adds an OR WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to match against
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orWhereIn(column: string, values: any[]): QueryBuilder<M> {
    const orGroup = {
      type: 'OR' as const,
      conditions: [
        ...this.whereConditions.map((c) => ({ column: c.column, operator: c.operator, value: c.value })),
        { column, operator: 'IN' as FullWhereOperators, values },
      ],
    }

    this.whereGroupConditions.push(orGroup)
    this.whereConditions = []
    return this
  }

  /**
   * Adds an OR WHERE NOT IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to exclude
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orWhereNotIn(column: string, values: any[]): QueryBuilder<M> {
    const orGroup = {
      type: 'OR' as const,
      conditions: [
        ...this.whereConditions.map((c) => ({ column: c.column, operator: c.operator, value: c.value })),
        { column, operator: 'NOT IN' as FullWhereOperators, values },
      ],
    }

    this.whereGroupConditions.push(orGroup)
    this.whereConditions = []
    return this
  }

  /**
   * Adds an OR WHERE NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orWhereNull(column: string): QueryBuilder<M> {
    const orGroup = {
      type: 'OR' as const,
      conditions: [
        ...this.whereConditions.map((c) => ({ column: c.column, operator: c.operator, value: c.value })),
        { column, operator: 'IS NULL' as FullWhereOperators },
      ],
    }

    this.whereGroupConditions.push(orGroup)
    this.whereConditions = []
    return this
  }

  /**
   * Adds an OR WHERE NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public orWhereNotNull(column: string): QueryBuilder<M> {
    const orGroup = {
      type: 'OR' as const,
      conditions: [
        ...this.whereConditions.map((c) => ({ column: c.column, operator: c.operator, value: c.value })),
        { column, operator: 'IS NOT NULL' as FullWhereOperators },
      ],
    }

    this.whereGroupConditions.push(orGroup)
    this.whereConditions = []
    return this
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
   * Adds a HAVING clause to the query
   * @param {string} condition - HAVING condition
   * @returns {QueryBuilder} Query builder chain for method chaining
   */
  public having(condition: string): QueryBuilder<M> {
    this.havingCondition = condition
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
  public override raw(): { sql: string; params: any[] } {
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
  public toSql(): string {
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
        return this.buildSelectQuery()
      case 'insert':
        return this.buildInsertQuery()
      case 'update':
        return this.buildUpdateQuery()
      case 'delete':
        return this.buildDeleteQuery()
      case 'upsert':
        return this.buildUpsertQuery()
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
      ? `${this.sqlHelper.safeEscapeIdentifier(this.fromTable)} AS ${this.sqlHelper.safeEscapeIdentifier(this.fromAlias)}`
      : this.sqlHelper.safeEscapeIdentifier(this.fromTable)

    const joinClause = this.buildJoinClause()
    const whereClause = this.buildWhereClause()
    const groupByClause = this.buildGroupByClause()
    const havingClause = this.havingCondition ? ` HAVING ${this.havingCondition}` : ''
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

    const { columns, placeholders, params } = this.sqlHelper.buildInsertValues(this.insertData)
    const tableClause = this.sqlHelper.safeEscapeIdentifier(this.fromTable)
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

    const tableClause = this.sqlHelper.safeEscapeIdentifier(this.fromTable)
    const { sql: setClause, params: setParams } = this.sqlHelper.buildSetClause(this.updateData)
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
      const replacements: Array<{ old: string; new: string; index: number }> = []
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
        whereSql = whereSql.replace(new RegExp(`\\${replacement.old}(?!\\d)`, 'g'), replacement.new)
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

    const tableClause = this.sqlHelper.safeEscapeIdentifier(this.fromTable)
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

  /**
   * Builds an UPSERT query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  private buildUpsertQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    if (Object.keys(this.upsertData).length === 0) {
      throw new Error('No data provided for upsert. Use .upsert() method.')
    }

    if (this.conflictColumns.length === 0) {
      throw new Error('Conflict columns are required for upsert. Use .onConflict() method.')
    }

    const tableClause = this.sqlHelper.safeEscapeIdentifier(this.fromTable)
    const columns = Object.keys(this.upsertData)
    const escapedColumns = this.sqlHelper.buildColumnList(columns)
    const placeholders = this.sqlHelper.buildValuePlaceholders(columns.length)
    const conflictClause = ` ON CONFLICT (${this.sqlHelper.buildColumnList(this.conflictColumns)})`

    // Build the UPDATE SET clause with proper parameter numbering
    const { sql: setClause, params: setParams } = this.sqlHelper.buildSetClause(this.upsertData)

    // Adjust parameter numbers in SET clause to account for INSERT parameters
    let adjustedSetClause = setClause
    for (let i = 0; i < setParams.length; i++) {
      const oldPlaceholder = `$${i + 1}`
      const newPlaceholder = `$${columns.length + i + 1}`
      adjustedSetClause = adjustedSetClause.replace(new RegExp(`\\${oldPlaceholder}(?!\\d)`, 'g'), newPlaceholder)
    }

    const updateClause = ` DO UPDATE SET ${adjustedSetClause}`
    const returningClause =
      this.returningColumns.length > 0
        ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(this.returningColumns)}`
        : ''

    const sql = `INSERT INTO ${tableClause} (${escapedColumns}) VALUES (${placeholders})${conflictClause}${updateClause}${returningClause}`

    // Combine parameters: INSERT values first, then UPDATE values
    const insertParams = Object.values(this.upsertData)
    const allParams = [...insertParams, ...setParams]

    return { sql, params: allParams }
  }
}
