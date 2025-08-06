import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { spark, type ConnectionConfig } from '../index'

describe('Database Connection', () => {
  let db: any

  beforeAll(() => {
    const config: ConnectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'bun_orm',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    }
    db = spark(config)
  })

  afterAll(async () => {
    // Don't close the connection here as it's shared across tests
  })

  it('should connect to the database successfully', async () => {
    const isConnected = await db.testConnection()
    expect(isConnected).toBe(true)
  })

  it('should execute raw SQL queries', async () => {
    const result = await db.raw('SELECT 1 as test_value')
    expect(result).toBeDefined()
    expect(result[0].test_value).toBe(1)
  })

  it('should handle parameterized queries', async () => {
    const result = await db.raw('SELECT $1 as param_value', ['test'])
    expect(result[0].param_value).toBe('test')
  })

  it('should check if table exists', async () => {
    // First create a test table
    await db.raw('CREATE TABLE IF NOT EXISTS test_table (id INTEGER)')

    const exists = await db.hasTable('test_table')
    expect(exists).toBe(true)

    // Clean up
    await db.dropTable('test_table')
  })

  it('should drop tables', async () => {
    // Create a test table
    await db.raw('CREATE TABLE test_drop_table (id INTEGER)')

    // Verify it exists
    let exists = await db.hasTable('test_drop_table')
    expect(exists).toBe(true)

    // Drop it
    await db.dropTable('test_drop_table')

    // Verify it's gone
    exists = await db.hasTable('test_drop_table')
    expect(exists).toBe(false)
  })
})
