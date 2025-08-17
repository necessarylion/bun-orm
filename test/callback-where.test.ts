import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db, setupTestTables, cleanupTestData, insertTestData } from './setup'

describe('Callback-based WHERE conditions', () => {
  beforeAll(async () => {
    await setupTestTables()
    await insertTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('should support callback-based where with simple conditions', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.where('id', 1)
        q.orWhere('name', 'Jane Smith')
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2)
    expect(users.some((u) => u.id === 1)).toBe(true)
    expect(users.some((u) => u.name === 'Jane Smith')).toBe(true)
  })

  it('should support callback-based where with simple conditions query', async () => {
    const builder = db
      .table('users')
      .where((q) => {
        q.where('id', 1)
        q.orWhere('name', 'Jane Smith')
      })
      .where('id', 1)

    const query = builder.toQuery()

    expect(query).toBe(`SELECT * FROM "users" WHERE "id" = '1' AND ("id" = '1' OR "name" = 'Jane Smith')`)
    const res = await db.rawQuery(query)
    expect(res.length).toBe(1)

    const sql = builder.toSql()
    const res2 = await db.rawQuery(sql.sql, sql.params)
    expect(res2.length).toBe(1)
  })

  it('should support callback-based where with complex conditions', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.where('age', '>', 25)
        q.orWhere('active', false)
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(3) // John (30), Bob (35, inactive), Alice (28)
    expect(users.some((u) => u.name === 'John Doe')).toBe(true)
    expect(users.some((u) => u.name === 'Bob Johnson')).toBe(true)
    expect(users.some((u) => u.name === 'Alice Brown')).toBe(true)
  })

  it('should support nested callback-based where conditions', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.where('active', true)
        q.where('age', '>', 25)
        q.orWhere('name', 'LIKE', '%Jane%')
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(3) // All users: John (30, active), Jane (25, active), Bob (35, inactive), Alice (28, active)
    expect(users.some((u) => u.name === 'John Doe')).toBe(true)
    expect(users.some((u) => u.name === 'Jane Smith')).toBe(true)
    expect(users.some((u) => u.name === 'Alice Brown')).toBe(true)
  })

  it('should support callback-based where with IN conditions', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.whereIn('id', [1, 3])
        q.orWhereIn('age', [25, 28])
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4) // All users should match
  })

  it('should support callback-based where with NULL conditions', async () => {
    // Test with age column which can be null
    const users = await db
      .table('users')
      .where((q) => {
        q.whereNull('age')
        q.orWhere('age', '>=', 35)
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(1) // Only Bob (35)
    expect(users.some((u) => u.name === 'Bob Johnson')).toBe(true)
  })

  it('should support callback-based where with age >= 35', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.where('age', '>=', 35)
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(1) // Only Bob (35)
    expect(users.some((u) => u.name === 'Bob Johnson')).toBe(true)
  })

  it('should support callback-based where with IS NULL and IS NOT NULL', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.whereNotNull('age')
        q.orWhere('age', '>', 30)
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4) // All users have age values
  })

  it('should support callback-based where with raw conditions', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.whereRaw('age > ?', [25])
        q.orWhereRaw('age < ?', [30])
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBeGreaterThan(0)
  })

  it('should support simple raw conditions', async () => {
    const users = await db
      .table('users')
      .where((q) => {
        q.whereRaw('age > ?', [25])
      })
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBeGreaterThan(0)
  })
})
