import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spark, Transaction } from '../index';

describe('Transaction Tests', () => {
  let db: any;

  beforeAll(async () => {
    // Initialize database connection
    db = spark({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'bun_orm',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });

    // Test connection
    const isConnected = await db.testConnection();
    expect(isConnected).toBe(true);

    // Create test table
    await db.raw(`
      CREATE TABLE IF NOT EXISTS transaction_test (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        balance DECIMAL(10,2) DEFAULT 0
      )
    `);

    // Clear test data
    await db.raw('DELETE FROM transaction_test');
  });

  afterAll(async () => {
    // Clean up
    await db.raw('DROP TABLE IF EXISTS transaction_test');
    // Don't close the connection here as it's shared across tests
  });

  it('should commit a successful transaction', async () => {
    const result = await db.transaction(async (trx: Transaction) => {
      // Insert data
      await trx.insert({ name: 'John Doe', balance: 100.00 })
        .into('transaction_test')
        .execute();

      // Update data
      await trx.update({ balance: 150.00 })
        .table('transaction_test')
        .where('name', '=', 'John Doe')
        .execute();

      // Return the final result
      return await trx.select()
        .from('transaction_test')
        .where('name', '=', 'John Doe')
        .first();
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('John Doe');
    expect(parseFloat(result.balance)).toBe(150.00);

    // Verify data persists after transaction
    const persisted = await db.select()
      .from('transaction_test')
      .where('name', '=', 'John Doe')
      .first();

    expect(persisted).toBeDefined();
    expect(persisted.name).toBe('John Doe');
    expect(parseFloat(persisted.balance)).toBe(150.00);
  });

  it('should rollback a failed transaction', async () => {
    // Clear test data first
    await db.raw('DELETE FROM transaction_test');

    let transactionFailed = false;
    let errorMessage = '';

    try {
      await db.transaction(async (trx: Transaction) => {
        // Insert first record
        await trx.insert({ name: 'Jane Smith', balance: 200.00 })
          .into('transaction_test')
          .execute();

        // This should fail and cause rollback - try to insert with null name (violates NOT NULL constraint)
        await trx.raw(
          'INSERT INTO transaction_test (name, balance) VALUES (NULL, 300.00)'
        );
      });
    } catch (error: any) {
      transactionFailed = true;
      errorMessage = error.message;
    }

    // Verify that the transaction failed
    expect(transactionFailed).toBe(true);
    expect(errorMessage).toContain('null value');
  });

  it('should support raw SQL in transactions', async () => {
    const result = await db.transaction(async (trx: Transaction) => {
      // Use raw SQL
      await trx.raw(
        'INSERT INTO transaction_test (name, balance) VALUES ($1, $2)',
        ['Charlie Wilson', 300.00]
      );

      // Use raw SQL for select
      const results = await trx.raw(
        'SELECT * FROM transaction_test WHERE name = $1',
        ['Charlie Wilson']
      );

      return results[0];
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('Charlie Wilson');
    expect(parseFloat(result.balance)).toBe(300.00);
  });

  it('should handle nested operations in transaction', async () => {
    const result = await db.transaction(async (trx: Transaction) => {
      // Multiple operations
      const user1 = await trx.insert({ name: 'Henry Adams', balance: 100.00 })
        .into('transaction_test')
        .returning(['id', 'name', 'balance'])
        .execute();

      const user2 = await trx.insert({ name: 'Ivy Chen', balance: 200.00 })
        .into('transaction_test')
        .returning(['id', 'name', 'balance'])
        .execute();

      // Update both users
      await trx.update({ balance: 150.00 })
        .table('transaction_test')
        .where('id', '=', user1[0].id)
        .execute();

      await trx.update({ balance: 250.00 })
        .table('transaction_test')
        .where('id', '=', user2[0].id)
        .execute();

      // Return both updated users
      return await trx.select()
        .from('transaction_test')
        .whereIn('name', ['Henry Adams', 'Ivy Chen'])
        .orderBy('name', 'ASC')
        .get();
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Henry Adams');
    expect(parseFloat(result[0].balance)).toBe(150.00);
    expect(result[1].name).toBe('Ivy Chen');
    expect(parseFloat(result[1].balance)).toBe(250.00);
  });

  it('should throw error for manual transaction control', async () => {
    try {
      await db.beginTransaction();
      throw new Error('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Manual transaction control is not supported');
    }
  });
}); 