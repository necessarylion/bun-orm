import {
  DANGEROUS_SQL_PATTERNS,
  MAX_IDENTIFIER_LENGTH,
  SQL_RESERVED_KEYWORDS,
} from './sql-constants'

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
      throw new Error(
        `Table name too long. Maximum length is ${MAX_IDENTIFIER_LENGTH} characters`
      )
    }

    // Check for SQL injection patterns
    for (const pattern of DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(
          `Table name contains potentially dangerous pattern: ${pattern.source}`
        )
      }
    }

    // Check for reserved keywords (case-insensitive)
    const upperTrimmed = trimmed.toUpperCase()
    if (SQL_RESERVED_KEYWORDS.includes(upperTrimmed)) {
      throw new Error(`Table name cannot be a reserved SQL keyword: ${trimmed}`)
    }

    // Remove any potentially dangerous characters
    trimmed = trimmed.replace(/[^a-zA-Z0-9_]/g, '')

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
      params.push(value)
    }

    return {
      sql: setParts.join(', '),
      params,
    }
  }

  /**
   * Builds WHERE conditions from an array of condition objects
   * @param {Array<{ column: string; operator: string; value?: any }>} conditions - Array of WHERE conditions
   * @returns {{ sql: string; params: any[] }} WHERE clause SQL and parameters
   */
  buildWhereConditions(
    conditions: Array<{ column: string; operator: string; value?: any }>,
    rawConditions: Array<{ sql: string; params: any[] }> = []
  ): { sql: string; params: any[] } {
    if (conditions.length === 0 && rawConditions.length === 0) {
      return { sql: '', params: [] }
    }

    const whereParts: string[] = []
    const params: any[] = []

    let i = 0
    for (i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const { column, operator, value } = condition as {
        column: string
        operator: string
        value?: any
      }

      if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
        whereParts.push(`${this.safeEscapeIdentifier(column)} ${operator}`)
      } else if (operator === 'IN' || operator === 'NOT IN') {
        if (Array.isArray(value)) {
          const placeholders = value
            .map((_, j) => `$${params.length + j + 1}`)
            .join(', ')
          whereParts.push(
            `${this.safeEscapeIdentifier(column)} ${operator} (${placeholders})`
          )
          params.push(...value)
        }
      } else {
        whereParts.push(
          `${this.safeEscapeIdentifier(column)} ${operator} $${params.length + 1}`
        )
        params.push(value)
      }
    }

    // handle raw conditions
    for (let k = 0; k < rawConditions.length; k++) {
      const condition = rawConditions[k]
      if (condition?.sql) {
        // replace ? with $1, $2, etc.
        const placeholders = condition.params
          .map((_, j) => `$${i + j + 1}`)
          .join(', ')
        const sql = condition.sql.replace(/\?/g, placeholders)
        whereParts.push(sql)
        params.push(...condition.params)
      }
      i++
    }

    return {
      sql: whereParts.join(' AND '),
      params,
    }
  }

  /**
   * Builds JOIN clauses from an array of join conditions
   * @param {Array<{ type: string; table: string; on: string; alias?: string }>} joins - Array of join conditions
   * @returns {string} JOIN clause SQL
   */
  buildJoinClause(
    joins: Array<{ type: string; table: string; on: string; alias?: string }>
  ): string {
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
  buildOrderByClause(
    orders: Array<{ column: string; direction: string }>
  ): string {
    return orders
      .map(
        (order) =>
          `${this.safeEscapeIdentifier(order.column)} ${order.direction}`
      )
      .join(', ')
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
      const rowPlaceholders = columns
        .map((_, i) => `$${params.length + i + 1}`)
        .join(', ')
      placeholders.push(`(${rowPlaceholders})`)
      params.push(...columns.map((col) => row[col]))
    }

    return {
      columns: this.buildColumnList(columns),
      placeholders: placeholders.join(', '),
      params,
    }
  }
}
