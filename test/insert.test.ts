import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { db, setupTestTables, cleanupTestData } from './setup'

describe('INSERT Query Builder', () => {
  beforeAll(async () => {
    await setupTestTables()
  })

  beforeEach(async () => {
    await cleanupTestData()
  })

  afterAll(async () => {
    // Connection is shared across tests, don't close here
  })

  it('should insert a single record', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
      active: true,
    }

    const result = await db.table('users').returning(['id', 'name', 'email']).insert(userData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0]).toHaveProperty('id')
    expect(result[0].name).toBe('Test User')
    expect(result[0].email).toBe('test@example.com')

    // Verify the record was actually inserted
    const insertedUser = await db.table('users').where('email', '=', 'test@example.com').first()
    expect(insertedUser).toBeDefined()
    expect(insertedUser.name).toBe('Test User')
  })

  it('should insert multiple records', async () => {
    const usersData = [
      { name: 'User 1', email: 'user1@example.com', age: 25, active: true },
      { name: 'User 2', email: 'user2@example.com', age: 30, active: false },
      { name: 'User 3', email: 'user3@example.com', age: 35, active: true },
    ]

    const result = await db.table('users').returning(['id', 'name', 'email']).insert(usersData)

    expect(result).toBeDefined()
    expect(result.length).toBe(3)
    expect(result[0]).toHaveProperty('id')
    expect(result[1]).toHaveProperty('id')
    expect(result[2]).toHaveProperty('id')

    // Verify all records were inserted
    const allUsers = await db.table('users').get()
    expect(allUsers.length).toBe(3)
  })

  it('should insert with specific returning columns', async () => {
    const userData = {
      name: 'Returning Test User',
      email: 'returning@example.com',
      age: 28,
      active: true,
    }

    const result = await db.table('users').returning(['name', 'email']).insert(userData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0]).toHaveProperty('name')
    expect(result[0]).toHaveProperty('email')
    expect(result[0]).not.toHaveProperty('id')
    expect(result[0]).not.toHaveProperty('age')
  })

  it('should insert without returning clause', async () => {
    const userData = {
      name: 'No Return User',
      email: 'noreturn@example.com',
      age: 32,
      active: true,
    }

    const result = await db.table('users').insert(userData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)

    // Verify the record was inserted
    const insertedUser = await db.table('users').where('email', '=', 'noreturn@example.com').first()
    expect(insertedUser).toBeDefined()
  })

  it('should insert with all returning columns', async () => {
    const userData = {
      name: 'All Return User',
      email: 'allreturn@example.com',
      age: 29,
      active: false,
    }

    const result = await db.table('users').returning().insert(userData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('name')
    expect(result[0]).toHaveProperty('email')
    expect(result[0]).toHaveProperty('age')
    expect(result[0]).toHaveProperty('active')
    expect(result[0]).toHaveProperty('created_at')
  })

  it('should handle null values', async () => {
    const userData = {
      name: 'Null Age User',
      email: 'nullage@example.com',
      age: null,
      active: true,
    }

    const result = await db.table('users').returning(['name', 'age']).insert(userData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0].age).toBeNull()
  })

  it('should handle insert with constructor data', async () => {
    const userData = {
      name: 'Constructor User',
      email: 'constructor@example.com',
      age: 31,
      active: true,
    }

    const result = await db.table('users').returning(['id', 'name']).insert(userData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Constructor User')
  })

  it('should handle insert with array constructor data', async () => {
    const usersData = [
      {
        name: 'Array User 1',
        email: 'array1@example.com',
        age: 26,
        active: true,
      },
      {
        name: 'Array User 2',
        email: 'array2@example.com',
        age: 33,
        active: false,
      },
    ]

    const result = await db.table('users').returning(['id', 'name']).insert(usersData)

    expect(result).toBeDefined()
    expect(result.length).toBe(2)
    expect(result[0].name).toBe('Array User 1')
    expect(result[1].name).toBe('Array User 2')
  })
})
