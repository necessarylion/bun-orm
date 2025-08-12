import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { db, setupTestTables, cleanupTestData } from './setup'

describe('UPSERT Query Builder', () => {
  beforeAll(async () => {
    await setupTestTables()
  })

  beforeEach(async () => {
    await cleanupTestData()
  })

  afterAll(async () => {
    // Connection is shared across tests, don't close here
  })

  it('should insert a new record when no conflict exists', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
      active: true,
    }

    const result = await db.table('users').onConflict('email').upsert(userData)

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

  it('should update an existing record when conflict exists', async () => {
    // First, insert a user
    const initialUser = await db.table('users').insert({
      name: 'Original User',
      email: 'test@example.com',
      age: 25,
      active: true,
    })

    expect(initialUser).toHaveLength(1)
    const userId = initialUser[0].id

    // Now upsert with the same email but different data
    const updatedData = {
      name: 'Updated User',
      email: 'test@example.com',
      age: 30,
      active: false,
    }

    const result = await db.table('users').onConflict('email').upsert(updatedData)

    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0].id).toBe(userId) // Same ID
    expect(result[0].name).toBe('Updated User') // Updated name
    expect(result[0].email).toBe('test@example.com') // Same email
    expect(result[0].age).toBe(30) // Updated age
    expect(result[0].active).toBe(false) // Updated active status

    // Verify only one record exists with this email
    const allUsers = await db.table('users').where('email', '=', 'test@example.com').get()
    expect(allUsers).toHaveLength(1)
    expect(allUsers[0].name).toBe('Updated User')
    expect(allUsers[0].email).toBe('test@example.com')
    expect(allUsers[0].age).toBe(30)
    expect(allUsers[0].active).toBe(false)
  })
})
