import { DatabaseConnection } from '../../infrastructure/connection/database-connection';
import { QueryResult } from '../../domain/entities/query-result';
import { WhereCondition } from '../../domain/value-objects';

/**
 * Update query builder for PostgreSQL using Bun's SQL API
 */
export class UpdateQueryBuilder<T = any> {
  private table: string = '';
  private setValues: Record<string, any> = {};
  private whereCondition: WhereCondition = new WhereCondition();
  private returningColumns: string[] = [];

  constructor(private connection: DatabaseConnection) {}

  /**
   * Set the table to update
   */
  update(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * Set a single column value
   */
  set(column: string, value: any): this {
    this.setValues[column] = value;
    return this;
  }

  /**
   * Set multiple column values
   */
  setMany(values: Record<string, any>): this {
    Object.assign(this.setValues, values);
    return this;
  }

  /**
   * Increment a numeric column
   */
  increment(column: string, amount: number = 1): this {
    this.setValues[column] = `$${column} + ${amount}`;
    return this;
  }

  /**
   * Decrement a numeric column
   */
  decrement(column: string, amount: number = 1): this {
    this.setValues[column] = `$${column} - ${amount}`;
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
   * Set columns to return after update
   */
  returning(...columns: string[]): this {
    this.returningColumns = columns.length > 0 ? columns : [];
    return this;
  }

  /**
   * Build the UPDATE query
   */
  private buildQuery(): { query: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    const params: any[] = [];
    let paramIndex = 0;

    // Build the UPDATE statement
    let query = `UPDATE ${this.table}`;

    // Build SET clause
    if (Object.keys(this.setValues).length === 0) {
      // For SQL generation without values, use placeholder
      query += ` SET `;
    } else {
      const setClauses = Object.entries(this.setValues).map(([column, value]) => {
        if (typeof value === 'string' && value.startsWith('$') && value.includes(' + ')) {
          // Handle increment/decrement
          return `${column} = ${value}`;
        } else if (typeof value === 'string' && value.startsWith('$') && value.includes(' - ')) {
          // Handle increment/decrement
          return `${column} = ${value}`;
        } else {
          params.push(value);
          return `${column} = $${++paramIndex}`;
        }
      });

      query += ` SET ${setClauses.join(', ')}`;
    }

    // Add WHERE clause
    if (this.whereCondition.hasConditions()) {
      query += ' WHERE ' + this.buildWhereClauseWithOperator(this.whereCondition.getClauses(), params, paramIndex, 'AND');
    }

    // Add RETURNING clause
    if (this.returningColumns.length > 0) {
      query += ` RETURNING ${this.returningColumns.join(', ')}`;
    }

    return { query, params };
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
   * Execute the UPDATE query
   */
  async execute(): Promise<QueryResult<T>> {
    if (Object.keys(this.setValues).length === 0) {
      throw new Error('No values to update');
    }
    
    const { query, params } = this.buildQuery();
    const db = this.connection.getSql();
    
    try {
      const result = db.prepare(query).all(params);
      return new QueryResult<T>(
        result as T[], 
        result.length, 
        result.length
      );
    } catch (error) {
      throw new Error(`Update query execution failed: ${error}`);
    }
  }

  /**
   * Get the raw SQL query
   */
  toSql(): string {
    return this.buildQuery().query;
  }

  /**
   * Reset the update query builder
   */
  reset(): this {
    this.table = '';
    this.setValues = {};
    this.whereCondition = new WhereCondition();
    this.returningColumns = [];
    return this;
  }
} 