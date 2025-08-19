import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { db, setupTestTables, cleanupTestData, insertTestData } from './setup'

describe('Having', () => {
  beforeEach(async () => {
    await setupTestTables()
    await insertTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('having equal', async () => {
    const users = await db.table('users')
      .groupBy('users.id')
      .having('email', 'bob@example.com')
      .get()

    expect(users.length).toBe(1)
    expect(users[0].email).toBe('bob@example.com')
  })

  it('having greater than', async () => {
    const users = await db.table('users')
      .groupBy('users.id')
      .having('age', '>', 25)
      .get()

    expect(users.length).toBe(3)
  })

  it('where and having greater than', async () => {
    const users = await db.table('users')
      .where('active', true)
      .groupBy('users.id')
      .having('age', '>', 25)
      .get()

    expect(users.length).toBe(2)
  })

  it('where and having with count', async () => {
    await db.table('users').insert({
      name: 'John Doe 2',
      email: 'john2@example.com',
      age: 25,
      active: true,
    })
    const users = await db.table('users')
      .select('age')
      .select('count(*) as count')
      .where('active', true)
      .groupBy('users.age')
      .havingRaw('count(*) >= ?', [2])
      .get()

    expect(users.length).toBe(1)
    expect(users[0].age).toBe(25)
    expect(Number(users[0].count)).toBe(2)
  })
})
