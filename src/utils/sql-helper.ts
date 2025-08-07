import { 
  DANGEROUS_SQL_PATTERNS, 
  SQL_RESERVED_KEYWORDS, 
  MAX_IDENTIFIER_LENGTH, 
  MAX_TABLE_NAME_LENGTH, 
  MAX_COLUMN_NAME_LENGTH 
} from './sql-constants'

export class SQLHelper {
  /**
   * Escapes a SQL identifier (table name, column name, etc.)
   * @param {string} identifier - The identifier to escape
   * @returns {string} The escaped identifier
   * @throws {Error} If identifier is empty or contains only whitespace
   */
  static escapeIdentifier(identifier: string): string {
    if (!identifier || identifier.trim().length === 0) {
      throw new Error('Identifier cannot be empty or whitespace only')
    }
    
    // Trim whitespace and escape double quotes
    const trimmed = identifier.trim()
    
    // Check length limit
    if (trimmed.length > MAX_IDENTIFIER_LENGTH) {
      throw new Error(`Identifier too long. Maximum length is ${MAX_IDENTIFIER_LENGTH} characters`)
    }
    
    return `"${trimmed.replace(/"/g, '""')}"`
  }

  /**
   * Escapes a SQL string value (for use in queries without parameters)
   * @param {string} value - The string value to escape
   * @returns {string} The escaped string value
   */
  static escapeStringValue(value: string): string {
    if (value === null || value === undefined) {
      return 'NULL'
    }
    
    // Escape single quotes by doubling them
    return `'${String(value).replace(/'/g, "''")}'`
  }

  /**
   * Escapes a SQL LIKE pattern value
   * @param {string} pattern - The LIKE pattern to escape
   * @returns {string} The escaped LIKE pattern
   */
  static escapeLikePattern(pattern: string): string {
    if (pattern === null || pattern === undefined) {
      return 'NULL'
    }
    
    // Escape special LIKE characters: %, _, [, ], ^, -
    const escaped = String(pattern)
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape %
      .replace(/_/g, '\\_')    // Escape _
      .replace(/\[/g, '\\[')   // Escape [
      .replace(/\]/g, '\\]')   // Escape ]
      .replace(/\^/g, '\\^')   // Escape ^
      .replace(/-/g, '\\-')    // Escape -
    
    return `'${escaped}'`
  }

  /**
   * Validates and sanitizes a table name
   * @param {string} tableName - The table name to validate
   * @returns {string} The sanitized table name
   * @throws {Error} If table name is invalid
   */
  static validateTableName(tableName: string): string {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Table name must be a non-empty string')
    }
    
    const trimmed = tableName.trim()
    if (trimmed.length === 0) {
      throw new Error('Table name cannot be empty or whitespace only')
    }
    
    // Check length limit
    if (trimmed.length > MAX_TABLE_NAME_LENGTH) {
      throw new Error(`Table name too long. Maximum length is ${MAX_TABLE_NAME_LENGTH} characters`)
    }
    
