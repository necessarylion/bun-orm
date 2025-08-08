import type {
  WhereCondition,
  WhereGroupCondition,
  NestedQueryBuilder as INestedQueryBuilder,
  FullWhereOperators,
} from '../types'
import { FULL_WHERE_OPERATORS } from '../utils/sql-constants'

export class NestedQueryBuilder implements INestedQueryBuilder {
  private conditions: (WhereCondition | WhereGroupCondition)[] = []

  /**
   * Adds a WHERE condition
   */
  where(column: string, operatorOrValue: any, value?: any): NestedQueryBuilder {
    let operator: FullWhereOperators = '='
    let conditionValue: any

    if (typeof operatorOrValue === 'string' && this.isWhereOperator(operatorOrValue)) {
      // where('id', '=', 2) syntax
      operator = operatorOrValue as FullWhereOperators
      conditionValue = value
    } else {
      // where('id', 2) syntax - default to '=' operator
      conditionValue = operatorOrValue
    }

    // Handle null values
    if (operator === '=' && conditionValue === null) {
      operator = 'IS NULL'
      conditionValue = undefined
    } else if (operator === '!=' && conditionValue === null) {
      operator = 'IS NOT NULL'
      conditionValue = undefined
    }

    this.conditions.push({ column, operator, value: conditionValue })
    return this
  }

  /**
   * Adds an OR WHERE condition
   */
  orWhere(column: string, operatorOrValue: any, value?: any): NestedQueryBuilder {
    // Create an OR group with the new condition
    const orGroup: WhereGroupCondition = {
      type: 'OR',
      conditions: [],
    }

    // Add existing conditions as first condition in OR group
    if (this.conditions.length > 0) {
      orGroup.conditions.push(...this.conditions)
    }

    // Add the new condition
    let operator: FullWhereOperators = '='
    let conditionValue: any

    if (typeof operatorOrValue === 'string' && this.isWhereOperator(operatorOrValue)) {
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

    orGroup.conditions.push({ column, operator, value: conditionValue })

    // Replace all conditions with the OR group
    this.conditions = [orGroup]
    return this
  }

  /**
   * Adds a WHERE IN condition
   */
  whereIn(column: string, value: any[]): NestedQueryBuilder {
    this.conditions.push({ column, operator: 'IN', value })
    return this
  }

  /**
   * Adds an OR WHERE IN condition
   */
  orWhereIn(column: string, value: any[]): NestedQueryBuilder {
    const orGroup: WhereGroupCondition = {
      type: 'OR',
      conditions: [],
    }

    if (this.conditions.length > 0) {
      orGroup.conditions.push(...this.conditions)
    }

    orGroup.conditions.push({ column, operator: 'IN', value })
    this.conditions = [orGroup]
    return this
  }

  /**
   * Adds a WHERE NOT IN condition
   */
  whereNotIn(column: string, value: any[]): NestedQueryBuilder {
    this.conditions.push({ column, operator: 'NOT IN', value })
    return this
  }

  /**
   * Adds an OR WHERE NOT IN condition
   */
  orWhereNotIn(column: string, value: any[]): NestedQueryBuilder {
    const orGroup: WhereGroupCondition = {
      type: 'OR',
      conditions: [],
    }

    if (this.conditions.length > 0) {
      orGroup.conditions.push(...this.conditions)
    }

    orGroup.conditions.push({ column, operator: 'NOT IN', value })
    this.conditions = [orGroup]
    return this
  }

  /**
   * Adds a WHERE NULL condition
   */
  whereNull(column: string): NestedQueryBuilder {
    this.conditions.push({ column, operator: 'IS NULL' })
    return this
  }

  /**
   * Adds an OR WHERE NULL condition
   */
  orWhereNull(column: string): NestedQueryBuilder {
    const orGroup: WhereGroupCondition = {
      type: 'OR',
      conditions: [],
    }

    if (this.conditions.length > 0) {
      orGroup.conditions.push(...this.conditions)
    }

    orGroup.conditions.push({ column, operator: 'IS NULL' })
    this.conditions = [orGroup]
    return this
  }

  /**
   * Adds a WHERE NOT NULL condition
   */
  whereNotNull(column: string): NestedQueryBuilder {
    this.conditions.push({ column, operator: 'IS NOT NULL' })
    return this
  }

  /**
   * Adds an OR WHERE NOT NULL condition
   */
  orWhereNotNull(column: string): NestedQueryBuilder {
    const orGroup: WhereGroupCondition = {
      type: 'OR',
      conditions: [],
    }

    if (this.conditions.length > 0) {
      orGroup.conditions.push(...this.conditions)
    }

    orGroup.conditions.push({ column, operator: 'IS NOT NULL' })
    this.conditions = [orGroup]
    return this
  }

  /**
   * Adds a raw WHERE condition
   */
  whereRaw(sql: string, params: any[]): NestedQueryBuilder {
    // For raw conditions, we'll create a special condition type
    this.conditions.push({ column: sql, operator: 'RAW', value: params } as any)
    return this
  }

  /**
   * Adds an OR raw WHERE condition
   */
  orWhereRaw(sql: string, params: any[]): NestedQueryBuilder {
    const orGroup: WhereGroupCondition = {
      type: 'OR',
      conditions: [],
    }

    if (this.conditions.length > 0) {
      orGroup.conditions.push(...this.conditions)
    }

    orGroup.conditions.push({ column: sql, operator: 'RAW', value: params } as any)
    this.conditions = [orGroup]
    return this
  }

  /**
   * Gets the built conditions
   */
  getConditions(): (WhereCondition | WhereGroupCondition)[] {
    return this.conditions
  }

  /**
   * Checks if a string is a valid where operator
   */
  private isWhereOperator(operator: string): boolean {
    return FULL_WHERE_OPERATORS.includes(operator as FullWhereOperators)
  }
}
