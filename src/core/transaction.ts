import { getConnection } from './connection'
import { QueryBuilder } from '../query-builders/query-builder'
import type { SelectColumn, Transaction as TransactionType } from '../types'

export class Transaction<M> implements TransactionType {
  private sql: any
  private transactionContext: any
  private isCommitted: boolean = false
  private isRolledBack: boolean = false

  /**
   * Creates a new Transaction instance
   * @param {any} [transactionContext] - Optional transaction context from Bun SQL
   */
  constructor(transactionContext?: any) {
    this.sql = getConnection().getSQL()
    this.transactionContext = transactionContext
  }

  /**
   * Creates a SELECT query builder within the transaction
   * @param {SelectColumn | SelectColumn[]} [columns] - Columns to select (defaults to '*')
   * @returns {QueryBuilder} Query builder instance for SELECT operations
   */
  public select(columns?: SelectColumn | SelectColumn[]): QueryBuilder<M> {
    const queryBuilder = new QueryBuilder<M>(this.transactionContext)
    if (columns) {
      queryBuilder.select(columns)
    }
    return queryBuilder
  }

  /**
   * @description Select from a table
   * @param {string} table
   * @param {string} [alias]
   * @returns {QueryBuilder}
   */
  public from(table: string, alias?: string): QueryBuilder<M> {
    return new QueryBuilder<M>(this.transactionContext).from(table, alias)
  }

  /**
   * Creates a query builder with table specification within the transaction
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder<M> {
    return new QueryBuilder<M>(this.transactionContext).table(table, alias)
  }

  /**
   * Creates an INSERT query builder within the transaction
   * @param {Record<string, any> | Record<string, any>[]} [data] - Data to insert
   * @returns {QueryBuilder} Query builder instance
   */
  public insert(data?: Record<string, any> | Record<string, any>[]): QueryBuilder<M> {
    const queryBuilder = new QueryBuilder<M>(this.transactionContext)
    if (data) {
      queryBuilder.insert(data)
    }
    return queryBuilder
  }

  /**
   * Creates an UPDATE query builder within the transaction
   * @param {Record<string, any>} [data] - Data to update
   * @returns {QueryBuilder} Query builder instance
   */
  public update(data?: Record<string, any>): QueryBuilder<M> {
    const queryBuilder = new QueryBuilder<M>(this.transactionContext)
    if (data) {
      queryBuilder.update(data)
    }
    return queryBuilder
  }

  /**
   * Creates a DELETE query builder within the transaction
   * @returns {QueryBuilder} Query builder instance
   */
  public delete(): QueryBuilder<M> {
    return new QueryBuilder(this.transactionContext)
  }

  /**
   * Executes raw SQL query within the transaction
   * @param {string} sql - Raw SQL query string
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<any[]>} Query results
   * @throws {Error} When transaction has already been committed or rolled back
   */
  public async raw(sql: string, params: any[] = []): Promise<any[]> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction has already been committed or rolled back')
    }

    if (this.transactionContext) {
      return this.transactionContext.unsafe(sql, params)
    } else {
      return this.sql.unsafe(sql, params)
    }
  }

  /**
   * Commits the transaction
   * @returns {Promise<void>}
   * @throws {Error} When transaction has already been committed or rolled back
   */
  public async commit(): Promise<void> {
    if (this.isCommitted) {
      throw new Error('Transaction has already been committed')
    }
    if (this.isRolledBack) {
      throw new Error('Transaction has already been rolled back')
    }

    // In Bun's callback-based approach, commit happens automatically when the callback returns
    this.isCommitted = true
  }

  /**
   * Rolls back the transaction
   * @returns {Promise<void>}
   * @throws {Error} When transaction has already been committed or rolled back
   */
  public async rollback(): Promise<void> {
    if (this.isCommitted) {
      throw new Error('Transaction has already been committed')
    }
    if (this.isRolledBack) {
      throw new Error('Transaction has already been rolled back')
    }

    // In Bun's callback-based approach, rollback happens automatically when an error is thrown
    this.isRolledBack = true
    throw new Error('Transaction rolled back')
  }

  // Check if transaction is active
  /**
   * Checks if the transaction is still active
   * @returns {boolean} True if transaction is active, false if committed or rolled back
   */
  public isActive(): boolean {
    return !this.isCommitted && !this.isRolledBack
  }

  // Set transaction context (used internally)
  /**
   * Sets the transaction context (used internally)
   * @param {any} context - Transaction context from Bun SQL
   */
  public setTransactionContext(context: any): void {
    this.transactionContext = context
  }
}
