import { getConnection } from './connection';
import { QueryBuilder } from '../query-builders/query-builder';
import { InsertQueryBuilder } from '../query-builders/insert-query-builder';
import { UpdateQueryBuilder } from '../query-builders/update-query-builder';
import { DeleteQueryBuilder } from '../query-builders/delete-query-builder';
import type { SelectColumn, Transaction as TransactionType } from '../types';

export class Transaction implements TransactionType {
  private sql: any;
  private transactionContext: any;
  private isCommitted: boolean = false;
  private isRolledBack: boolean = false;

  constructor(transactionContext?: any) {
    this.sql = getConnection().getSQL();
    this.transactionContext = transactionContext;
  }

  // SELECT queries
  public select(columns?: SelectColumn | SelectColumn[]): QueryBuilder {
    const queryBuilder = new QueryBuilder(this.transactionContext);
    if (columns) {
      queryBuilder.select(columns);
    }
    return queryBuilder;
  }

  public from(table: string, alias?: string): QueryBuilder {
    return new QueryBuilder(this.transactionContext).from(table, alias);
  }

  public table(table: string, alias?: string): QueryBuilder {
    return new QueryBuilder(this.transactionContext).from(table, alias);
  }

  // INSERT queries
  public insert(data?: Record<string, any> | Record<string, any>[]): InsertQueryBuilder {
    const insertBuilder = new InsertQueryBuilder(this.transactionContext);
    if (data) {
      insertBuilder.values(data);
    }
    return insertBuilder;
  }

  // UPDATE queries
  public update(data?: Record<string, any>): UpdateQueryBuilder {
    const updateBuilder = new UpdateQueryBuilder(this.transactionContext);
    if (data) {
      updateBuilder.set(data);
    }
    return updateBuilder;
  }

  // DELETE queries
  public delete(): DeleteQueryBuilder {
    return new DeleteQueryBuilder(this.transactionContext);
  }

  // Raw SQL
  public async raw(sql: string, params: any[] = []): Promise<any[]> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction has already been committed or rolled back');
    }
    
    if (this.transactionContext) {
      return this.transactionContext.unsafe(sql, params);
    } else {
      return this.sql.unsafe(sql, params);
    }
  }

  // Commit the transaction
  public async commit(): Promise<void> {
    if (this.isCommitted) {
      throw new Error('Transaction has already been committed');
    }
    if (this.isRolledBack) {
      throw new Error('Transaction has already been rolled back');
    }
    
    // In Bun's callback-based approach, commit happens automatically when the callback returns
    this.isCommitted = true;
  }

  // Rollback the transaction
  public async rollback(): Promise<void> {
    if (this.isCommitted) {
      throw new Error('Transaction has already been committed');
    }
    if (this.isRolledBack) {
      throw new Error('Transaction has already been rolled back');
    }
    
    // In Bun's callback-based approach, rollback happens automatically when an error is thrown
    this.isRolledBack = true;
    throw new Error('Transaction rolled back');
  }

  // Check if transaction is active
  public isActive(): boolean {
    return !this.isCommitted && !this.isRolledBack;
  }

  // Set transaction context (used internally)
  public setTransactionContext(context: any): void {
    this.transactionContext = context;
  }
} 