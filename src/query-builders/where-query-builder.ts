import type { WhereCallback, WhereCondition, WhereGroupCondition, WhereOperator } from '../types'
import { FULL_WHERE_OPERATORS } from '../utils/sql-constants'

export class WhereQueryBuilder<Q = any> {
  public whereConditions: WhereCondition[] = []
  public whereGroupConditions: WhereGroupCondition[] = []

  /**
   * Adds a WHERE condition to the query
   * Supports both syntaxes:
   * - where('id', '=', 2) - with explicit operator
   * - where('id', 2) - defaults to '=' operator
   * - where((query) => {
   *    query.where('id', 1)
   *    query.orWhere('name', 'Jane Smith')
   *  })
   */
  public where(callback: WhereCallback): Q
  public where(column: string, value: any): Q
  public where(column: string, operator: WhereOperator, value: any): Q
  public where(columnOrCallback: string | WhereCallback, operatorOrValue?: any, value?: any): Q {
    this.addWhere('AND', columnOrCallback, operatorOrValue, value)
    return this as any as Q
  }

  /**
   * Adds a raw WHERE condition to the query
   * @param {string} sql - Raw SQL condition
   * @param {any[]} params - Parameters for the raw SQL condition
   * @returns {Q} Query builder chain for method chaining
   */
  public whereRaw(sql: string, params?: any[]): Q {
    return this.where(sql, 'RAW', params)
  }

  /**
   * Adds a WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {NonNullable<any>[]} values - Array of values to match against
   * @returns {Q} Query builder chain for method chaining
   */
  public whereIn(column: string, values: NonNullable<any>[]): Q {
    return this.where(column, 'IN', values)
  }

  /**
   * Adds a WHERE NOT IN condition to the query
   * @param {string} column - Column name
   * @param {NonNullable<any>[]} values - Array of values to exclude
   * @returns {Q} Query builder chain for method chaining
   */
  public whereNotIn(column: string, values: NonNullable<any>[]): Q {
    return this.where(column, 'NOT IN', values)
  }

  /**
   * Adds a WHERE IS NULL condition to the query
   * @param {string} column - Column name
   * @returns {Q} Query builder chain for method chaining
   */
  public whereNull(column: string): Q {
    return this.where(column, '=', null)
  }

  /**
   * Adds a WHERE IS NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {Q} Query builder chain for method chaining
   */
  public whereNotNull(column: string): Q {
    return this.where(column, '!=', null)
  }

  public whereBetween(column: string, [start, end]: [any, any]): Q {
    return this.whereRaw(`${column} BETWEEN ? AND ?`, [start, end])
  }

  public whereNotBetween(column: string, [start, end]: [any, any]): Q {
    return this.whereRaw(`${column} NOT BETWEEN ? AND ?`, [start, end])
  }

  public orWhereBetween(column: string, [start, end]: [any, any]): Q {
    return this.orWhereRaw(`${column} BETWEEN ? AND ?`, [start, end])
  }

  public orWhereNotBetween(column: string, [start, end]: [any, any]): Q {
    return this.orWhereRaw(`${column} NOT BETWEEN ? AND ?`, [start, end])
  }

  public whereLike(column: string, value: string): Q {
    return this.where(column, 'LIKE', value)
  }

  public orWhereLike(column: string, value: string): Q {
    return this.orWhere(column, 'LIKE', value)
  }

  public whereILike(column: string, value: string): Q {
    return this.where(column, 'ILIKE', value)
  }

  public orWhereILike(column: string, value: string): Q {
    return this.orWhere(column, 'ILIKE', value)
  }

  public whereNotLike(column: string, value: string): Q {
    return this.where(column, 'NOT LIKE', value)
  }

  public orWhereNotLike(column: string, value: string): Q {
    return this.orWhere(column, 'NOT LIKE', value)
  }

  public whereNotILike(column: string, value: string): Q {
    return this.where(column, 'NOT ILIKE', value)
  }

  public orWhereNotILike(column: string, value: string): Q {
    return this.orWhere(column, 'NOT ILIKE', value)
  }

