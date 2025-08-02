/**
 * OrderBy value object representing SQL ORDER BY clauses
 */
export type OrderDirection = 'ASC' | 'DESC';

export interface OrderClause {
  column: string;
  direction: OrderDirection;
  nullsFirst?: boolean;
}

export class OrderBy {
  private orders: OrderClause[] = [];

  /**
   * Add an ORDER BY clause
   */
  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    this.orders.push({ column, direction });
    return this;
  }

  /**
   * Add an ORDER BY ASC clause
   */
  orderByAsc(column: string): this {
    return this.orderBy(column, 'ASC');
  }

  /**
   * Add an ORDER BY DESC clause
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'DESC');
  }

  /**
   * Add an ORDER BY clause with NULLS FIRST
   */
  orderByNullsFirst(column: string, direction: OrderDirection = 'ASC'): this {
    this.orders.push({ column, direction, nullsFirst: true });
    return this;
  }

  /**
   * Add an ORDER BY clause with NULLS LAST
   */
  orderByNullsLast(column: string, direction: OrderDirection = 'ASC'): this {
    this.orders.push({ column, direction, nullsFirst: false });
    return this;
  }

  /**
   * Get all order clauses
   */
  getOrders(): OrderClause[] {
    return this.orders;
  }

  /**
   * Check if there are any order clauses
   */
  hasOrders(): boolean {
    return this.orders.length > 0;
  }

  /**
   * Clear all order clauses
   */
  clear(): this {
    this.orders = [];
    return this;
  }
} 