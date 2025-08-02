import { DatabaseConnection } from '../../infrastructure/connection/database-connection';
import { QueryResult } from '../../domain/entities/query-result';
import { WhereCondition, OrderBy, Join, Column, Table } from '../../domain/value-objects';

/**
 * Query builder for PostgreSQL using Bun's SQL API
 */
export class QueryBuilder<T = any> {
  private table: string = '';
  private columns: string[] = ['*'];
  private whereCondition: WhereCondition = new WhereCondition();
  private _orderBy: OrderBy = new OrderBy();
  private join: Join = new Join();
  private limitValue?: number;
  private offsetValue?: number;
  private groupByColumns: string[] = [];
  private havingCondition: WhereCondition = new WhereCondition();
  private _distinct: boolean = false;

  constructor(private connection: DatabaseConnection) {}

  /**
   * Set the table to query from
   */
  from(table: string | Table): this {
    this.table = typeof table === 'string' ? table : table.displayName;
    return this;
  }

  /**
   * Set the table with alias
   */
  fromAs(table: string, alias: string): this {
    this.table = `${table} AS ${alias}`;
    return this;
  }

  /**
   * Select specific columns
   */
  select(...columns: (string | Column)[]): this {
    this.columns = columns.map(col => 
      typeof col === 'string' ? col : col.displayName
    );
    return this;
  }

  /**
   * Select all columns
   */
  selectAll(): this {
    this.columns = ['*'];
    return this;
  }

  /**
   * Add DISTINCT clause
   */
  distinct(): this {
    this._distinct = true;
    return this;
  }

