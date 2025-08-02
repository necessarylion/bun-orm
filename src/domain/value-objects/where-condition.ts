/**
 * WhereCondition value object representing SQL WHERE conditions
 */
export type Operator = 
  | '=' | '!=' | '<>' | '<' | '<=' | '>' | '>='
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN' | 'BETWEEN' | 'NOT BETWEEN'
  | 'IS NULL' | 'IS NOT NULL'
  | 'EXISTS' | 'NOT EXISTS';

export type LogicalOperator = 'AND' | 'OR';

export interface WhereClause {
  column: string;
  operator: Operator;
  value?: any;
  values?: any[];
  subQuery?: string;
}

export interface WhereGroup {
  operator: LogicalOperator;
  conditions: (WhereClause | WhereGroup)[];
}

export class WhereCondition {
  private clauses: (WhereClause | WhereGroup)[] = [];

  /**
   * Add a simple WHERE condition
   */
  where(column: string, operator: Operator, value?: any): this {
    this.clauses.push({ column, operator, value });
    return this;
  }

  /**
   * Add a WHERE IN condition
   */
  whereIn(column: string, values: any[]): this {
    this.clauses.push({ column, operator: 'IN', values });
    return this;
  }

  /**
   * Add a WHERE NOT IN condition
   */
  whereNotIn(column: string, values: any[]): this {
    this.clauses.push({ column, operator: 'NOT IN', values });
    return this;
  }

  /**
   * Add a WHERE BETWEEN condition
   */
  whereBetween(column: string, min: any, max: any): this {
    this.clauses.push({ column, operator: 'BETWEEN', values: [min, max] });
    return this;
  }

  /**
   * Add a WHERE NOT BETWEEN condition
   */
  whereNotBetween(column: string, min: any, max: any): this {
    this.clauses.push({ column, operator: 'NOT BETWEEN', values: [min, max] });
    return this;
  }

  /**
   * Add a WHERE NULL condition
   */
  whereNull(column: string): this {
    this.clauses.push({ column, operator: 'IS NULL' });
    return this;
  }

  /**
   * Add a WHERE NOT NULL condition
   */
  whereNotNull(column: string): this {
    this.clauses.push({ column, operator: 'IS NOT NULL' });
    return this;
  }

  /**
   * Add a WHERE EXISTS condition
   */
  whereExists(subQuery: string): this {
    this.clauses.push({ column: '', operator: 'EXISTS', subQuery });
    return this;
  }

  /**
   * Add a WHERE NOT EXISTS condition
   */
  whereNotExists(subQuery: string): this {
    this.clauses.push({ column: '', operator: 'NOT EXISTS', subQuery });
    return this;
  }

  /**
   * Add an AND group of conditions
   */
  andWhere(callback: (condition: WhereCondition) => void): this {
    const groupCondition = new WhereCondition();
    callback(groupCondition);
    this.clauses.push({ operator: 'AND', conditions: groupCondition.getClauses() });
    return this;
  }

  /**
   * Add an OR group of conditions
   */
  orWhere(callback: (condition: WhereCondition) => void): this {
    const groupCondition = new WhereCondition();
    callback(groupCondition);
    this.clauses.push({ operator: 'OR', conditions: groupCondition.getClauses() });
    return this;
  }

  /**
   * Get all clauses
   */
  getClauses(): (WhereClause | WhereGroup)[] {
    return this.clauses;
  }

  /**
   * Check if there are any conditions
   */
  hasConditions(): boolean {
    return this.clauses.length > 0;
  }

  /**
   * Clear all conditions
   */
  clear(): this {
    this.clauses = [];
    return this;
  }
} 