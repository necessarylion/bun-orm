import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { DatabaseConnection, type DatabaseConfig } from "../../src/infrastructure/connection/database-connection";
import { setupTestDatabase, teardownTestDatabase, testORM } from "../setup";

describe("Infrastructure - Database Connection", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("DatabaseConnection", () => {
    test("should create singleton instance", () => {
      const config: DatabaseConfig = {
        database: 'test_db',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgres'
      };

      const instance1 = DatabaseConnection.getInstance(config);
      const instance2 = DatabaseConnection.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DatabaseConnection);
    });

    test("should throw error when getting instance without config", () => {
      // Reset the singleton for this test
      (DatabaseConnection as any).instance = null;
      
      expect(() => DatabaseConnection.getInstance()).toThrow(
        "Database connection not initialized. Call getInstance(config) first."
      );
    });

    test("should connect to database", async () => {
      const connection = DatabaseConnection.getInstance();
      
      expect(connection.isConnected()).toBe(true);
    });

    test("should get SQL instance", () => {
      const connection = DatabaseConnection.getInstance();
      const sql = connection.getSql();
      
      expect(sql).toBeDefined();
      expect(typeof sql).toBe('function');
    });

    test("should get connection configuration", () => {
      const connection = DatabaseConnection.getInstance();
      const config = connection.getConfig();
      
      expect(config).toEqual({
        database: 'bun_orm',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgres'
      });
    });

    test("should execute raw SQL query", async () => {
      const connection = DatabaseConnection.getInstance();
      const result = await connection.execute("SELECT 1 as test_value");
      
      expect(result).toBeDefined();
      expect(result[0].test_value).toBe(1);
    });

    test("should execute raw SQL query with parameters", async () => {
      const connection = DatabaseConnection.getInstance();
      const result = await connection.execute(
        "SELECT ? as name, ? as age",
        ["John Doe", 25]
      );
      
      expect(result).toBeDefined();
      expect(result[0].name).toBe("John Doe");
      expect(result[0].age).toBe(25);
    });

    test("should execute transaction", async () => {
      const connection = DatabaseConnection.getInstance();
      
      const result = await connection.transaction(async (transactionConnection) => {
        // Test that we can execute queries within transaction
        const testResult = await transactionConnection.execute("SELECT 1 as test");
        return testResult[0].test;
      });
      
      expect(result).toBe(1);
    });

    test("should handle transaction rollback on error", async () => {
      const connection = DatabaseConnection.getInstance();
      
      await expect(async () => {
        await connection.transaction(async (transactionConnection) => {
          // This should cause the transaction to rollback
          throw new Error("Test error");
        });
      }).rejects.toThrow("Test error");
    });

    test("should disconnect from database", async () => {
      const connection = DatabaseConnection.getInstance();
      
      // Create a new connection for this test
      const testConfig: DatabaseConfig = {
        database: 'bun_orm',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgres'
      };
      
      const testConnection = new (DatabaseConnection as any)(testConfig);
      await testConnection.connect();
      
      expect(testConnection.isConnected()).toBe(true);
      
      await testConnection.disconnect();
      expect(testConnection.isConnected()).toBe(false);
    });

    test("should handle multiple connection attempts gracefully", async () => {
      const connection = DatabaseConnection.getInstance();
      
      // Should not throw when already connected
      await connection.connect();
      await connection.connect();
      
      expect(connection.isConnected()).toBe(true);
    });

    test("should handle disconnection when not connected", async () => {
      const connection = DatabaseConnection.getInstance();
      
      // Should not throw when already disconnected
      await connection.disconnect();
      await connection.disconnect();
      
      expect(connection.isConnected()).toBe(false);
    });
  });

  describe("Database Configuration", () => {
    test("should handle minimal configuration", () => {
      const config: DatabaseConfig = {
        database: 'test_db'
      };

      const connection = DatabaseConnection.getInstance(config);
      const retrievedConfig = connection.getConfig();
      
      expect(retrievedConfig.database).toBe('test_db');
      expect(retrievedConfig.host).toBeUndefined();
      expect(retrievedConfig.port).toBeUndefined();
    });

    test("should handle full configuration", () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 5433,
        database: 'test_db',
        username: 'postgres',
        password: 'postgres',
        ssl: true,
        maxConnections: 20,
        connectionTimeout: 5000,
        idleTimeout: 30000,
        lifetimeTimeout: 60000
      };

      const connection = DatabaseConnection.getInstance(config);
      const retrievedConfig = connection.getConfig();
      
      expect(retrievedConfig).toEqual(config);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid SQL gracefully", async () => {
      const connection = DatabaseConnection.getInstance();
      
      await expect(async () => {
        await connection.execute("INVALID SQL QUERY");
      }).rejects.toThrow();
    });

    test("should handle connection errors", async () => {
      const invalidConfig: DatabaseConfig = {
        database: 'non_existent_db',
        host: 'invalid_host',
        port: 9999,
        username: 'invalid_user',
        password: 'invalid_password'
      };

      const connection = new (DatabaseConnection as any)(invalidConfig);
      
      await expect(async () => {
        await connection.connect();
      }).rejects.toThrow();
    });
  });
}); 