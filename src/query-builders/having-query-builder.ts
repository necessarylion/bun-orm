import type { HavingOperator, WhereCondition } from '../types'
import { FULL_WHERE_OPERATORS } from '../utils/sql-constants'

export class HavingQueryBuilder<Q = any> {
  public havingConditions: WhereCondition[] = []

  public having(column: string, value: any): Q
  public having(column: string, operator: HavingOperator, value: any): Q
  public having(column: string, operatorOrValue?: any, value?: any): Q {
    this.addHaving(column, operatorOrValue, value)
    return this as any as Q
  }

  public havingRaw(sql: string, params?: any[]): Q {
    this.addHaving(sql, 'RAW', params)
    return this as any as Q
  }

  protected addHaving(column: string, operatorOrValue?: any, value?: any): void {
    // Handle regular where conditions
    let operator: HavingOperator = '='
    let conditionValue: any

    if (typeof operatorOrValue === 'string' && FULL_WHERE_OPERATORS.includes(operatorOrValue)) {
      // where('id', '=', 2) syntax
      operator = operatorOrValue as HavingOperator
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
    this.addHavingCondition(column, operator, conditionValue)
  }

  /**
   * Adds a WHERE condition to the query
   * @param {string} column - Column name
   * @param {FullWhereOperators} operator - Comparison operator
   * @param {any} [value] - Value to compare against
   */
  protected addHavingCondition(column: string, operator: HavingOperator, value?: any): void {
    this.havingConditions.push({ column, operator, value, type: 'AND' })
  }
}
