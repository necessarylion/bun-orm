import { Database } from 'bun:sqlite';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  lifetimeTimeout?: number;
}

/**
 * Database connection service
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database | null = null;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance && config) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    if (!DatabaseConnection.instance) {
      throw new Error('Database connection not initialized. Call getInstance(config) first.');
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize the database connection
   */
  async connect(): Promise<void> {
    if (this.db) {
      return; // Already connected
    }

    try {
      // Create a new SQLite database
      this.db = new Database(this.config.database);
      
      // Test the connection
      this.db.run('SELECT 1');
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * Get the SQL instance
   */
  getSql(): any {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Execute a raw SQL query
   */
  async execute<T = any>(query: string, params?: any[]): Promise<T[]> {
    const db = this.getSql();
    return db.prepare(query).all(params || []);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
    const db = this.getSql();
    
    return db.transaction(async () => {
      return await callback(this);
    })();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.db !== null;
  }

  /**
   * Get connection configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
} 