import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { DeleteQueryBuilderChain } from '../types';

export class DeleteQueryBuilder extends BaseQueryBuilder implements DeleteQueryBuilderChain {
  private tableName: string = '';
  private returningColumns: string[] = [];

  public from(table: string): DeleteQueryBuilderChain {
    this.tableName = SQLHelper.sanitizeTableName(table);
    return this;
  }

  public where(column: string, operator: string, value?: any): DeleteQueryBuilderChain {
    this.addWhereCondition(column, operator as any, value);
    return this;
  }

  public whereIn(column: string, values: any[]): DeleteQueryBuilderChain {
    this.addWhereCondition(column, 'IN', values);
    return this;
  }

  public whereNull(column: string): DeleteQueryBuilderChain {
    this.addWhereCondition(column, 'IS NULL');
    return this;
  }

  public whereNotNull(column: string): DeleteQueryBuilderChain {
    this.addWhereCondition(column, 'IS NOT NULL');
    return this;
  }

  public returning(columns?: string | string[]): DeleteQueryBuilderChain {
    if (!columns) {
      this.returningColumns = ['*'];
    } else if (Array.isArray(columns)) {
      this.returningColumns = columns;
    } else {
      this.returningColumns = [columns];
    }
    return this;
  }

  public async execute<T = any>(): Promise<T[]> {
    const query = this.buildQuery();
    return await this.executeQuery<T>(query.sql, query.params);
  }

  public raw(): { sql: string; params: any[] } {
    return this.buildQuery();
  }

  private buildQuery(): { sql: string; params: any[] } {
    if (!this.tableName) {
      throw new Error('Table name is required. Use .from() method.');
    }

    const tableClause = SQLHelper.escapeIdentifier(this.tableName);
    const whereClause = this.buildWhereClause();
    const returningClause = this.returningColumns.length > 0 
      ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : SQLHelper.buildColumnList(this.returningColumns)}`
      : '';

    let sql = `DELETE FROM ${tableClause}`;
    
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    sql += returningClause;

    return {
      sql,
      params: whereClause.params
    };
  }
} 