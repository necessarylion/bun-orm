import { QueryBuilder } from '../query-builders/query-builder'
import type { DatabaseDriver } from '../drivers/database-driver'

export class Transaction<M = any> {
  private driver?: DatabaseDriver

  /**
   * Creates a new Transaction instance
   * @param {DatabaseDriver} [driver]
   */
  constructor(driver?: DatabaseDriver) {
    this.driver = driver
  }

  /**
   * @description Select from a table
   * @param {string} table
   * @param {string} [alias]
   * @returns {QueryBuilder}
   */
  public from(table: string, alias?: string): QueryBuilder<M> {
    return new QueryBuilder<M>(this.driver).from(table, alias)
  }

  /**
   * Creates a query builder with table specification within the transaction
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder<M> {
    return new QueryBuilder<M>(this.driver).table(table, alias)
  }

  /**
   * Inserts a new record/records into the database
   * @param {Record<string, any> | Record<string, any>[]} [data] - Data to insert
   * @returns {QueryBuilder} Query builder instance
   */
  public async insert(data: Record<string, any> | Record<string, any>[]): Promise<M[]> {
    const queryBuilder = new QueryBuilder<M>(this.driver)
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
    return await this.getDriver().runQuery(sql, params)
  }

  /**
   * Sets the transaction context (used internally)
   * @param {DatabaseDriver} driver
   */
  public setDriver(driver: DatabaseDriver): void {
    this.driver = driver
  }

  /**
   * Gets the transaction context
   * @returns {Bun.SQL} Transaction context
   */
  public getDriver(): DatabaseDriver {
    if (!this.driver) throw new Error('Driver is required')
    return this.driver
  }

  /**
   * Commits the transaction
   * @returns {Promise<void>}
   */
  public async commit(): Promise<void> {
    await this.getDriver().commit()
  }

  /**
   * Rolls back the transaction
   * @returns {Promise<void>}
   */
  public async rollback(): Promise<void> {
    await this.getDriver().rollback()
  }
}
