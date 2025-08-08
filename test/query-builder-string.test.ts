import { describe, it, expect, beforeEach, vi, afterEach } from 'bun:test'
import { spark } from '../src/core/spark'
import type { QueryBuilder } from '../src/query-builders/query-builder'
import { BaseQueryBuilder } from '../src/query-builders/base-query-builder'

describe('QueryBuilder string generation', () => {
  let db: QueryBuilder<any>
  const executeQuerySpy = vi.spyOn(BaseQueryBuilder.prototype, 'executeQuery').mockImplementation(async () => [])

  beforeEach(() => {
    db = spark({
      host: 'localhost',
      port: 5432,
      database: 'test',
      username: 'test',
      password: 'test',
    })
  })

  afterEach(() => {
    executeQuerySpy.mockClear()
  })

  it('should generate a basic SELECT query', () => {
    const query = db.table('users').toSql()
    expect(query).toBe('SELECT * FROM "users"')
  })

  it('should generate a SELECT query with specific columns', () => {
    const query = db.table('users').select(['id', 'name']).toSql()
    expect(query).toBe('SELECT id, name FROM "users"')
  })

  it('should generate a SELECT query with column aliases', () => {
    const query = db.table('users').select({ user_id: 'id', user_name: 'name' }).toSql()
    expect(query).toBe('SELECT "id" AS "user_id", "name" AS "user_name" FROM "users"')
  })

  it('should generate a SELECT query with a WHERE clause', () => {
    const { sql, params } = db.table('users').where('id', 1).raw()
    expect(sql).toBe('SELECT * FROM "users" WHERE "id" = $1')
    expect(params).toEqual([1])
  })

  it('should generate a SELECT query with multiple WHERE clauses', () => {
    const { sql, params } = db.table('users').where('id', 1).where('name', 'John').raw()
    expect(sql).toBe('SELECT * FROM "users" WHERE "id" = $1 AND "name" = $2')
    expect(params).toEqual([1, 'John'])
  })

  it('should generate a SELECT query with a WHERE IN clause', () => {
    const { sql, params } = db.table('users').whereIn('id', [1, 2, 3]).raw()
    expect(sql).toBe('SELECT * FROM "users" WHERE "id" IN ($1, $2, $3)')
    expect(params).toEqual([1, 2, 3])
  })

  it('should generate a SELECT query with a WHERE NULL clause', () => {
    const { sql, params } = db.table('users').whereNull('deleted_at').raw()
    expect(sql).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL')
    expect(params).toEqual([])
  })

  it('should generate a SELECT query with where(col, null)', () => {
    const { sql, params } = db.table('users').where('deleted_at', null).raw()
    expect(sql).toBe('SELECT * FROM "users" WHERE "deleted_at" IS NULL')
    expect(params).toEqual([])
  })

  it('should generate a SELECT query with ORDER BY', () => {
    const query = db.table('users').orderBy('created_at', 'DESC').toSql()
    expect(query).toBe('SELECT * FROM "users" ORDER BY "created_at" DESC')
  })

  it('should generate a SELECT query with LIMIT and OFFSET', () => {
    const query = db.table('users').limit(10).offset(20).toSql()
    expect(query).toBe('SELECT * FROM "users" LIMIT 10 OFFSET 20')
  })

  it('should generate a SELECT query with an INNER JOIN', () => {
    const query = db.table('users').join('posts', 'users.id = posts.user_id').toSql()
    expect(query).toBe('SELECT * FROM "users" INNER JOIN "posts" ON users.id = posts.user_id')
  })

  it('should generate a basic INSERT query', async () => {
    await db.table('users').insert({ name: 'John', age: 30 })
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2) RETURNING *')
    expect(params).toEqual(['John', 30])
  })

  it('should generate an INSERT query for multiple records', async () => {
    await db.table('users').insert([
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ])
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2), ($3, $4) RETURNING *')
    expect(params).toEqual(['John', 30, 'Jane', 25])
  })

  it('should generate an INSERT query with a RETURNING clause', async () => {
    await db.table('users').returning(['id', 'name']).insert({ name: 'John', age: 30 })
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2) RETURNING "id", "name"')
    expect(params).toEqual(['John', 30])
  })

  it('should generate a basic UPDATE query', async () => {
    await db.table('users').where('id', 1).update({ name: 'John', age: 30 })
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('UPDATE "users" SET "name" = $1, "age" = $2 WHERE "id" = $3 RETURNING *')
    expect(params).toEqual(['John', 30, 1])
  })

  it('should generate an UPDATE query with a RETURNING clause', async () => {
    await db.table('users').where('id', 1).returning(['id', 'name']).update({ name: 'John', age: 30 })
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('UPDATE "users" SET "name" = $1, "age" = $2 WHERE "id" = $3 RETURNING "id", "name"')
    expect(params).toEqual(['John', 30, 1])
  })

  it('should generate a basic DELETE query', async () => {
    await db.table('users').where('id', 1).delete()
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('DELETE FROM "users" WHERE "id" = $1 RETURNING *')
    expect(params).toEqual([1])
  })

  it('should generate a DELETE query with a RETURNING clause', async () => {
    await db.table('users').where('id', 1).returning(['id', 'name']).delete()
    const [sql, params] = executeQuerySpy.mock.calls[0]
    expect(sql.replace(/\s+/g, ' ')).toBe('DELETE FROM "users" WHERE "id" = $1 RETURNING "id", "name"')
    expect(params).toEqual([1])
  })
})
