/**
 * Join value object representing SQL JOIN clauses
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

export interface JoinClause {
  type: JoinType;
  table: string;
  alias?: string;
  condition: string;
}

export class Join {
  private joins: JoinClause[] = [];

  /**
   * Add an INNER JOIN
   */
  innerJoin(table: string, condition: string, alias?: string): this {
    this.joins.push({ type: 'INNER', table, condition, alias });
    return this;
  }

  /**
   * Add a LEFT JOIN
   */
  leftJoin(table: string, condition: string, alias?: string): this {
    this.joins.push({ type: 'LEFT', table, condition, alias });
    return this;
  }

  /**
   * Add a RIGHT JOIN
   */
  rightJoin(table: string, condition: string, alias?: string): this {
    this.joins.push({ type: 'RIGHT', table, condition, alias });
    return this;
  }

  /**
   * Add a FULL JOIN
   */
  fullJoin(table: string, condition: string, alias?: string): this {
    this.joins.push({ type: 'FULL', table, condition, alias });
    return this;
  }

  /**
   * Add a CROSS JOIN
   */
  crossJoin(table: string, alias?: string): this {
    this.joins.push({ type: 'CROSS', table, condition: '', alias });
    return this;
  }

  /**
   * Add a generic JOIN
   */
  join(type: JoinType, table: string, condition: string, alias?: string): this {
    this.joins.push({ type, table, condition, alias });
    return this;
  }

  /**
   * Get all join clauses
   */
  getJoins(): JoinClause[] {
    return this.joins;
  }

  /**
   * Check if there are any joins
   */
  hasJoins(): boolean {
    return this.joins.length > 0;
  }

  /**
   * Clear all joins
   */
  clear(): this {
    this.joins = [];
    return this;
  }
} 