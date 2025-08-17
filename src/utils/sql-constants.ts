/**
 * Dangerous SQL patterns that could indicate SQL injection attempts
 * These patterns are checked against table names, column names, and other identifiers
 */
export const DANGEROUS_SQL_PATTERNS = [
  /--/, // SQL comments
  /\/\*/, // C-style comments
  /\*\//, // C-style comments
  /;/, // Statement separators
] as const

/**
 * SQL reserved keywords that should be avoided in identifiers
 * These are common SQL keywords that could cause issues if used as identifiers
 */
export const SQL_RESERVED_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'CREATE',
  'ALTER',
  'TABLE',
  'INDEX',
  'VIEW',
  'PROCEDURE',
  'FUNCTION',
  'TRIGGER',
  'UNION',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'ON',
  'AS',
  'ORDER',
  'GROUP',
  'BY',
  'HAVING',
  'DISTINCT',
  'TOP',
  'LIMIT',
  'OFFSET',
  'AND',
  'OR',
  'NOT',
  'IN',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'IS',
  'NULL',
  'TRUE',
  'FALSE',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'IF',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'TRANSACTION',
  'GRANT',
  'REVOKE',
  'PRIMARY',
  'FOREIGN',
  'KEY',
  'CONSTRAINT',
  'DEFAULT',
  'CHECK',
  'UNIQUE',
  'REFERENCES',
  'CASCADE',
  'RESTRICT',
  'SET',
  'VALUES',
  'INTO',
  'SET',
  'COLUMN',
  'DATABASE',
  'SCHEMA',
] as string[]

/**
 * Maximum allowed length for identifiers to prevent buffer overflow attacks
 */
export const MAX_IDENTIFIER_LENGTH = 128

/**
 * Allowed WHERE operators
 */
export const FULL_WHERE_OPERATORS = [
  '=',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'LIKE',
  'ILIKE',
  'NOT LIKE',
  'NOT ILIKE',
  'IN',
  'NOT IN',
  'IS NULL',
  'IS NOT NULL',
  'RAW',
] as string[]
