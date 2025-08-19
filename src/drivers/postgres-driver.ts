import type { DatabaseDriver } from './database-driver'
import { SQLHelper } from '../utils/sql-helper'
import type { QueryBuilder } from '../query-builders/query-builder'
import { SQL } from 'bun'
import { getConnection } from '../core/connection'
import { Transaction } from '../core/transaction'

export class PostgresDriver implements DatabaseDriver {
  private sqlHelper: SQLHelper = SQLHelper.getInstance()

  private sqlInstance: Bun.SQL

  public constructor(sqlInstance?: Bun.SQL) {
    const config = getConnection().getConfig()
    this.sqlInstance = sqlInstance ?? new SQL(config as any)
  }

  /**
   * Tests the connection to the database
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    await this.sqlInstance.unsafe('SELECT 1 as test')
    return true
  }

  /**
   * Closes the connection to the database
   */
  public close(): void {
    this.sqlInstance.close()
  }

  /**
   * Commits the transaction
   * @returns {Promise<void>}
   */
  public async commit(): Promise<void> {
    await this.sqlInstance`COMMIT`
    if (typeof (this.sqlInstance as any).release === 'function') {
      ;(this.sqlInstance as any).release()
    }
  }

  /**
   * Rolls back the transaction
   * @returns {Promise<void>}
   */
  public async rollback(): Promise<void> {
    await this.sqlInstance`ROLLBACK`
    if (typeof (this.sqlInstance as any).release === 'function') {
      ;(this.sqlInstance as any).release()
    }
  }