  /**
   * Add WHERE conditions
   */
  where(column: string, operator: string, value?: any): this {
    this.whereCondition.where(column, operator as any, value);
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  whereIn(column: string, values: any[]): this {
    this.whereCondition.whereIn(column, values);
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   */
  whereNotIn(column: string, values: any[]): this {
    this.whereCondition.whereNotIn(column, values);
    return this;
  }

  /**
   * Add WHERE BETWEEN condition
   */
  whereBetween(column: string, min: any, max: any): this {
    this.whereCondition.whereBetween(column, min, max);
    return this;
  }

  /**
   * Add WHERE NULL condition
   */
  whereNull(column: string): this {
    this.whereCondition.whereNull(column);
    return this;
  }

  /**
   * Add WHERE NOT NULL condition
   */
  whereNotNull(column: string): this {
    this.whereCondition.whereNotNull(column);
    return this;
  }

  /**
   * Add AND WHERE group
   */
  andWhere(callback: (condition: WhereCondition) => void): this {
    this.whereCondition.andWhere(callback);
    return this;
  }

  /**
   * Add OR WHERE group
   */
  orWhere(callback: (condition: WhereCondition) => void): this {
    this.whereCondition.orWhere(callback);
    return this;
  }

  /**
   * Add JOIN clauses
   */
  innerJoin(table: string, condition: string, alias?: string): this {
    this.join.innerJoin(table, condition, alias);
    return this;
  }

  leftJoin(table: string, condition: string, alias?: string): this {
    this.join.leftJoin(table, condition, alias);
    return this;
  }

  rightJoin(table: string, condition: string, alias?: string): this {
    this.join.rightJoin(table, condition, alias);
    return this;
  }

  fullJoin(table: string, condition: string, alias?: string): this {
    this.join.fullJoin(table, condition, alias);
    return this;
  }

  crossJoin(table: string, alias?: string): this {
    this.join.crossJoin(table, alias);
    return this;
  }

  /**
   * Add ORDER BY clauses
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this._orderBy.orderBy(column, direction);
    return this;
  }

  orderByAsc(column: string): this {
    this._orderBy.orderByAsc(column);
    return this;
  }

  orderByDesc(column: string): this {
    this._orderBy.orderByDesc(column);
    return this;
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(...columns: string[]): this {
    this.groupByColumns.push(...columns);
    return this;
  }

  /**
   * Add HAVING clause
   */
  having(column: string, operator: string, value?: any): this {
    this.havingCondition.where(column, operator as any, value);
    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * Build the SQL query string
   */
  private buildQuery(): { query: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 0;

    // SELECT clause
    const distinctClause = this._distinct ? 'DISTINCT ' : '';
    const selectClause = `SELECT ${distinctClause}${this.columns.join(', ')}`;

    // FROM clause
    const fromClause = `FROM ${this.table}`;

    // JOIN clauses
    let joinClause = '';
    if (this.join.hasJoins()) {
      joinClause = ' ' + this.join.getJoins()
        .map(join => {
          const tableName = join.alias ? `${join.table} AS ${join.alias}` : join.table;
          return `${join.type} JOIN ${tableName} ON ${join.condition}`;
        })
        .join(' ');
    }

    // WHERE clause
    let whereClause = '';
    if (this.whereCondition.hasConditions()) {
      whereClause = ' WHERE ' + this.buildWhereClause(this.whereCondition.getClauses(), params, paramIndex);
    }

    // GROUP BY clause
    let groupByClause = '';
    if (this.groupByColumns.length > 0) {
      groupByClause = ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // HAVING clause
    let havingClause = '';
    if (this.havingCondition.hasConditions()) {
      havingClause = ' HAVING ' + this.buildWhereClauseWithOperator(this.havingCondition.getClauses(), params, paramIndex, 'AND');
    }

    // ORDER BY clause
    let orderByClause = '';
    if (this._orderBy.hasOrders()) {
      orderByClause = ' ORDER BY ' + this._orderBy.getOrders()
        .map(order => {
          let clause = order.column;
          if (order.nullsFirst !== undefined) {
            clause += ` NULLS ${order.nullsFirst ? 'FIRST' : 'LAST'}`;
          }
          return `${clause} ${order.direction}`;
        })
        .join(', ');
    }

    // LIMIT and OFFSET clauses
    let limitOffsetClause = '';
    if (this.limitValue !== undefined) {
      limitOffsetClause += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue !== undefined) {
      limitOffsetClause += ` OFFSET ${this.offsetValue}`;
    }

    const query = [
      selectClause,
      fromClause,
      joinClause,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitOffsetClause
    ].join(' ');

    return { query: query.trim(), params };
  }

  /**
   * Build WHERE clause recursively
   */
  private buildWhereClause(
    clauses: any[], 
    params: any[], 
    paramIndex: number
  ): string {
    return clauses.map(clause => {
      if ('operator' in clause && 'conditions' in clause) {
        // This is a group (AND/OR)
        const groupConditions = this.buildWhereClause(clause.conditions, params, paramIndex);
        return `(${groupConditions})`;
      } else {
        // This is a simple condition
        const { column, operator, value, values, subQuery } = clause;
        
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
          return `${column} ${operator}`;
        }
        
        if (operator === 'EXISTS' || operator === 'NOT EXISTS') {
          return `${operator} (${subQuery})`;
        }
        
        if (operator === 'IN' || operator === 'NOT IN') {
          const placeholders = values.map(() => `$${++paramIndex}`).join(', ');
          params.push(...values);
          return `${column} ${operator} (${placeholders})`;
        }
        
        if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
          params.push(values[0], values[1]);
          return `${column} ${operator} $${++paramIndex} AND $${++paramIndex}`;
        }
        
        // Simple comparison
        params.push(value);
        return `${column} ${operator} $${++paramIndex}`;
      }
    }).join(' AND ');
  }

  /**
   * Build WHERE clause with proper operator handling
   */
  private buildWhereClauseWithOperator(
    clauses: any[], 
    params: any[], 
    paramIndex: number,
    operator: string = 'AND'
  ): string {
    return clauses.map(clause => {
      if ('operator' in clause && 'conditions' in clause) {
        // This is a group (AND/OR)
        const groupConditions = this.buildWhereClauseWithOperator(clause.conditions, params, paramIndex, clause.operator);
        return `(${groupConditions})`;
      } else {
        // This is a simple condition
        const { column, operator: conditionOperator, value, values, subQuery } = clause;
        
        if (conditionOperator === 'IS NULL' || conditionOperator === 'IS NOT NULL') {
          return `${column} ${conditionOperator}`;
        }
        
        if (conditionOperator === 'EXISTS' || conditionOperator === 'NOT EXISTS') {
          return `${conditionOperator} (${subQuery})`;
        }
        
        if (conditionOperator === 'IN' || conditionOperator === 'NOT IN') {
          const placeholders = values.map(() => `$${++paramIndex}`).join(', ');
          params.push(...values);
          return `${column} ${conditionOperator} (${placeholders})`;
        }
        
        if (conditionOperator === 'BETWEEN' || conditionOperator === 'NOT BETWEEN') {
          params.push(values[0], values[1]);
          return `${column} ${conditionOperator} $${++paramIndex} AND $${++paramIndex}`;
        }
        
        // Simple comparison
        params.push(value);
        return `${column} ${conditionOperator} $${++paramIndex}`;
      }
    }).join(` ${operator} `);
  }

  /**
   * Execute the query and return results
   */
  async get(): Promise<QueryResult<T>> {
    const { query, params } = this.buildQuery();
    const sql = this.connection.getSql();
    
    try {
      const result = sql.prepare(query).all(params);
      return new QueryResult<T>(result as T[], result.length);
    } catch (error) {
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  /**
   * Execute the query and return the first result
   */
  async first(): Promise<T | null> {
    this.limit(1);
    const result = await this.get();
    return result.first || null;
  }

  /**
   * Execute the query and return the count
   */
  async count(): Promise<number> {
    const originalColumns = this.columns;
    this.columns = ['COUNT(*) as count'];
    
    try {
      const result = (await this.get()) as any;
      return result.first?.count || 0;
    } finally {
      this.columns = originalColumns;
    }
  }

  /**
   * Execute the query and return if exists
   */
  async exists(): Promise<boolean> {
    const result = await this.first();
    return result !== null;
  }

  /**
   * Get the raw SQL query
   */
  toSql(): string {
    return this.buildQuery().query;
  }

  /**
   * Reset the query builder
   */
  reset(): this {
    this.table = '';
    this.columns = ['*'];
    this.whereCondition = new WhereCondition();
    this._orderBy = new OrderBy();
    this.join = new Join();
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.groupByColumns = [];
    this.havingCondition = new WhereCondition();
    this._distinct = false;
    return this;
  }
} 