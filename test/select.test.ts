import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { db, setupTestTables, cleanupTestData, insertTestData } from './setup'

describe('SELECT Query Builder', () => {
  beforeAll(async () => {
    await setupTestTables()
  })

  beforeEach(async () => {
    await cleanupTestData()
    await insertTestData()
  })

  afterAll(async () => {
    // Connection is shared across tests, don't close here
  })

  it('should select all columns from a table', async () => {
    const users = await db.select().from('users').get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
    expect(users[0]).toHaveProperty('id')
    expect(users[0]).toHaveProperty('name')
    expect(users[0]).toHaveProperty('email')
  })

  it('should select specific columns', async () => {
    const users = await db.select(['name', 'email']).from('users').get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
    expect(users[0]).toHaveProperty('name')
    expect(users[0]).toHaveProperty('email')
    expect(users[0]).not.toHaveProperty('id')
  })

  it('should select with column aliases', async () => {
    const users = await db
      .select({ user_name: 'name', user_email: 'email' } as any)
      .from('users')
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
    expect(users[0]).toHaveProperty('user_name')
    expect(users[0]).toHaveProperty('user_email')
  })

  it('should filter with WHERE clause', async () => {
    const activeUsers = await db
      .select()
      .from('users')
      .where('active', '=', true)
      .get()

    expect(activeUsers).toBeDefined()
    expect(activeUsers.length).toBe(3)
    expect(activeUsers.every((user) => user.active === true)).toBe(true)
  })

  it('should filter with multiple WHERE conditions', async () => {
    const users = await db
      .select()
      .from('users')
      .where('active', '=', true)
      .where('age', '>', 25)
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2)
    expect(users.every((user) => user.active === true && user.age > 25)).toBe(
      true
    )
  })

  it('should filter with WHERE IN clause', async () => {
    const users = await db.select().from('users').whereIn('id', [1, 2, 3]).get()

    expect(users).toBeDefined()
    expect(users.length).toBe(3)
    expect(users.every((user) => [1, 2, 3].includes(user.id))).toBe(true)
  })

  it('should filter with WHERE NOT IN clause', async () => {
    const users = await db.select().from('users').whereNotIn('id', [1, 2]).get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2)
    expect(users.every((user) => ![1, 2].includes(user.id))).toBe(true)
  })

  it('should filter with WHERE NULL clause', async () => {
    // Insert a user with null age
    await db
      .table('users')
      .insert({ name: 'Null Age User', email: 'null@example.com', age: null })

    const users = await db.select().from('users').whereNull('age').get()

    expect(users).toBeDefined()
    expect(users.length).toBe(1)
    expect(users[0].age).toBeNull()
  })

  it('should filter with WHERE NOT NULL clause', async () => {
    const users = await db.select().from('users').whereNotNull('age').get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
    expect(users.every((user) => user.age !== null)).toBe(true)
  })

  it('should join tables', async () => {
    const postsWithUsers = await db
      .select(['posts.title', 'users.name as author'])
      .from('posts')
      .join('users', 'posts.user_id = users.id')
      .get()

    expect(postsWithUsers).toBeDefined()
    expect(postsWithUsers.length).toBe(4)
    expect(postsWithUsers[0]).toHaveProperty('title')
    expect(postsWithUsers[0]).toHaveProperty('author')
  })

  it('should left join tables', async () => {
    const postsWithUsers = await db
      .select(['posts.title', 'users.name as author'])
      .from('posts')
      .leftJoin('users', 'posts.user_id = users.id')
      .get()

    expect(postsWithUsers).toBeDefined()
    expect(postsWithUsers.length).toBe(4)
  })

  it('should order results', async () => {
    const users = await db.select().from('users').orderBy('name', 'ASC').get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
    expect(users[0].name).toBe('Alice Brown')
    expect(users[3].name).toBe('John Doe')
  })

  it('should order by multiple columns', async () => {
    const users = await db
      .select()
      .from('users')
      .orderBy('active', 'DESC')
      .orderBy('name', 'ASC')
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
  })

  it('should limit results', async () => {
    const users = await db.select().from('users').limit(2).get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2)
  })

  it('should offset results', async () => {
    const users = await db
      .select()
      .from('users')
      .orderBy('id', 'ASC')
      .limit(2)
      .offset(2)
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2)
    expect(users[0].id).toBe(3)
    expect(users[1].id).toBe(4)
  })

  it('should get distinct results', async () => {
    // Insert duplicate names
    await db.table('users').insert([
      { name: 'John Doe', email: 'john2@example.com', age: 40 },
      { name: 'John Doe', email: 'john3@example.com', age: 45 },
    ])

    const distinctNames = await db.select('name').from('users').distinct().get()

    expect(distinctNames).toBeDefined()
    expect(distinctNames.length).toBe(4) // 4 unique names (John Doe appears twice)
  })

  it('should get first result', async () => {
    const firstUser = await db
      .select()
      .from('users')
      .orderBy('id', 'ASC')
      .first()

    expect(firstUser).toBeDefined()
    expect(firstUser.id).toBe(1)
  })

  it('should return null when no results for first()', async () => {
    const user = await db.select().from('users').where('id', '=', 999).first()

    expect(user).toBeNull()
  })

  it('should count results', async () => {
    const count = await db
      .select()
      .from('users')
      .where('active', '=', true)
      .count()

    expect(count).toBe(3)
  })

  it('should count specific column', async () => {
    const count = await db
      .select()
      .from('users')
      .where('active', '=', true)
      .count('id')

    expect(count).toBe(3)
  })

  it('should group by column', async () => {
    const userPostCounts = await db
      .select(['name', 'COUNT(posts.id) as post_count'])
      .from('users')
      .leftJoin('posts', 'users.id = posts.user_id')
      .groupBy('name')
      .get()

    expect(userPostCounts).toBeDefined()
    expect(userPostCounts.length).toBe(4)
    expect(userPostCounts[0]).toHaveProperty('post_count')
  })

  it('should use table aliases', async () => {
    const users = await db
      .select(['u.name', 'u.email'])
      .from('users', 'u')
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(4)
  })

  it('should build raw query', async () => {
    const query = db
      .select(['name', 'email'])
      .from('users')
      .where('active', '=', true)
      .raw()

    expect(query).toHaveProperty('sql')
    expect(query).toHaveProperty('params')
    expect(query.sql).toContain('SELECT')
    expect(query.sql).toContain('FROM')
    expect(query.sql).toContain('WHERE')
  })

  it('should support where with implicit equals operator', async () => {
    const user = await db.select().from('users').where('id', 1).first()

    expect(user).toBeDefined()
    expect(user.id).toBe(1)
    expect(user.name).toBe('John Doe')
  })

  it('should support where with explicit equals operator', async () => {
    const user = await db.select().from('users').where('id', '=', 1).first()

    expect(user).toBeDefined()
    expect(user.id).toBe(1)
    expect(user.name).toBe('John Doe')
  })

  it('should support where with other operators', async () => {
    const users = await db.select().from('users').where('age', '>', 25).get()

    expect(users).toBeDefined()
    expect(users.length).toBe(3)
    expect(users.every((user) => user.age > 25)).toBe(true)
  })

  it('should support where with LIKE operator', async () => {
    const users = await db
      .select()
      .from('users')
      .where('name', 'LIKE', '%John%')
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2) // John Doe and Bob Johnson
    expect(users.some((user) => user.name === 'John Doe')).toBe(true)
    expect(users.some((user) => user.name === 'Bob Johnson')).toBe(true)
  })

  it('should support multiple select columns', async () => {
    const users = await db
      .select('name')
      .select({ my_email: 'email' })
      .from('users')
      .where('name', 'LIKE', '%John%')
      .get()

    expect(users).toBeDefined()
    expect(users.length).toBe(2) // John Doe and Bob Johnson
    expect(users.some((user) => user.name === 'John Doe')).toBe(true)
    expect(users.some((user) => user.my_email === 'bob@example.com')).toBe(true)
  })

  it('should support where raw condition', async () => {
    const user = await db
      .from('users')
      .select()
      .where('active', true)
      .where('age', '=', 28)
      .whereRaw('email = ?', ['alice@example.com'])
      .whereRaw('name = ?', ['Alice Brown'])
      .first()

    expect(user).toBeDefined()
    expect(user.name).toBe('Alice Brown')
    expect(user.email).toBe('alice@example.com')
    expect(user.age).toBe(28)
    expect(user.active).toBe(true)
  })
})
