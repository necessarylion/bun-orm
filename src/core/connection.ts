import type { ConnectionConfig } from '../types'
import type { DatabaseDriver } from '../drivers/database-driver'
import { SQLiteDriver } from '../drivers/sqlite-driver'
import { PostgresDriver } from '../drivers/postgres-driver'

export class DatabaseConnection {
  private static instance: DatabaseConnection
  private config: ConnectionConfig
  private driver: DatabaseDriver

  /**
   * Private constructor for DatabaseConnection
   * @param {ConnectionConfig} config - Database connection configuration
   */
  private constructor(config: ConnectionConfig) {
    this.config = config
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
      if (config.driver === 'sqlite') {
        DatabaseConnection.instance.driver = new SQLiteDriver()
      } else if (config.driver === 'postgres') {
        DatabaseConnection.instance.driver = new PostgresDriver()
      } else {
        throw new Error(`Unsupported database driver: ${config.driver}`)
      }
    }
    return DatabaseConnection.instance
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
      await this.driver.testConnection()
      return true
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
      this.driver.close()
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
