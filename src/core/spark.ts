import { createConnection, getConnection } from './connection'
import { QueryBuilder } from '../query-builders/query-builder'
import type { Transaction } from './transaction'
import type { ConnectionConfig, TransactionCallback } from '../types'
import type { DatabaseDriver } from '../drivers/database-driver'

export class Spark {
  private static instance: Spark
  private driver: DatabaseDriver

  /**
   * Gets the singleton instance of Spark
   * @returns {Spark} The singleton Spark instance
   */
  public static getInstance(): Spark {
    if (!Spark.instance) {
      Spark.instance = new Spark()
      Spark.instance.driver = getConnection().getDriver()
    }
    return Spark.instance
  }

  /**
   * Initializes the Spark instance with database configuration
   * @param {ConnectionConfig} config - Database connection configuration
   * @returns {Spark} The initialized Spark instance
   */
  public static initialize(config: ConnectionConfig): Spark {
    createConnection(config)
    return Spark.getInstance()
  }

  /**
   * Creates a query builder with transaction context
   * @param {Transaction} trx - Transaction instance
   * @returns {QueryBuilder} Query builder instance
   */
  public useTransaction(trx: Transaction): QueryBuilder<any> {
    return new QueryBuilder(trx.getDriver())
  }

  /**
   * Creates a query builder with FROM clause
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public from(table: string, alias?: string): QueryBuilder<any> {
    return new QueryBuilder(this.driver).from(table, alias)
  }

  /**
   * Creates a query builder with table specification (alias for from)
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder<any> {
    return new QueryBuilder(this.driver).table(table, alias)
  }

  // INSERT queries
  /**
   * Creates an INSERT query builder
   * @param {Record<string, any> | Record<string, any>[]} [data] - Data to insert
   * @returns {QueryBuilder} Query builder instance
   */
  public insert(data?: Record<string, any> | Record<string, any>[]): QueryBuilder<any> {
    const queryBuilder = new QueryBuilder(this.driver)
    if (data) {
      queryBuilder.insert(data)
    }
    return queryBuilder
  }

  // UPDATE queries
  /**
   * Creates an UPDATE query builder
   * @param {Record<string, any>} [data] - Data to update
   * @returns {QueryBuilder} Query builder instance
   */
  public update(data?: Record<string, any>): QueryBuilder<any> {
    const queryBuilder = new QueryBuilder(this.driver)
    if (data) {
      queryBuilder.update(data)
    }
    return queryBuilder
  }

  // DELETE queries
  /**
   * Creates a DELETE query builder
   * @returns {QueryBuilder} Query builder instance
   */
  public delete(): QueryBuilder<any> {
    const queryBuilder = new QueryBuilder(this.driver)
    // Set the query mode to delete so it works with the unified API
    ;(queryBuilder as any).queryMode = 'delete'
    return queryBuilder
  }

  // Raw SQL
  /**
   * Executes raw SQL query
   * @param {string} sql - Raw SQL query string
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<any[]>} Query results
   */
  public raw(sql: string, params: any[] = []): Promise<any[]> {
    return this.driver.runQuery(sql, params)
  }

  /**
   * Drops a table if it exists
   * @param {string} tableName - Name of the table to drop
   * @returns {Promise<void>}
   */
  public async dropTable(tableName: string, options: { cascade: boolean } = { cascade: false }): Promise<void> {
    await this.driver.dropTable(tableName, options)
  }

  /**
   * Checks if a table exists
   * @param {string} tableName - Name of the table to check
   * @returns {Promise<boolean>} True if table exists, false otherwise
   */
  public async hasTable(tableName: string): Promise<boolean> {
    return await this.driver.hasTable(tableName)
  }

  /**
   * Truncates a table
   * @param {string} tableName - Name of the table to truncate
   * @returns {Promise<void>}
   */
  public async truncate(tableName: string, options: { cascade: boolean } = { cascade: false }): Promise<void> {
    await this.driver.truncateTable(tableName, options)
  }

  // Connection management
  /**
   * Tests the database connection
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    return await this.driver.testConnection()
  }

  /**
   * Closes the database connection
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    const connection = getConnection()
    await connection.close()
  }

  // Transaction support
  /**
   * Executes a transaction with automatic commit/rollback
   * @param {TransactionCallback<T>} callback - Transaction callback function
   * @returns {Promise<T>} Result of the transaction callback
   */
  public async transaction<T = any>(callback: TransactionCallback<T>): Promise<T> {
    return await this.driver.transaction(callback)
  }

  /**
   * Begins a manual transaction
   * @returns {Promise<Transaction>} Transaction instance
   * @throws {Error} Manual transaction control is not supported for SQLite
   */
  public async beginTransaction(): Promise<Transaction<any>> {
    return await this.driver.beginTransaction()
  }
}

/**
 * Convenience function to get or initialize Spark instance
 * @param {ConnectionConfig} [config] - Optional database configuration for initialization
 * @returns {Spark} Spark instance
 */
export function spark(config?: ConnectionConfig): Spark {
  if (config) {
    return Spark.initialize(config)
  }
  return Spark.getInstance()
}
