import { getConnection } from '../core/connection';
import { SQLHelper } from '../utils/sql-helper';
import type { WhereCondition, JoinCondition, OrderByCondition, GroupByCondition } from '../types';

export abstract class BaseQueryBuilder {
  protected sql: any;
  protected transactionContext: any;
  protected whereConditions: WhereCondition[] = [];
  protected joins: JoinCondition[] = [];
  protected orderByConditions: OrderByCondition[] = [];
  protected groupByConditions: GroupByCondition[] = [];
  protected havingCondition: string = '';
  protected limitValue: number | null = null;
  protected offsetValue: number | null = null;
  protected distinctFlag: boolean = false;

  constructor(transactionContext?: any) {
    this.sql = getConnection().getSQL();
    this.transactionContext = transactionContext;
  }

  protected addWhereCondition(column: string, operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL', value?: any): void {
    this.whereConditions.push({ column, operator, value });
  }

  protected addJoin(type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', table: string, on: string, alias?: string): void {
    this.joins.push({ type, table, on, alias });
  }

  protected addOrderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): void {
    this.orderByConditions.push({ column, direction });
  }

  protected addGroupBy(column: string): void {
    this.groupByConditions.push({ column });
  }

  protected buildWhereClause(): { sql: string; params: any[] } {
    return SQLHelper.buildWhereConditions(this.whereConditions);
  }

  protected buildJoinClause(): string {
    return SQLHelper.buildJoinClause(this.joins);
  }

  protected buildOrderByClause(): string {
    return SQLHelper.buildOrderByClause(this.orderByConditions);
  }

  protected buildGroupByClause(): string {
    return SQLHelper.buildGroupByClause(this.groupByConditions.map(g => g.column));
  }

  protected buildLimitOffsetClause(): string {
    let clause = '';
    if (this.limitValue !== null) {
      clause += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue !== null) {
      clause += ` OFFSET ${this.offsetValue}`;
    }
    return clause;
  }

  protected buildDistinctClause(): string {
    return this.distinctFlag ? 'DISTINCT ' : '';
  }

  protected async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      // Use transaction context if available, otherwise use regular SQL
      if (this.transactionContext) {
        const result = await this.transactionContext.unsafe(query, params);
        return result;
      } else {
        const result = await this.sql.unsafe(query, params);
        return result;
      }
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  protected async executeCountQuery(column: string = '*'): Promise<number> {
    const countQuery = `SELECT COUNT(${column}) as count`;
    const result = await this.executeQuery<{ count: number }>(countQuery);
    return result[0]?.count || 0;
  }

  public raw(): { sql: string; params: any[] } {
    throw new Error('raw() method must be implemented by subclasses');
  }

  // Set transaction context (used internally)
  public setTransactionContext(context: any): void {
    this.transactionContext = context;
  }
} 