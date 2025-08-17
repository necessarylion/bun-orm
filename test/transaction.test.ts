import { describe, it, expect, beforeEach } from 'bun:test'
import { spark, type Transaction, type Spark } from '../index'
import { getAutoIncrementSQL, testConfig } from './setup'

describe('Transaction Tests', () => {
  let db: Spark

  beforeEach(async () => {
    // Initialize database connection
    db = spark(testConfig)

    // Test connection
    const isConnected = await db.testConnection()
    expect(isConnected).toBe(true)

    // Create test table
    await db.rawQuery(`
      CREATE TABLE IF NOT EXISTS transaction_test (
        id ${getAutoIncrementSQL()},
        name VARCHAR(255) NOT NULL,
        balance DECIMAL(10,2) DEFAULT 0
      )
    `)

    // Clear test data
    await db.rawQuery('DELETE FROM transaction_test')
  })

  it('should commit a successful transaction', async () => {
    const result = await db.transaction(async (trx: Transaction) => {
      // Insert data
      await trx.table('transaction_test').insert({ name: 'John Doe', balance: 100.0 })

      // Update data
      await trx.table('transaction_test').where('name', '=', 'John Doe').update({ balance: 150.0 })

      // Return the final result
      return await trx.table('transaction_test').where('name', '=', 'John Doe').first()
    })

    expect(result).toBeDefined()
    expect(result.name).toBe('John Doe')
    expect(parseFloat(result.balance)).toBe(150.0)

    // Verify data persists after transaction
    const persisted = await db.table('transaction_test').where('name', '=', 'John Doe').first()

    expect(persisted).toBeDefined()
    expect(persisted.name).toBe('John Doe')
    expect(parseFloat(persisted.balance)).toBe(150.0)
  })

  it('should rollback a failed transaction', async () => {
    // Clear test data first
    await db.rawQuery('DELETE FROM transaction_test')

    let transactionFailed = false
    let errorMessage = ''

    try {
      await db.transaction(async (trx: Transaction) => {
        // Insert first record
        await trx.table('transaction_test').insert({ name: 'Jane Smith', balance: 200.0 })

        // This should fail and cause rollback - try to insert with null name (violates NOT NULL constraint)
        await trx.rawQuery('INSERT INTO transaction_test (name, balance) VALUES (NULL, 300.00)')
      })
    } catch (error: any) {
      transactionFailed = true
      errorMessage = error.message
    }

    // Verify that the transaction failed
    expect(transactionFailed).toBe(true)
    expect(errorMessage.toLowerCase()).toContain('null')
  })

  it('should support raw SQL in transactions', async () => {
    const result = await db.transaction(async (trx: Transaction) => {
      // Use raw SQL
      await trx.rawQuery('INSERT INTO transaction_test (name, balance) VALUES ($1, $2)', ['Charlie Wilson', 300.0])

      // Use raw SQL for select
      const results = await trx.rawQuery('SELECT * FROM transaction_test WHERE name = $1', ['Charlie Wilson'])

      return results[0]
    })

    expect(result).toBeDefined()
    expect(result.name).toBe('Charlie Wilson')
    expect(parseFloat(result.balance)).toBe(300.0)
  })

  it('should handle nested operations in transaction', async () => {
    const result = await db.transaction(async (trx: Transaction) => {
      // Multiple operations
      const user1 = await trx
        .table('transaction_test')
        .returning(['id', 'name', 'balance'])
        .insert({ name: 'Henry Adams', balance: 100.0 })

      const user2 = await trx
        .table('transaction_test')
        .returning(['id', 'name', 'balance'])
        .insert({ name: 'Ivy Chen', balance: 200.0 })

      // Update both users
      await trx.table('transaction_test').where('id', '=', user1[0].id).update({ balance: 150.0 })

      await trx.table('transaction_test').where('id', '=', user2[0].id).update({ balance: 250.0 })

      // Return both updated users
      return await trx
        .table('transaction_test')
        .whereIn('name', ['Henry Adams', 'Ivy Chen'])
        .orderBy('name', 'asc')
        .get()
    })

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Henry Adams')
    expect(parseFloat(result[0].balance)).toBe(150.0)
    expect(result[1].name).toBe('Ivy Chen')
    expect(parseFloat(result[1].balance)).toBe(250.0)
  })

  it('should rollback on failed transaction with get-update-fail pattern', async () => {
    // Clear test data first
    await db.rawQuery('DELETE FROM transaction_test')

    // 1. Get initial query - insert a test record
    const initialRecord = await db
      .table('transaction_test')
      .returning(['id', 'name', 'balance'])
      .insert({ name: 'Test User', balance: 100.0 })

    expect(initialRecord).toHaveLength(1)
    expect(initialRecord[0].name).toBe('Test User')
    expect(parseFloat(initialRecord[0].balance)).toBe(100.0)

    const userId = initialRecord[0].id

    // Verify the record exists
    const beforeTransaction = await db.table('transaction_test').where('id', '=', userId).first()

    expect(beforeTransaction).toBeDefined()
    expect(beforeTransaction.name).toBe('Test User')
    expect(parseFloat(beforeTransaction.balance)).toBe(100.0)

    let transactionFailed = false
    let errorMessage = ''

    try {
      // 2. Run transaction query to update the record
      await db.transaction(async (trx: Transaction) => {
        // Update the balance
        await trx.table('transaction_test').where('id', '=', userId).update({ balance: 200.0 })

        // Verify the update within transaction
        const withinTransaction = await trx.table('transaction_test').where('id', '=', userId).first()

        expect(withinTransaction).toBeDefined()
        expect(withinTransaction.name).toBe('Test User')
        expect(parseFloat(withinTransaction.balance)).toBe(200.0)

        // 3. Run another query that fails with error
        // This will cause the entire transaction to rollback
        await trx.rawQuery('INSERT INTO transaction_test (name, balance) VALUES (NULL, 300.00)')
      })
    } catch (error: any) {
      transactionFailed = true
      errorMessage = error.message

      console.log(error.message)
    }

    // Verify that the transaction failed
    expect(transactionFailed).toBe(true)
    expect(errorMessage.toLowerCase()).toContain('null')

    // 4. Check if query is rolled back - the balance should be back to original value
    const afterTransaction = await db.table('transaction_test').where('id', '=', userId).first()

    expect(afterTransaction).toBeDefined()
    expect(afterTransaction.name).toBe('Test User')
    // The balance should be rolled back to the original value (100.00), not the updated value (200.00)
    expect(parseFloat(afterTransaction.balance)).toBe(100.0)

    // Verify no additional records were created (the failed insert should be rolled back)
    const allRecords = await db.table('transaction_test').where('name', '=', 'Test User').get()

    expect(allRecords).toHaveLength(1) // Only the original record should exist
  })

  it('manual transaction with rollback', async () => {
    await db.table('transaction_test').insert({ name: 'John', balance: 100.0 })
    const trx = await db.beginTransaction()
    try {
      await trx.table('transaction_test').where('name', 'John').update({
        balance: 200.0,
      })
      throw new Error('test')
    } catch (_) {
      await trx.rollback()
    }
    const transaction = await db.table('transaction_test').where('name', 'John').first()
    expect(transaction).toBeDefined()
    expect(parseFloat(transaction.balance)).toBe(100)
    expect(transaction.name).toBe('John')
  })

  it('manual transaction with commit', async () => {
    await db.truncate('transaction_test')
    await db.table('transaction_test').insert({ name: 'John', balance: 100.0 })
    const trx = await db.beginTransaction()
    try {
      await trx.table('transaction_test').where('name', 'John').update({
        balance: 200.0,
      })
      await trx.commit()
    } catch (_) {
      await trx.rollback()
    }
    const transaction = await db.table('transaction_test').where('name', 'John').first()
    expect(transaction).toBeDefined()
    expect(parseFloat(transaction.balance)).toBe(200)
    expect(transaction.name).toBe('John')
  })
})