    // Check for SQL injection patterns
    for (const pattern of DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`Table name contains potentially dangerous pattern: ${pattern.source}`)
      }
    }
    
    // Check for reserved keywords (case-insensitive)
    const upperTrimmed = trimmed.toUpperCase()
    if (SQL_RESERVED_KEYWORDS.includes(upperTrimmed as any)) {
      throw new Error(`Table name cannot be a reserved SQL keyword: ${trimmed}`)
    }
    
    return trimmed
  }

  /**
   * Validates and sanitizes a column name
   * @param {string} columnName - The column name to validate
   * @returns {string} The sanitized column name
   * @throws {Error} If column name is invalid
   */
  static validateColumnName(columnName: string): string {
    if (!columnName || typeof columnName !== 'string') {
      throw new Error('Column name must be a non-empty string')
    }
    
    const trimmed = columnName.trim()
    if (trimmed.length === 0) {
      throw new Error('Column name cannot be empty or whitespace only')
    }
    
    // Check length limit
    if (trimmed.length > MAX_COLUMN_NAME_LENGTH) {
      throw new Error(`Column name too long. Maximum length is ${MAX_COLUMN_NAME_LENGTH} characters`)
    }
    
    // Check for SQL injection patterns
    for (const pattern of DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`Column name contains potentially dangerous pattern: ${pattern.source}`)
      }
    }
    
    // Check for reserved keywords (case-insensitive)
    const upperTrimmed = trimmed.toUpperCase()
    if (SQL_RESERVED_KEYWORDS.includes(upperTrimmed as any)) {
      throw new Error(`Column name cannot be a reserved SQL keyword: ${trimmed}`)
    }
    
    return trimmed
  }

  /**
   * Safely escapes an identifier with validation
   * @param {string} identifier - The identifier to escape
   * @returns {string} The escaped identifier
   * @throws {Error} If identifier is invalid
   */
  static safeEscapeIdentifier(identifier: string): string {
    const validated = SQLHelper.validateColumnName(identifier)
    return SQLHelper.escapeIdentifier(validated)
  }

  /**
   * Safely escapes a table name with validation
   * @param {string} tableName - The table name to escape
   * @returns {string} The escaped table name
   * @throws {Error} If table name is invalid
   */
  static safeEscapeTableName(tableName: string): string {
    const validated = SQLHelper.validateTableName(tableName)
    return SQLHelper.escapeIdentifier(validated)
  }

  /**
   * Builds a comma-separated list of escaped column names
   * @param {string[]} columns - Array of column names
   * @returns {string} Comma-separated list of escaped column names
   */
  static buildColumnList(columns: string[]): string {
    return columns.map((col) => SQLHelper.safeEscapeIdentifier(col)).join(', ')
  }

  /**
   * Builds a comma-separated list of parameter placeholders
   * @param {number} count - Number of placeholders to generate
   * @returns {string} Comma-separated list of parameter placeholders ($1, $2, etc.)
   */
  static buildValuePlaceholders(count: number): string {
    return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ')
  }

  /**
   * Builds a SET clause for UPDATE queries
   * @param {Record<string, any>} data - Object containing column-value pairs
   * @returns {{ sql: string; params: any[] }} SET clause SQL and parameters
   */
  static buildSetClause(data: Record<string, any>): {
    sql: string
    params: any[]
  } {
    const entries = Object.entries(data)
    const setParts: string[] = []
    const params: any[] = []

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i] as [string, any]
      setParts.push(`${SQLHelper.safeEscapeIdentifier(key)} = $${i + 1}`)
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
  static buildWhereConditions(
    conditions: Array<{ column: string; operator: string; value?: any }>
  ): { sql: string; params: any[] } {
    if (conditions.length === 0) {
      return { sql: '', params: [] }
    }

    const whereParts: string[] = []
    const params: any[] = []

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const { column, operator, value } = condition as {
        column: string
        operator: string
        value?: any
      }

      if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
        whereParts.push(`${SQLHelper.safeEscapeIdentifier(column)} ${operator}`)
      } else if (operator === 'IN' || operator === 'NOT IN') {
        if (Array.isArray(value)) {
          const placeholders = value
            .map((_, j) => `$${params.length + j + 1}`)
            .join(', ')
          whereParts.push(
            `${SQLHelper.safeEscapeIdentifier(column)} ${operator} (${placeholders})`
          )
          params.push(...value)
        }
      } else {
        whereParts.push(
          `${SQLHelper.safeEscapeIdentifier(column)} ${operator} $${params.length + 1}`
        )
        params.push(value)
      }
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
  static buildJoinClause(
    joins: Array<{ type: string; table: string; on: string; alias?: string }>
  ): string {
    return joins
      .map((join) => {
        const tablePart = join.alias
          ? `${SQLHelper.safeEscapeTableName(join.table)} AS ${SQLHelper.safeEscapeIdentifier(join.alias)}`
          : SQLHelper.safeEscapeTableName(join.table)
        return `${join.type} JOIN ${tablePart} ON ${join.on}`
      })
      .join(' ')
  }

  /**
   * Builds ORDER BY clause from an array of order conditions
   * @param {Array<{ column: string; direction: string }>} orders - Array of order conditions
   * @returns {string} ORDER BY clause SQL
   */
  static buildOrderByClause(
    orders: Array<{ column: string; direction: string }>
  ): string {
    return orders
      .map(
        (order) =>
          `${SQLHelper.safeEscapeIdentifier(order.column)} ${order.direction}`
      )
      .join(', ')
  }

  /**
   * Builds GROUP BY clause from an array of column names
   * @param {string[]} groups - Array of column names to group by
   * @returns {string} GROUP BY clause SQL
   */
  static buildGroupByClause(groups: string[]): string {
    return groups.map((group) => SQLHelper.safeEscapeIdentifier(group)).join(', ')
  }

  /**
   * Sanitizes a table name by removing potentially dangerous characters
   * @param {string} table - Table name to sanitize
   * @returns {string} Sanitized table name
   */
  static sanitizeTableName(table: string): string {
    // Remove any potentially dangerous characters
    return table.replace(/[^a-zA-Z0-9_]/g, '')
  }

  /**
   * Builds INSERT VALUES clause from an array of data objects
   * @param {Record<string, any>[]} data - Array of data objects to insert
   * @returns {{ columns: string; placeholders: string; params: any[] }} INSERT clause components
   * @throws {Error} When no data is provided
   */
  static buildInsertValues(data: Record<string, any>[]): {
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
      columns: SQLHelper.buildColumnList(columns),
      placeholders: placeholders.join(', '),
      params,
    }
  }
}
