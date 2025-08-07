import { SQL } from 'bun'
import type { ConnectionConfig } from '../types'

export class DatabaseConnection {
  private static instance: DatabaseConnection
  private sqlInstance: Bun.SQL
  private config: ConnectionConfig

  /**
   * Private constructor for DatabaseConnection
   * @param {ConnectionConfig} config - Database connection configuration
   */
  private constructor(config: ConnectionConfig) {
    this.config = config
    this.sqlInstance = new SQL(config)
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
   * Gets the underlying SQL instance
   * @returns {Bun.SQL} The SQL instance for database operations
   */
  public getSQL(): Bun.SQL {
    return this.sqlInstance
  }

  /**
   * Gets the connection configuration
   * @returns {ConnectionConfig} The database connection configuration
   */
  public getConfig(): ConnectionConfig {
    return this.config
  }

  /**
   * Tests the database connection by executing a simple query
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.sqlInstance`SELECT 1 as test`
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
      await this.sqlInstance.close()
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