  /**
   * Adds an OR WHERE condition to the query
   */
  public orWhere(callback: WhereCallback): Q
  public orWhere(column: string, value: any): Q
  public orWhere(column: string, operator: WhereOperator, value: any): Q
  public orWhere(columnOrCallback: string | WhereCallback, operatorOrValue?: any, value?: any): Q {
    this.addWhere('OR', columnOrCallback, operatorOrValue, value)
    return this as any as Q
  }

  /**
   * Adds an OR raw WHERE condition to the query
   * @param {string} sql - Raw SQL condition
   * @param {any[]} params - Parameters for the raw SQL condition
   * @returns {Q} Query builder chain for method chaining
   */
  public orWhereRaw(sql: string, params?: any[]): Q {
    return this.orWhere(sql, 'RAW', params)
  }

  /**
   * Adds an OR WHERE IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to match against
   * @returns {Q} Query builder chain for method chaining
   */
  public orWhereIn(column: string, values: any[]): Q {
    return this.orWhere(column, 'IN', values)
  }

  /**
   * Adds an OR WHERE NOT IN condition to the query
   * @param {string} column - Column name
   * @param {any[]} values - Array of values to exclude
   * @returns {Q} Query builder chain for method chaining
   */
  public orWhereNotIn(column: string, values: any[]): Q {
    return this.orWhere(column, 'NOT IN', values)
  }

  /**
   * Adds an OR WHERE NULL condition to the query
   * @param {string} column - Column name
   * @returns {Q} Query builder chain for method chaining
   */
  public orWhereNull(column: string): Q {
    return this.orWhere(column, '=', null)
  }

  /**
   * Adds an OR WHERE NOT NULL condition to the query
   * @param {string} column - Column name
   * @returns {Q} Query builder chain for method chaining
   */
  public orWhereNotNull(column: string): Q {
    return this.orWhere(column, '!=', null)
  }

  /**
   * Adds a WHERE condition to the query
   * @param type - The type of condition to add (AND or OR)
   * @param columnOrCallback - The column name or callback function
   * @param operatorOrValue - The operator or value
   * @param value - The value
   * @returns void
   */
  protected addWhere(
    type: 'AND' | 'OR',
    columnOrCallback: string | WhereCallback,
    operatorOrValue?: any,
    value?: any
  ): void {
    // Handle callback-based where
    if (typeof columnOrCallback === 'function') {
      this.addWhereCallback(columnOrCallback, type)
      return
    }

    // Handle regular where conditions
    const column = columnOrCallback as string
    let operator: WhereOperator = '='
    let conditionValue: any

    if (typeof operatorOrValue === 'string' && FULL_WHERE_OPERATORS.includes(operatorOrValue)) {
      // where('id', '=', 2) syntax
      operator = operatorOrValue as WhereOperator
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

    if (type === 'AND') {
      this.addWhereCondition(column, operator, conditionValue)
    } else {
      this.addOrWhereCondition(column, operator, conditionValue)
    }
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {FullWhereOperators} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   */
  protected addWhereCondition(column: string, operator: WhereOperator, value?: any): void {
    this.whereConditions.push({ column, operator, value, type: 'AND' })
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {FullWhereOperators} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   */
  protected addOrWhereCondition(column: string, operator: WhereOperator, value?: any): void {
    this.whereConditions.push({ column, operator, value, type: 'OR' })
  }

  /**
   * Adds a callback-based WHERE condition to the query
   * @param {WhereCallback} callback - Callback function that receives a NestedQueryBuilder
   */
  protected addWhereCallback(callback: WhereCallback, type: 'AND' | 'OR'): void {
    const nestedBuilder = new WhereQueryBuilder<WhereQueryBuilder>()
    callback(nestedBuilder)
    const conditions = [...nestedBuilder.whereConditions, ...nestedBuilder.whereGroupConditions]
    // Multiple conditions - wrap in AND group
    this.whereGroupConditions.push({
      type,
      conditions,
    })
  }
}
