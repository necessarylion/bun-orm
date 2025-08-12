/**
 * add count column to select
 * @param {string} column - Column to count
 * @param {string} alias - Alias for the count column
 * @returns {string} SQL string
 */
export function count(column: string = '*', alias?: string): string {
  const aliasName = alias ? alias : `${column}_count`.replace('*_', '')
  const sql = `CAST(COUNT(${column}) as REAL) as ${aliasName}`
  return sql
}

/**
 * add sum column to select
 * @param {string} column - Column to sum
 * @param {string} alias - Alias for the sum column
 * @returns {string} SQL string
 */
export function sum(column: string, alias?: string): string {
  const aliasName = alias ? alias : `${column}_sum`.replace('*_', '')
  const sql = `CAST(SUM(${column}) as REAL) as ${aliasName}`
  return sql
}

/**
 * add avg column to select
 * @param {string} column - Column to avg
 * @param {string} alias - Alias for the avg column
 * @returns {string} SQL string
 */
export function avg(column: string, alias?: string): string {
  const aliasName = alias ? alias : `${column}_avg`.replace('*_', '')
  const sql = `CAST(AVG(${column}) as REAL) as ${aliasName}`
  return sql
}