  /**
   * Checks if a table exists
   * @param {string} tableName - Name of the table to check
   * @returns {Promise<boolean>} True if table exists, false otherwise
   */
  public async hasTable(tableName: string): Promise<boolean> {
    const result = await this.sqlInstance.unsafe(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      ) as exists
    `,
      [tableName]
    )
    return result[0]?.exists || false
  }

  /**
   * Drops a table
   * @param {string} tableName - Name of the table to drop
   * @param {Object} options - Options for the drop operation
   * @param {boolean} options.cascade - Whether to cascade the drop operation
   * @returns {Promise<void>}
   */
  public async dropTable(tableName: string, options?: { cascade: boolean }): Promise<void> {
    await this.sqlInstance.unsafe(`DROP TABLE IF EXISTS ${tableName} ${options?.cascade ? 'CASCADE' : ''}`)
  }

  /**
   * Truncates a table
   * @param {string} tableName - Name of the table to truncate
   * @param {Object} options - Options for the truncate operation
   * @param {boolean} options.cascade - Whether to cascade the truncate operation
   * @returns {Promise<void>}
   */
  public async truncateTable(tableName: string, options?: { cascade: boolean }): Promise<void> {
    await this.sqlInstance.unsafe(`TRUNCATE TABLE ${tableName} ${options?.cascade ? 'CASCADE' : ''}`)
  }

  /**
   * Runs a transaction
   * @param {function} callback - The callback function to execute within the transaction
   * @returns {Promise<any>} The result of the transaction
   */
  public async transaction(callback: (trx: Transaction) => Promise<any>): Promise<any> {
    // Use Bun's callback-based transaction API
    return await this.sqlInstance.begin(async (sql: Bun.SQL) => {
      // Create transaction instance with the transaction context
      const trx = new Transaction<any>(new PostgresDriver(sql))
      // Execute the callback with transaction context
      return await callback(trx)
    })
  }

  /**
   * Begins a manual transaction
   * @returns {Promise<Transaction>} Transaction instance
   */
  public async beginTransaction(): Promise<Transaction<any>> {
    const reservedSql = await this.sqlInstance.reserve()
    await reservedSql`BEGIN`
    // create transaction
    const transaction = new Transaction(new PostgresDriver(reservedSql))
    return transaction
  }

  /**
   * Runs a query
   * @param {string} query - The query to run
   * @param {any[]} params - The parameters to pass to the query
   * @returns {Promise<any[]>} The result of the query
   */
  public async runQuery(query: string, params: any[]): Promise<any[]> {
    return await this.sqlInstance.unsafe(query, params)
  }

  /**
   * Builds a SELECT query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  public buildSelectQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] } {
    if (!queryBuilder.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    const distinctClause = this.buildDistinctClause(queryBuilder)
    const selectClause = queryBuilder.selectColumns.join(', ')
    const fromClause = queryBuilder.fromAlias
      ? `${this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromTable)} AS ${this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromAlias)}`
      : this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromTable)

    const joinClause = this.buildJoinClause(queryBuilder)
    const whereClause = this.buildWhereClause(queryBuilder)
    const groupByClause = this.buildGroupByClause(queryBuilder)
    const havingClause = this.buildHavingClause(queryBuilder, whereClause.params.length)
    const orderByClause = this.buildOrderByClause(queryBuilder)
    const limitOffsetClause = this.buildLimitOffsetClause(queryBuilder)

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

    if (havingClause.sql) {
      sql += ` HAVING ${havingClause.sql}`
    }

    if (orderByClause) {
      sql += ` ORDER BY ${orderByClause}`
    }

    sql += limitOffsetClause

    return {
      sql,
      params: [...whereClause.params, ...havingClause.params],
    }
  }

  /**
   * Builds an INSERT query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  public buildInsertQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] } {
    if (!queryBuilder.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    if (queryBuilder.insertData.length === 0) {
      throw new Error('No data provided for insert. Use .insert() method.')
    }

    const { columns, placeholders, params } = this.sqlHelper.buildInsertValues(queryBuilder.insertData)
    const tableClause = this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromTable)
    const returningClause =
      queryBuilder.returningColumns.length > 0
        ? ` RETURNING ${queryBuilder.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(queryBuilder.returningColumns)}`
        : ''

    const sql = `INSERT INTO ${tableClause} (${columns}) VALUES ${placeholders}${returningClause}`

    return { sql, params }
  }

  /**
   * Builds an UPDATE query
   * @returns {{ sql: string; params: any[] }} SQL query and parameters
   */
  public buildUpdateQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] } {
    if (!queryBuilder.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    if (Object.keys(queryBuilder.updateData).length === 0) {
      throw new Error('No data provided for update. Use .update() method.')
    }

    const tableClause = this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromTable)
    const { sql: setClause, params: setParams } = this.sqlHelper.buildSetClause(queryBuilder.updateData)
    const whereClause = this.buildWhereClause(queryBuilder)
    const returningClause =
      queryBuilder.returningColumns.length > 0
        ? ` RETURNING ${queryBuilder.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(queryBuilder.returningColumns)}`
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
  public buildDeleteQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] } {
    if (!queryBuilder.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    const tableClause = this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromTable)
    const whereClause = this.buildWhereClause(queryBuilder)
    const returningClause =
      queryBuilder.returningColumns.length > 0
        ? ` RETURNING ${queryBuilder.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(queryBuilder.returningColumns)}`
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
  public buildUpsertQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] } {
    if (!queryBuilder.fromTable) {
      throw new Error('Table name is required. Use .table() method.')
    }

    if (Object.keys(queryBuilder.upsertData).length === 0) {
      throw new Error('No data provided for upsert. Use .upsert() method.')
    }

    if (queryBuilder.conflictColumns.length === 0) {
      throw new Error('Conflict columns are required for upsert. Use .onConflict() method.')
    }

    const tableClause = this.sqlHelper.safeEscapeIdentifier(queryBuilder.fromTable)
    const columns = Object.keys(queryBuilder.upsertData)
    const escapedColumns = this.sqlHelper.buildColumnList(columns)
    const placeholders = this.sqlHelper.buildValuePlaceholders(columns.length)
    const conflictClause = ` ON CONFLICT (${this.sqlHelper.buildColumnList(queryBuilder.conflictColumns)})`

    // Build the UPDATE SET clause with proper parameter numbering
    const { sql: setClause, params: setParams } = this.sqlHelper.buildSetClause(queryBuilder.upsertData)

    // Adjust parameter numbers in SET clause to account for INSERT parameters
    let adjustedSetClause = setClause
    for (let i = 0; i < setParams.length; i++) {
      const oldPlaceholder = `$${i + 1}`
      const newPlaceholder = `$${columns.length + i + 1}`
      adjustedSetClause = adjustedSetClause.replace(new RegExp(`\\${oldPlaceholder}(?!\\d)`, 'g'), newPlaceholder)
    }

    const updateClause = ` DO UPDATE SET ${adjustedSetClause}`
    const returningClause =
      queryBuilder.returningColumns.length > 0
        ? ` RETURNING ${queryBuilder.returningColumns.includes('*') ? '*' : this.sqlHelper.buildColumnList(queryBuilder.returningColumns)}`
        : ''

    const sql = `INSERT INTO ${tableClause} (${escapedColumns}) VALUES (${placeholders})${conflictClause}${updateClause}${returningClause}`

    // Combine parameters: INSERT values first, then UPDATE values
    const insertParams = Object.values(queryBuilder.upsertData)
    const allParams = [...insertParams, ...setParams]

    return { sql, params: allParams }
  }

  /**
   * Builds the DISTINCT clause
   * @returns {string} SQL DISTINCT clause
   */
  protected buildDistinctClause(queryBuilder: QueryBuilder<any>): string {
    return queryBuilder.distinctFlag ? 'DISTINCT ' : ''
  }

  /**
   * Builds the WHERE clause from conditions
   * @returns {{ sql: string; params: any[] }} SQL fragment and parameters
   */
  protected buildWhereClause(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] } {
    return this.sqlHelper.buildWhereConditions(
      queryBuilder.whereConditions,
      queryBuilder.whereGroupConditions,
      'postgres'
    )
  }

  /**
   * Builds having clause
   * @returns {{ sql: string; params: any[] }} SQL fragment and parameters
   */
  protected buildHavingClause(queryBuilder: QueryBuilder<any>, paramOffset: number): { sql: string; params: any[] } {
    return this.sqlHelper.buildWhereConditions(queryBuilder.havingConditions, [], 'postgres', paramOffset)
  }

  /**
   * Builds the JOIN clause from join conditions
   * @returns {string} SQL JOIN clause
   */
  protected buildJoinClause(queryBuilder: QueryBuilder<any>): string {
    return this.sqlHelper.buildJoinClause(queryBuilder.joins)
  }

  /**
   * Builds the ORDER BY clause from order conditions
   * @returns {string} SQL ORDER BY clause
   */
  protected buildOrderByClause(queryBuilder: QueryBuilder<any>): string {
    return this.sqlHelper.buildOrderByClause(queryBuilder.orderByConditions)
  }

  /**
   * Builds the GROUP BY clause from group conditions
   * @returns {string} SQL GROUP BY clause
   */
  protected buildGroupByClause(queryBuilder: QueryBuilder<any>): string {
    return this.sqlHelper.buildGroupByClause(queryBuilder.groupByConditions.map((g) => g.column))
  }

  /**
   * Builds the LIMIT and OFFSET clause
   * @returns {string} SQL LIMIT/OFFSET clause
   */
  protected buildLimitOffsetClause(queryBuilder: QueryBuilder<any>): string {
    let clause = ''
    if (queryBuilder.limitValue !== null) {
      clause += ` LIMIT ${queryBuilder.limitValue}`
    }
    if (queryBuilder.offsetValue !== null) {
      clause += ` OFFSET ${queryBuilder.offsetValue}`
    }
    return clause
  }
}
