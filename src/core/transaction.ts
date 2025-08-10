import { QueryBuilder } from '../query-builders/query-builder'
import type { ReservedSQL } from 'bun'

export class Transaction<M = any> {
  private transactionContext?: Bun.SQL
  private reservedSql?: ReservedSQL

  /**
   * Creates a new Transaction instance
   * @param {any} [transactionContext] - Optional transaction context from Bun SQL
   */
  constructor(transactionContext?: any) {
    this.transactionContext = transactionContext
  }

  /**
   * Gets the SQL context
   * @returns {Bun.SQL | ReservedSQL | undefined} SQL context
   */
  get sql(): Bun.SQL | ReservedSQL | undefined {
    return this.transactionContext ?? this.reservedSql
  }

  /**
   * @description Select from a table
   * @param {string} table
   * @param {string} [alias]
   * @returns {QueryBuilder}
   */
  public from(table: string, alias?: string): QueryBuilder<M> {
    return new QueryBuilder<M>(this.sql).from(table, alias)
  }

  /**
   * Creates a query builder with table specification within the transaction
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder<M> {
    return new QueryBuilder<M>(this.sql).table(table, alias)
  }

  /**
   * Inserts a new record/records into the database
   * @param {Record<string, any> | Record<string, any>[]} [data] - Data to insert
   * @returns {QueryBuilder} Query builder instance
   */
  public async insert(data: Record<string, any> | Record<string, any>[]): Promise<M[]> {
    const queryBuilder = new QueryBuilder<M>(this.sql)
    return await queryBuilder.insert(data)
  }

  /**
   * Creates a new record in the database
   * @param {Record<string, any>} data - Data to insert
   * @returns {Promise<M[]>} Inserted records
   */
  public create(data: Record<string, any>): Promise<M[]> {
    return this.insert(data)
  }

  /**
   * Executes raw SQL query within the transaction
   * @param {string} sql - Raw SQL query string
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<any[]>} Query results
   * @throws {Error} When transaction has already been committed or rolled back
   */
  public async raw(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.sql) throw new Error('Transaction context is required to execute raw SQL')
    return this.sql.unsafe(sql, params)
  }

  /**
   * Sets the transaction context (used internally)
   * @param {any} context - Transaction context from Bun SQL
   */
  public setTransactionContext(context: Bun.SQL): void {
    this.transactionContext = context
  }

  /**
   * Sets the reserved SQL (used internally)
   * @param {ReservedSQL} reservedSql - Reserved SQL from Bun SQL
   */
  public setReservedSql(reservedSql: ReservedSQL): void {
    this.reservedSql = reservedSql
  }

  /**
   * Gets the transaction context
   * @returns {Bun.SQL} Transaction context
   */
  public getTransactionContext(): Bun.SQL {
    if (!this.sql) throw new Error('Transaction context is required')
    return this.sql
  }

  /**
   * Gets the reserved SQL (used internally)
   * @returns {ReservedSQL} Reserved SQL
   */
  public getReservedSql(): ReservedSQL | undefined {
    return this.reservedSql
  }

  /**
   * Commits the transaction
   * @returns {Promise<void>}
   */
  public async commit(): Promise<void> {
    if (!this.reservedSql) throw new Error('Transaction context is required to commit')
    await this.reservedSql`COMMIT`
    this.reservedSql.release()
  }

  /**
   * Rolls back the transaction
   * @returns {Promise<void>}
   */
  public async rollback(): Promise<void> {
    if (!this.reservedSql) throw new Error('Transaction context is required to rollback')
    await this.reservedSql`ROLLBACK`
    this.reservedSql.release()
  }
}
