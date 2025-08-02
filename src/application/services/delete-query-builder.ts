import { DatabaseConnection } from '../../infrastructure/connection/database-connection';
import { QueryResult } from '../../domain/entities/query-result';
import { WhereCondition } from '../../domain/value-objects';

/**
 * Delete query builder for PostgreSQL using Bun's SQL API
 */
export class DeleteQueryBuilder<T = any> {
  private table: string = '';
  private whereCondition: WhereCondition = new WhereCondition();
  private returningColumns: string[] = [];

  constructor(private connection: DatabaseConnection) {}

  /**
   * Set the table to delete from
   */
  from(table: string): this {
    this.table = table;
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
   * Set columns to return after delete
   */
  returning(...columns: string[]): this {
    this.returningColumns = columns.length > 0 ? columns : [];
    return this;
  }

  /**
   * Build the DELETE query
   */
  private buildQuery(): { query: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    const params: any[] = [];
    let paramIndex = 0;

    // Build the DELETE statement
    let query = `DELETE FROM ${this.table}`;

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
   * Execute the DELETE query
   */
  async execute(): Promise<QueryResult<T>> {
    const { query, params } = this.buildQuery();
    const sql = this.connection.getSql();
    
    try {
      const result = sql.prepare(query).all(params);
      return new QueryResult<T>(
        result as T[], 
        result.length, 
        result.length
      );
    } catch (error) {
      throw new Error(`Delete query execution failed: ${error}`);
    }
  }

  /**
   * Get the raw SQL query
   */
  toSql(): string {
    return this.buildQuery().query;
  }

  /**
   * Reset the delete query builder
   */
  reset(): this {
    this.table = '';
    this.whereCondition = new WhereCondition();
    this.returningColumns = [];
    return this;
  }
} 