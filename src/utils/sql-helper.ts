import type { Driver, WhereCondition, WhereGroupCondition } from '../types'
import { DANGEROUS_SQL_PATTERNS, MAX_IDENTIFIER_LENGTH, SQL_RESERVED_KEYWORDS } from './sql-constants'

/**
 * SQL Helper class for building and escaping SQL queries
 * Uses singleton pattern for global access
 */
export class SQLHelper {
  private static instance: SQLHelper | null = null

  private constructor() {}

  /**
   * Gets the singleton instance of SQLHelper
   * @returns {SQLHelper} The singleton instance
   */
  public static getInstance(): SQLHelper {
    if (!SQLHelper.instance) {
      SQLHelper.instance = new SQLHelper()
    }
    return SQLHelper.instance
  }

  /**
   * Safely escapes an identifier with validation
   * @param {string} identifier - The identifier to escape
   * @returns {string} The escaped identifier
   * @throws {Error} If identifier is invalid
   */
  safeEscapeIdentifier(tableName: string): string {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Table name must be a non-empty string')
    }

    let trimmed = tableName.trim()
    if (trimmed.length === 0) {
      throw new Error('Table name cannot be empty or whitespace only')
    }

    // Check length limit
    if (trimmed.length > MAX_IDENTIFIER_LENGTH) {
      throw new Error(`Table name too long. Maximum length is ${MAX_IDENTIFIER_LENGTH} characters`)
    }

