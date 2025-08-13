import { SQL } from 'bun'
import { Database } from 'bun:sqlite'
import type { ConnectionConfig, DatabaseDriver } from '../types'

export class DatabaseConnection {
  private static instance: DatabaseConnection
  private sqlInstance?: Bun.SQL
  private sqliteInstance?: Database
  private config: ConnectionConfig
  private driver: DatabaseDriver

  /**
   * Private constructor for DatabaseConnection
   * @param {ConnectionConfig} config - Database connection configuration
   */
  private constructor(config: ConnectionConfig) {
    this.config = config
    this.driver = config.driver

    if (this.driver === 'sqlite') {
      // Extract SQLite-specific options
      const { ...sqliteOptions } = config as any
      const filename = sqliteOptions.filename || ':memory:'

      // Set default options for SQLite
      const options = {
        readonly: false,
        create: true,
        ...sqliteOptions,
      }

      this.sqliteInstance = new Database(filename, options)
    } else if (this.driver === 'postgres') {
      // Extract PostgreSQL-specific options
      const { ...postgresOptions } = config as any
      this.sqlInstance = new SQL(postgresOptions)
    } else {
      throw new Error(`Unsupported database driver: ${this.driver}`)
    }
  }

  /**
   * Gets the singleton instance of DatabaseConnection
   * @param {ConnectionConfig} [config] - Database configuration (required for first initialization)
   * @returns {DatabaseConnection} The singleton DatabaseConnection instance
   * @throws {Error} When configuration is required but not provided
   */
  public static getInstance(config?: ConnectionConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration is required for first initialization')
      }
      DatabaseConnection.instance = new DatabaseConnection(config)
    }
    return DatabaseConnection.instance
  }

  /**
   * Gets the underlying SQL instance (for PostgreSQL)
   * @returns {Bun.SQL} The SQL instance for database operations
   * @throws {Error} When using SQLite driver
   */
  public getSQL(): Bun.SQL {
    if (this.driver !== 'postgres') {
      throw new Error('getSQL() is only available for PostgreSQL driver')
    }
    if (!this.sqlInstance) {
      throw new Error('SQL instance not initialized')
    }
    return this.sqlInstance
  }

  /**
   * Gets the underlying SQLite Database instance (for SQLite)
   * @returns {Database} The SQLite Database instance for database operations
   * @throws {Error} When using PostgreSQL driver
   */
  public getSQLite(): Database {
    if (this.driver !== 'sqlite') {
      throw new Error('getSQLite() is only available for SQLite driver')
    }
    if (!this.sqliteInstance) {
      throw new Error('SQLite instance not initialized')
    }
    return this.sqliteInstance
  }

  /**
   * Gets the connection configuration
   * @returns {ConnectionConfig} The database connection configuration
   */
  public getConfig(): ConnectionConfig {
    return this.config
  }

  /**
   * Gets the current database driver
   * @returns {DatabaseDriver} The current database driver
   */
  public getDriver(): DatabaseDriver {
    return this.driver
  }

  /**
   * Tests the database connection by executing a simple query
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (this.driver === 'sqlite') {
        const query = this.sqliteInstance?.query('SELECT 1 as test')
        query?.get()
        return true
      } else {
        await this.sqlInstance?.unsafe('SELECT 1 as test')
        return true
      }
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }

  /**
   * Closes the database connection
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    try {
      if (this.driver === 'sqlite') {
        this.sqliteInstance?.close()
      } else {
        await this.sqlInstance?.close()
      }
    } catch (error) {
      console.error('Error closing database connection:', error)
    }
  }
}

/**
 * Creates a new database connection
 * @param {ConnectionConfig} config - Database connection configuration
 * @returns {DatabaseConnection} The database connection instance
 */
export function createConnection(config: ConnectionConfig): DatabaseConnection {
  return DatabaseConnection.getInstance(config)
}

/**
 * Gets the existing database connection instance
 * @returns {DatabaseConnection} The database connection instance
 */
export function getConnection(): DatabaseConnection {
  return DatabaseConnection.getInstance()
}
