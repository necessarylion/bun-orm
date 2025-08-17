import { describe, it, expect, beforeEach, afterEach, spyOn, afterAll } from 'bun:test'
import { type Spark, spark } from '../src/core/spark'
import { BaseQueryBuilder } from '../src/query-builders/base-query-builder'
import { cleanupTestData, testConfig } from './setup'

describe('QueryBuilder string generation', () => {
  let db: Spark
  const executeQuerySpy = spyOn(BaseQueryBuilder.prototype, 'executeQuery').mockImplementation(async () => [])

  beforeEach(async () => {
    await cleanupTestData()
    db = spark(testConfig)
  })

  afterAll(async () => {
    await cleanupTestData()
    executeQuerySpy.mockRestore()
  })

  afterEach(async () => {
    executeQuerySpy.mockReset()
  })

  it('should generate a basic SELECT query', () => {
    const query = db.table('users').toQuery()
    expect(query).toBe('SELECT * FROM "users"')
  })

  it('should generate a SELECT query with specific columns', () => {
    const query = db.table('users').select(['id', 'name']).toQuery()
    expect(query).toBe('SELECT id, name FROM "users"')
  })

  it('should generate a SELECT query with column aliases', () => {
    const query = db.table('users').select({ user_id: 'id', user_name: 'name' }).toQuery()
    expect(query).toBe('SELECT "id" AS "user_id", "name" AS "user_name" FROM "users"')
  })

  it('should generate a SELECT query with a WHERE clause', () => {
    const { sql, params } = db.table('users').where('id', 1).toSql()
    expect(sql).toBe('SELECT * FROM "users" WHERE "id" = $1')
    expect(params).toEqual([1])
  })

  it('should generate a SELECT query with multiple WHERE clauses', () => {
    const { sql, params } = db.table('users').where('id', 1).where('name', 'John').toSql()
    expect(sql).toBe('SELECT * FROM "users" WHERE "id" = $1 AND "name" = $2')
    expect(params).toEqual([1, 'John'])
  })

  it('should generate a SELECT query with a WHERE IN clause', () => {
    const { sql, params } = db.table('users').whereIn('id', [1, 2, 3]).toSql()
    expect(sql).toBe('SELECT * FROM "users" WHERE "id" IN ($1, $2, $3)')
    expect(params).toEqual([1, 2, 3])
  })

  it('should generate a SELECT query with a WHERE NULL clause', () => {
    const { sql, params } = db.table('users').whereNull('deleted_at').toSql()
    expect(sql).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL')
    expect(params).toEqual([])
  })

  it('should generate a SELECT query with where(col, null)', () => {
    const { sql, params } = db.table('users').where('deleted_at', null).toSql()
    expect(sql).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL')
    expect(params).toEqual([])
  })

  it('should generate a SELECT query with ORDER BY', () => {
    const query = db.table('users').orderBy('created_at', 'DESC').toQuery()
    expect(query).toBe('SELECT * FROM "users" ORDER BY "created_at" DESC')
  })

  it('should generate a SELECT query with LIMIT and OFFSET', () => {
    const query = db.table('users').limit(10).offset(20).toQuery()
    expect(query).toBe('SELECT * FROM "users" LIMIT 10 OFFSET 20')
  })

  it('should generate a SELECT query with an INNER JOIN', () => {
    const query = db.table('users').join('posts', 'users.id = posts.user_id').toQuery()
    expect(query).toBe('SELECT * FROM "users" INNER JOIN "posts" ON users.id = posts.user_id')
  })

  it('should generate a basic INSERT query', async () => {
    await db.table('users').insert({ name: 'John', age: 30, email: 'john@example.com' })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO "users" ("name", "age", "email") VALUES ($1, $2, $3) RETURNING *'
    )
    expect(params).toEqual(['John', 30, 'john@example.com'])
  })

  it('should generate an INSERT query for multiple records', async () => {
    await db.table('users').insert([
      { name: 'John', age: 30, email: 'john@example.com' },
      { name: 'Jane', age: 25, email: 'jane@example.com' },
    ])
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO "users" ("name", "age", "email") VALUES ($1, $2, $3), ($4, $5, $6) RETURNING *'
    )
    expect(params).toEqual(['John', 30, 'john@example.com', 'Jane', 25, 'jane@example.com'])
  })

  it('should generate an INSERT query with a RETURNING clause', async () => {
    await db
      .table('users')
      .returning(['id', 'name', 'email'])
      .insert({ name: 'John', age: 30, email: 'john@example.com' })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO "users" ("name", "age", "email") VALUES ($1, $2, $3) RETURNING "id", "name", "email"'
    )
    expect(params).toEqual(['John', 30, 'john@example.com'])
  })

  it('should generate a basic UPDATE query', async () => {
    await db.table('users').where('id', 1).update({ name: 'John', age: 30 })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe('UPDATE "users" SET "name" = $1, "age" = $2 WHERE "id" = $3 RETURNING *')
    expect(params).toEqual(['John', 30, 1])
  })

  it('should generate an UPDATE query with a RETURNING clause', async () => {
    await db.table('users').where('id', 1).returning(['id', 'name']).update({ name: 'John', age: 30 })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'UPDATE "users" SET "name" = $1, "age" = $2 WHERE "id" = $3 RETURNING "id", "name"'
    )
    expect(params).toEqual(['John', 30, 1])
  })

  it('should generate a basic DELETE query', async () => {
    await db.table('users').where('id', 1).delete()
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe('DELETE FROM "users" WHERE "id" = $1 RETURNING *')
    expect(params).toEqual([1])
  })

  it('should generate a DELETE query with a RETURNING clause', async () => {
    await db.table('users').where('id', 1).returning(['id', 'name']).delete()
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe('DELETE FROM "users" WHERE "id" = $1 RETURNING "id", "name"')
    expect(params).toEqual([1])
  })

  it('should generate a basic UPSERT query', async () => {
    await db.table('users').onConflict('email').upsert({ name: 'John', age: 30, email: 'john@example.com' })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO "users" ("name", "age", "email") VALUES ($1, $2, $3) ON CONFLICT ("email") DO UPDATE SET "name" = $4, "age" = $5, "email" = $6 RETURNING *'
    )
    expect(params).toEqual(['John', 30, 'john@example.com', 'John', 30, 'john@example.com'])
  })

  it('should generate an UPSERT query with multiple conflict columns', async () => {
    await db.table('users').onConflict(['name', 'email']).upsert({ name: 'John', age: 30, email: 'john@example.com' })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO "users" ("name", "age", "email") VALUES ($1, $2, $3) ON CONFLICT ("name", "email") DO UPDATE SET "name" = $4, "age" = $5, "email" = $6 RETURNING *'
    )
    expect(params).toEqual(['John', 30, 'john@example.com', 'John', 30, 'john@example.com'])
  })

  it('should generate an UPSERT query with a RETURNING clause', async () => {
    await db
      .table('users')
      .onConflict('email')
      .returning(['id', 'name', 'email'])
      .upsert({ name: 'John', age: 30, email: 'john@example.com' })
    const [sql, params] = executeQuerySpy.mock.calls[0] as [string, any[]]
    expect(sql.replace(/\s+/g, ' ')).toBe(
      'INSERT INTO "users" ("name", "age", "email") VALUES ($1, $2, $3) ON CONFLICT ("email") DO UPDATE SET "name" = $4, "age" = $5, "email" = $6 RETURNING "id", "name", "email"'
    )
    expect(params).toEqual(['John', 30, 'john@example.com', 'John', 30, 'john@example.com'])
  })
})
