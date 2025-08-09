import { QueryBuilder } from '../query-builders/query-builder'
import type { SelectColumn } from '../types'

export class Transaction<M = any> {
  private transactionContext: Bun.SQL

  /**
   * Creates a new Transaction instance
   * @param {any} [transactionContext] - Optional transaction context from Bun SQL
   */
  constructor(transactionContext?: any) {
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
    return this.transactionContext.unsafe(sql, params)
  }

  /**
   * Sets the transaction context (used internally)
   * @param {any} context - Transaction context from Bun SQL
   */
  public setTransactionContext(context: any): void {
    this.transactionContext = context
  }

  /**
   * Gets the transaction context
   * @returns {Bun.SQL} Transaction context
   */
  public getTransactionContext(): Bun.SQL {
    return this.transactionContext
  }
}
