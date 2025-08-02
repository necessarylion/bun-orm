import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { QueryBuilderChain, SelectColumn } from '../types';

export class QueryBuilder extends BaseQueryBuilder implements QueryBuilderChain {
  private selectColumns: string[] = ['*'];
  private fromTable: string = '';
  private fromAlias: string = '';

  public select(columns?: SelectColumn | SelectColumn[]): QueryBuilderChain {
    if (!columns) {
      this.selectColumns = ['*'];
      return this;
    }

    if (Array.isArray(columns)) {
      this.selectColumns = columns.map(col => {
        if (typeof col === 'string') {
          return col;
        } else {
          // Handle object format like { alias: 'column' }
          const [alias, column] = Object.entries(col)[0] as [string, string];
          return `${SQLHelper.escapeIdentifier(column)} AS ${SQLHelper.escapeIdentifier(alias)}`;
        }
      });
    } else if (typeof columns === 'string') {
      this.selectColumns = [columns];
    } else {
      // Handle object format
      this.selectColumns = Object.entries(columns).map(([alias, column]) => 
        `${SQLHelper.escapeIdentifier(column)} AS ${SQLHelper.escapeIdentifier(alias)}`
      );
    }

    return this;
  }

  public from(table: string, alias?: string): QueryBuilder {
    this.fromTable = SQLHelper.sanitizeTableName(table);
    this.fromAlias = alias ? SQLHelper.sanitizeTableName(alias) : '';
    return this;
  }

  public where(column: string, operator: string, value?: any): QueryBuilderChain {
    this.addWhereCondition(column, operator as any, value);
    return this;
  }

  public whereIn(column: string, values: any[]): QueryBuilderChain {
    this.addWhereCondition(column, 'IN', values);
    return this;
  }

  public whereNotIn(column: string, values: any[]): QueryBuilderChain {
    this.addWhereCondition(column, 'NOT IN', values);
    return this;
  }

  public whereNull(column: string): QueryBuilderChain {
    this.addWhereCondition(column, 'IS NULL');
    return this;
  }

  public whereNotNull(column: string): QueryBuilderChain {
    this.addWhereCondition(column, 'IS NOT NULL');
    return this;
  }

  public join(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('INNER', table, on, alias);
    return this;
  }

  public leftJoin(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('LEFT', table, on, alias);
    return this;
  }

  public rightJoin(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('RIGHT', table, on, alias);
    return this;
  }

  public fullJoin(table: string, on: string, alias?: string): QueryBuilderChain {
    this.addJoin('FULL', table, on, alias);
    return this;
  }

  public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilderChain {
    this.addOrderBy(column, direction);
    return this;
  }

  public groupBy(column: string): QueryBuilderChain {
    this.addGroupBy(column);
    return this;
  }

  public having(condition: string): QueryBuilderChain {
    this.havingCondition = condition;
    return this;
  }

  public limit(count: number): QueryBuilderChain {
    this.limitValue = count;
    return this;
  }

  public offset(count: number): QueryBuilderChain {
    this.offsetValue = count;
    return this;
  }

  public distinct(): QueryBuilderChain {
    this.distinctFlag = true;
    return this;
  }

  public async count(column: string = '*'): Promise<number> {
    const originalSelect = this.selectColumns;
    this.selectColumns = [`COUNT(${column}) as count`];
    
    const query = this.buildQuery();
    const result = await this.executeQuery<{ count: string | number }>(query.sql, query.params);
    
    // Restore original select
    this.selectColumns = originalSelect;
    
    const count = result[0]?.count || 0;
    return typeof count === 'string' ? parseInt(count, 10) : count;
  }

  public async first<T = any>(): Promise<T | null> {
    const originalLimit = this.limitValue;
    this.limitValue = 1;
    
    const query = this.buildQuery();
    const result = await this.executeQuery<T>(query.sql, query.params);
    
    // Restore original limit
    this.limitValue = originalLimit;
    
    return result[0] || null;
  }

  public async get<T = any>(): Promise<T[]> {
    const query = this.buildQuery();
    return await this.executeQuery<T>(query.sql, query.params);
  }

  public override raw(): { sql: string; params: any[] } {
    return this.buildQuery();
  }

  private buildQuery(): { sql: string; params: any[] } {
    if (!this.fromTable) {
      throw new Error('FROM clause is required');
    }

    const distinctClause = this.buildDistinctClause();
    const selectClause = this.selectColumns.join(', ');
    const fromClause = this.fromAlias 
      ? `${SQLHelper.escapeIdentifier(this.fromTable)} AS ${SQLHelper.escapeIdentifier(this.fromAlias)}`
      : SQLHelper.escapeIdentifier(this.fromTable);
    
    const joinClause = this.buildJoinClause();
    const whereClause = this.buildWhereClause();
    const groupByClause = this.buildGroupByClause();
    const havingClause = this.havingCondition ? ` HAVING ${this.havingCondition}` : '';
    const orderByClause = this.buildOrderByClause();
    const limitOffsetClause = this.buildLimitOffsetClause();

    let sql = `SELECT ${distinctClause}${selectClause} FROM ${fromClause}`;
    
    if (joinClause) {
      sql += ` ${joinClause}`;
    }
    
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    if (groupByClause) {
      sql += ` GROUP BY ${groupByClause}`;
    }
    
    sql += havingClause;
    
    if (orderByClause) {
      sql += ` ORDER BY ${orderByClause}`;
    }
    
    sql += limitOffsetClause;

    return {
      sql,
      params: whereClause.params
    };
  }
} 