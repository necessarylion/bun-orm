import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { db, setupTestTables, cleanupTestData, insertTestData } from './setup'

describe('Where Like/ILike', () => {
  beforeEach(async () => {
    await setupTestTables()
    await insertTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('where like ends with Johnson', async () => {
    const users = await db.table('users').whereLike('name', '%Johnson').get()

    expect(users.length).toBe(1)
    expect(users[0].name).toBe('Bob Johnson')
  })

  it('where ilike ends with johnson', async () => {
    const users = await db.table('users').whereILike('name', '%johnson').get()

    expect(users.length).toBe(1)
    expect(users[0].name).toBe('Bob Johnson')
  })

  it('where ilike start with john', async () => {
    const users = await db.table('users').whereILike('name', 'john%').get()

    expect(users.length).toBe(1)
    expect(users[0].name).toBe('John Doe')
  })

  it('where like start with john', async () => {
    const users = await db.table('users').whereLike('name', 'John%').get()

    expect(users.length).toBe(1)
    expect(users[0].name).toBe('John Doe')
  })

  it('where not like start with john', async () => {
    const users = await db.table('users').whereNotLike('name', 'John%').get()

    expect(users.length).toBe(3)
  })

  it('where not ilike start with john', async () => {
    const users = await db.table('users').whereNotILike('name', 'John%').get()

    expect(users.length).toBe(3)
  })
})