    // Check for SQL injection patterns
    for (const pattern of DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`Table name contains potentially dangerous pattern: ${pattern.source}`)
      }
    }

    // Check for reserved keywords (case-insensitive)
    const upperTrimmed = trimmed.toUpperCase()
    if (SQL_RESERVED_KEYWORDS.includes(upperTrimmed)) {
      throw new Error(`Table name cannot be a reserved SQL keyword: ${trimmed}`)
    }

    // Remove any potentially dangerous characters
    trimmed = trimmed.replace(/[^a-zA-Z0-9._]/g, '')

    // escape double quotes
    return `"${trimmed.replace(/"/g, '""')}"`
  }

  /**
   * Builds a comma-separated list of escaped column names
   * @param {string[]} columns - Array of column names
   * @returns {string} Comma-separated list of escaped column names
   */
  buildColumnList(columns: string[]): string {
    return columns.map((col) => this.safeEscapeIdentifier(col)).join(', ')
  }

  /**
   * Builds a comma-separated list of parameter placeholders
   * @param {number} count - Number of placeholders to generate
   * @returns {string} Comma-separated list of parameter placeholders ($1, $2, etc.)
   */
  buildValuePlaceholders(count: number): string {
    return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ')
  }

  /**
   * Builds a SET clause for UPDATE queries
   * @param {Record<string, any>} data - Object containing column-value pairs
   * @returns {{ sql: string; params: any[] }} SET clause SQL and parameters
   */
  buildSetClause(data: Record<string, any>): {
    sql: string
    params: any[]
  } {
    const entries = Object.entries(data)
    const setParts: string[] = []
    const params: any[] = []

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i] as [string, any]
      setParts.push(`${this.safeEscapeIdentifier(key)} = $${i + 1}`)
      if (value instanceof Date) {
        params.push(value.toISOString())
      } else {
        params.push(value)
      }
    }

    return {
      sql: setParts.join(', '),
      params,
    }
  }

  /**
   * Builds WHERE conditions from an array of condition objects
   * @param {Array<{ column: string; operator: string; value?: any }>} conditions - Array of WHERE conditions
   * @param {Array<{ sql: string; params: any[] }>} rawConditions - Array of raw WHERE conditions
   * @param {Array<{ type: string; conditions: any[] }>} groupConditions - Array of grouped WHERE conditions
   * @returns {{ sql: string; params: any[] }} WHERE clause SQL and parameters
   */
  buildWhereConditions(
    conditions: WhereCondition[],
    groupConditions: WhereGroupCondition[] = [],
    driver: Driver,
    paramOffset: number = 0
  ): { sql: string; params: any[] } {
    if (conditions.length === 0 && groupConditions.length === 0) {
      return { sql: '', params: [] }
    }

    const whereParts: {
      type: 'AND' | 'OR'
      wherePart: string
    }[] = []
    const params: any[] = []

    for (const condition of conditions) {
      const regularResult = this.#getRegularWhereCondition(condition, paramOffset + params.length, driver)
      whereParts.push({
        type: condition.type,
        wherePart: regularResult.wherePart,
      })
      params.push(...regularResult.params)
    }

    // handle group conditions
    for (const group of groupConditions) {
      const groupResult = this.buildGroupCondition(group, paramOffset + params.length, driver)
      whereParts.push({
        type: group.type,
        wherePart: groupResult.sql,
      })
      params.push(...groupResult.params)
    }

    const andParts = whereParts.filter((part) => part.type === 'AND').map((part) => part.wherePart)
    const orParts = whereParts.filter((part) => part.type === 'OR').map((part) => part.wherePart)

    let sql = andParts.join(' AND ')

    if (orParts.length > 0) {
      sql += ` OR ${orParts.join(' OR ')}`
    }

    return {
      sql,
      params,
    }
  }

  /**
   * Builds a single group condition (AND/OR)
   * @param {any} group - Group condition object
   * @param {number} paramOffset - Parameter offset for placeholders
   * @returns {{ sql: string; params: any[] }} Group condition SQL and parameters
   */
  private buildGroupCondition(
    group: WhereGroupCondition,
    paramOffset: number,
    driver: Driver
  ): { sql: string; params: any[] } {
    const groupParts: {
      type: 'AND' | 'OR'
      wherePart: string
    }[] = []
    const params: any[] = []

    for (const condition of group.conditions) {
      if ('conditions' in condition) {
        // Nested group
        const nestedResult = this.buildGroupCondition(condition, paramOffset + params.length, driver)
        groupParts.push({
          type: condition.type,
          wherePart: `${nestedResult.sql}`,
        })
        params.push(...nestedResult.params)
      } else {
        // Regular condition
        const regularResult = this.#getRegularWhereCondition(condition, paramOffset + params.length, driver)
        groupParts.push({
          type: condition.type,
          wherePart: regularResult.wherePart,
        })
        params.push(...regularResult.params)
      }
    }

    const orParts = groupParts.filter((part) => part.type === 'OR').map((part) => part.wherePart)
    const andParts = groupParts.filter((part) => part.type === 'AND').map((part) => part.wherePart)

    let sql = andParts.join(' AND ')

    if (orParts.length > 0) {
      sql += ` OR ${orParts.join(' OR ')}`
    }

    return {
      sql: groupParts.length > 0 ? `(${sql})` : '',
      params,
    }
  }

  #getRegularWhereCondition(
    condition: WhereCondition,
    paramOffset: number,
    driver: Driver
  ): {
    type: 'AND' | 'OR'
    wherePart: string
    params: any[]
  } {
    // Regular condition
    const { column, operator, value } = condition

    if (driver === 'sqlite') {
      if (operator.includes('ILIKE')) {
        return {
          type: condition.type,
          wherePart: `LOWER(${this.safeEscapeIdentifier(column)}) ${operator.replace('ILIKE', 'LIKE')} LOWER(?)`,
          params: [value],
        }
      }
    }

    if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
      return {
        type: condition.type,
        wherePart: `${this.safeEscapeIdentifier(column)} ${operator}`,
        params: [],
      }
    }
    if ((operator === 'IN' || operator === 'NOT IN') && Array.isArray(value)) {
      const placeholders = value.map((_, j) => `$${paramOffset + j + 1}`).join(', ')
      return {
        type: condition.type,
        wherePart: `${this.safeEscapeIdentifier(column)} ${operator} (${placeholders})`,
        params: value,
      }
    }
    if (operator === 'RAW' && Array.isArray(value)) {
      const sql = this.replacePlaceholders(column, paramOffset)
      return {
        type: condition.type,
        wherePart: sql,
        params: value,
      }
    }
    if (operator === 'RAW' && !value) {
      return {
        type: condition.type,
        wherePart: column,
        params: [],
      }
    }
    return {
      type: condition.type,
      wherePart: `${this.safeEscapeIdentifier(column)} ${operator} $${paramOffset + 1}`,
      params: [value],
    }
  }

  /**
   * Builds JOIN clauses from an array of join conditions
   * @param {Array<{ type: string; table: string; on: string; alias?: string }>} joins - Array of join conditions
   * @returns {string} JOIN clause SQL
   */
  buildJoinClause(joins: Array<{ type: string; table: string; on: string; alias?: string }>): string {
    return joins
      .map((join) => {
        const tablePart = join.alias
          ? `${this.safeEscapeIdentifier(join.table)} AS ${this.safeEscapeIdentifier(join.alias)}`
          : this.safeEscapeIdentifier(join.table)
        return `${join.type} JOIN ${tablePart} ON ${join.on}`
      })
      .join(' ')
  }

  /**
   * Builds ORDER BY clause from an array of order conditions
   * @param {Array<{ column: string; direction: string }>} orders - Array of order conditions
   * @returns {string} ORDER BY clause SQL
   */
  buildOrderByClause(orders: Array<{ column: string; direction: string }>): string {
    return orders.map((order) => `${this.safeEscapeIdentifier(order.column)} ${order.direction}`).join(', ')
  }

  /**
   * Builds GROUP BY clause from an array of column names
   * @param {string[]} groups - Array of column names to group by
   * @returns {string} GROUP BY clause SQL
   */
  buildGroupByClause(groups: string[]): string {
    return groups.map((group) => this.safeEscapeIdentifier(group)).join(', ')
  }

  /**
   * Builds INSERT VALUES clause from an array of data objects
   * @param {Record<string, any>[]} data - Array of data objects to insert
   * @returns {{ columns: string; placeholders: string; params: any[] }} INSERT clause components
   * @throws {Error} When no data is provided
   */
  buildInsertValues(data: Record<string, any>[]): {
    columns: string
    placeholders: string
    params: any[]
  } {
    if (data.length === 0) {
      throw new Error('No data provided for insert')
    }

    const columns = Object.keys(data[0] || {})
    const placeholders: string[] = []
    const params: any[] = []

    for (const row of data) {
      const rowPlaceholders = columns.map((_, i) => `$${params.length + i + 1}`).join(', ')
      placeholders.push(`(${rowPlaceholders})`)
      params.push(
        ...columns.map((col) => {
          const value = row[col]
          if (value instanceof Date) {
            return value.toISOString()
          }
          return value
        })
      )
    }

    return {
      columns: this.buildColumnList(columns),
      placeholders: placeholders.join(', '),
      params,
    }
  }

  replacePlaceholders(sql: string, offset: number): string {
    let counter = offset
    return sql.replace(/\?/g, () => {
      counter++
      return `$${counter}`
    })
  }

  toSql(sql: string, params: any[]): string {
    const sqlString = sql.replace(/\s+/g, ' ')
    return sqlString.replace(/\$(\d+)/g, (_: any, index: string) => {
      const value = params[parseInt(index, 10) - 1]
      if (typeof value === 'string') {
        return `'${value}'`
      } else if (typeof value === 'number') {
        return `'${value.toString()}'`
      } else if (typeof value === 'boolean') {
        return value ? '1' : '0'
      } else if (value === null || value === undefined) {
        return 'NULL'
      } else {
        return `'${value}'`
      }
    })
  }
}
