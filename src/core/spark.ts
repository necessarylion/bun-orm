import { createConnection, getConnection } from './connection'
import { QueryBuilder } from '../query-builders/query-builder'
import { Transaction } from './transaction'
import type { ConnectionConfig, TransactionCallback } from '../types'

export class Spark {
  private static instance: Spark

  private constructor() {}

  /**
   * Gets the singleton instance of Spark
   * @returns {Spark} The singleton Spark instance
   */
  public static getInstance(): Spark {
    if (!Spark.instance) {
      Spark.instance = new Spark()
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
    return new QueryBuilder(trx.getTransactionContext())
  }

  /**
   * Creates a query builder with FROM clause
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public from(table: string, alias?: string): QueryBuilder<any> {
    return new QueryBuilder().from(table, alias)
  }

  /**
   * Creates a query builder with table specification (alias for from)
   * @param {string} table - Table name to query from
   * @param {string} [alias] - Optional table alias
   * @returns {QueryBuilder} Query builder instance
   */
  public table(table: string, alias?: string): QueryBuilder<any> {
    return new QueryBuilder().table(table, alias)
  }

  // INSERT queries
  /**
   * Creates an INSERT query builder
   * @param {Record<string, any> | Record<string, any>[]} [data] - Data to insert
   * @returns {QueryBuilder} Query builder instance
   */
  public insert(data?: Record<string, any> | Record<string, any>[]): QueryBuilder<any> {
    const queryBuilder = new QueryBuilder()
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
    const queryBuilder = new QueryBuilder()
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
    const queryBuilder = new QueryBuilder()
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
    const connection = getConnection()
    const driver = connection.getDriver()

    if (driver === 'sqlite') {
      const sqlite = connection.getSQLite()
      const query = sqlite.query(sql)
      return Promise.resolve(query.all(params as any))
    } else {
      return connection.getSQL().unsafe(sql, params)
    }
  }

  /**
   * Drops a table if it exists
   * @param {string} tableName - Name of the table to drop
   * @returns {Promise<void>}
   */
  public async dropTable(tableName: string, options: { cascade: boolean } = { cascade: false }): Promise<void> {
    const connection = getConnection()
    const driver = connection.getDriver()

    if (driver === 'sqlite') {
      const sqlite = connection.getSQLite()
      sqlite.run(`DROP TABLE IF EXISTS "${tableName}"`)
    } else {
      await connection.getSQL().unsafe(`DROP TABLE IF EXISTS "${tableName}" ${options.cascade ? 'CASCADE' : ''}`)
    }
  }

  /**
   * Truncates a table
   * @param {string} tableName - Name of the table to truncate
   * @returns {Promise<void>}
   */
  public async truncate(tableName: string, options: { cascade: boolean } = { cascade: false }): Promise<void> {
    const connection = getConnection()
    const driver = connection.getDriver()

    const cascade = options.cascade ? 'CASCADE' : ''

    if (driver === 'sqlite') {
      const sqlite = connection.getSQLite()
      sqlite.run(`DELETE FROM "${tableName}" ${cascade}`)
    } else {
      await connection.getSQL().unsafe(`TRUNCATE TABLE "${tableName}" ${cascade}`)
    }
  }

  /**
   * Checks if a table exists in the database
   * @param {string} tableName - Name of the table to check
   * @returns {Promise<boolean>} True if table exists, false otherwise
   */
  public async hasTable(tableName: string): Promise<boolean> {
    const connection = getConnection()
    const driver = connection.getDriver()

    if (driver === 'sqlite') {
      const sqlite = connection.getSQLite()
      const query = sqlite.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `)
      const result = query.get(tableName)
      return !!result
    } else {
      const result = await connection.getSQL().unsafe(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `,
        [tableName]
      )
      return result[0]?.exists || false
    }
  }

  // Connection management
  /**
   * Tests the database connection
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    const connection = getConnection()
    return await connection.testConnection()
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
    const connection = getConnection()
    const driver = connection.getDriver()

    if (driver === 'sqlite') {
      const sqlite = connection.getSQLite()
      const trx = new Transaction<any>()
      sqlite.run('BEGIN')
      trx.setReservedSql(sqlite)
      try {
        const result = await callback(trx)
        await trx.commit()
        return result
      } catch (error) {
        await trx.rollback()
        throw error
      }
    } else {
      const sql = connection.getSQL()

      // Use Bun's callback-based transaction API
      return await sql.begin(async (tx: any) => {
        // Create transaction instance with the transaction context
        const trx = new Transaction<any>(tx)

        // Execute the callback with transaction context
        return await callback(trx)
      })
    }
  }

  /**
   * Begins a manual transaction
   * @returns {Promise<Transaction>} Transaction instance
   * @throws {Error} Manual transaction control is not supported for SQLite
   */
  public async beginTransaction(): Promise<Transaction<any>> {
    const connection = getConnection()
    const driver = connection.getDriver()

    if (driver === 'sqlite') {
      const sqlite = connection.getSQLite()
      sqlite.run('BEGIN')
      const transaction = new Transaction()
      transaction.setReservedSql(sqlite)
      return transaction
    }

    // get bun sql connection
    const sql = connection.getSQL()
    const reservedSql = await sql.reserve()
    await reservedSql`BEGIN`
    // create transaction
    const transaction = new Transaction()
    transaction.setReservedSql(reservedSql)
    return transaction
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

// Export the unified QueryBuilder for direct use
export { QueryBuilder } from '../query-builders/query-builder'
