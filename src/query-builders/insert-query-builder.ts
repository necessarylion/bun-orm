import { BaseQueryBuilder } from './base-query-builder';
import { SQLHelper } from '../utils/sql-helper';
import type { InsertQueryBuilderChain } from '../types';

export class InsertQueryBuilder extends BaseQueryBuilder implements InsertQueryBuilderChain {
  private tableName: string = '';
  private insertData: Record<string, any>[] = [];
  private returningColumns: string[] = [];

  public into(table: string): InsertQueryBuilderChain {
    this.tableName = SQLHelper.sanitizeTableName(table);
    return this;
  }

  public values(data: Record<string, any> | Record<string, any>[]): InsertQueryBuilderChain {
    if (Array.isArray(data)) {
      this.insertData = data;
    } else {
      this.insertData = [data];
    }
    return this;
  }

  public returning(columns?: string | string[]): InsertQueryBuilderChain {
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
      throw new Error('Table name is required. Use .into() method.');
    }

    if (this.insertData.length === 0) {
      throw new Error('No data provided for insert. Use .values() method.');
    }

    const { columns, placeholders, params } = SQLHelper.buildInsertValues(this.insertData);
    const tableClause = SQLHelper.escapeIdentifier(this.tableName);
    const returningClause = this.returningColumns.length > 0 
      ? ` RETURNING ${this.returningColumns.includes('*') ? '*' : SQLHelper.buildColumnList(this.returningColumns)}`
      : '';

    const sql = `INSERT INTO ${tableClause} (${columns}) VALUES ${placeholders}${returningClause}`;

    return { sql, params };
  }
} 