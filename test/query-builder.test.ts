import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { BunORM, initializeORM, QueryBuilder, Table, Column } from "../index";

describe("Bun ORM Query Builder", () => {
  let orm: BunORM;

  beforeAll(async () => {
    // Initialize ORM with test configuration
    orm = initializeORM({
      database: 'test_db',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password'
    });

    // Note: In a real test environment, you'd set up a test database
    // For now, we'll just test the query building logic
  });

  afterAll(async () => {
    if (orm.isConnected()) {
      await orm.disconnect();
    }
  });

  test("should create a query builder instance", () => {
    const queryBuilder = orm.query();
    expect(queryBuilder).toBeInstanceOf(QueryBuilder);
  });

  test("should build a simple SELECT query", () => {
    const queryBuilder = orm.query()
      .from('users')
      .select('id', 'name', 'email')
      .where('active', '=', true)
      .orderBy('name', 'ASC')
      .limit(10);

    const sql = queryBuilder.toSql();
    expect(sql).toContain('SELECT id, name, email');
    expect(sql).toContain('FROM users');
    expect(sql).toContain('WHERE active = $1');
    expect(sql).toContain('ORDER BY name ASC');
    expect(sql).toContain('LIMIT 10');
  });

  test("should build a complex WHERE query", () => {
    const queryBuilder = orm.query()
      .from('users')
      .where('age', '>=', 18)
      .andWhere(condition => {
        condition.where('email', 'LIKE', '%@gmail.com');
        condition.where('verified', '=', true);
      })
      .orWhere(condition => {
        condition.where('premium', '=', true);
      });

    const sql = queryBuilder.toSql();
    expect(sql).toContain('WHERE age >= $1 AND (email LIKE $2 AND verified = $3) OR (premium = $4)');
  });

  test("should build a JOIN query", () => {
    const queryBuilder = orm.query()
      .from('posts')
      .select('posts.id', 'posts.title', 'users.name as author_name')
      .innerJoin('users', 'posts.user_id = users.id')
      .where('posts.published', '=', true);

    const sql = queryBuilder.toSql();
    expect(sql).toContain('SELECT posts.id, posts.title, users.name as author_name');
    expect(sql).toContain('FROM posts');
    expect(sql).toContain('INNER JOIN users ON posts.user_id = users.id');
    expect(sql).toContain('WHERE posts.published = $1');
  });

  test("should build an INSERT query", () => {
    const insertBuilder = orm.insert()
      .into('users')
      .insert({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true
      })
      .returning('id', 'name', 'email');

    const sql = insertBuilder.toSql();
    expect(sql).toContain('INSERT INTO users (name, email, age, active)');
    expect(sql).toContain('VALUES ($1, $2, $3, $4)');
    expect(sql).toContain('RETURNING id, name, email');
  });

  test("should build an UPDATE query", () => {
    const updateBuilder = orm.update()
      .update('users')
      .set('active', false)
      .set('last_login', new Date())
      .where('id', '=', 1)
      .returning('id', 'name');

    const sql = updateBuilder.toSql();
    expect(sql).toContain('UPDATE users');
    expect(sql).toContain('SET active = $1, last_login = $2');
    expect(sql).toContain('WHERE id = $3');
    expect(sql).toContain('RETURNING id, name');
  });

  test("should build a DELETE query", () => {
    const deleteBuilder = orm.delete()
      .from('users')
      .where('active', '=', false)
      .where('created_at', '<', new Date())
      .returning('id', 'name');

    const sql = deleteBuilder.toSql();
    expect(sql).toContain('DELETE FROM users');
    expect(sql).toContain('WHERE active = $1 AND created_at < $2');
    expect(sql).toContain('RETURNING id, name');
  });

  test("should create Table and Column objects", () => {
    const usersTable = orm.table('users', 'public');
    const nameColumn = orm.column('name', 'users');

    expect(usersTable.qualifiedName).toBe('public.users');
    expect(nameColumn.qualifiedName).toBe('users.name');

    const aliasedTable = usersTable.as('u');
    const aliasedColumn = nameColumn.as('user_name');

    expect(aliasedTable.displayName).toBe('u');
    expect(aliasedColumn.displayName).toBe('user_name');
  });

  test("should build aggregation query", () => {
    const queryBuilder = orm.query()
      .from('users')
      .select(
        'CASE WHEN age < 25 THEN \'Young\' WHEN age < 50 THEN \'Middle-aged\' ELSE \'Senior\' END as age_group',
        'COUNT(*) as count',
        'AVG(age) as avg_age'
      )
      .where('active', '=', true)
      .groupBy('age_group')
      .orderBy('avg_age', 'ASC');

    const sql = queryBuilder.toSql();
    expect(sql).toContain('SELECT CASE WHEN age < 25 THEN \'Young\' WHEN age < 50 THEN \'Middle-aged\' ELSE \'Senior\' END as age_group');
    expect(sql).toContain('COUNT(*) as count');
    expect(sql).toContain('AVG(age) as avg_age');
    expect(sql).toContain('GROUP BY age_group');
    expect(sql).toContain('ORDER BY avg_age ASC');
  });

  test("should handle WHERE IN conditions", () => {
    const queryBuilder = orm.query()
      .from('users')
      .whereIn('id', [1, 2, 3, 4, 5])
      .whereNotIn('status', ['inactive', 'banned']);

    const sql = queryBuilder.toSql();
    expect(sql).toContain('WHERE id IN ($1, $2, $3, $4, $5) AND status NOT IN ($6, $7)');
  });

  test("should handle WHERE BETWEEN conditions", () => {
    const queryBuilder = orm.query()
      .from('users')
      .whereBetween('age', 18, 65)
      .whereNotBetween('created_at', new Date('2020-01-01'), new Date('2023-01-01'));

    const sql = queryBuilder.toSql();
    expect(sql).toContain('WHERE age BETWEEN $1 AND $2 AND created_at NOT BETWEEN $3 AND $4');
  });

  test("should handle WHERE NULL conditions", () => {
    const queryBuilder = orm.query()
      .from('users')
      .whereNull('deleted_at')
      .whereNotNull('email');

    const sql = queryBuilder.toSql();
    expect(sql).toContain('WHERE deleted_at IS NULL AND email IS NOT NULL');
  });

  test("should reset query builder", () => {
    const queryBuilder = orm.query()
      .from('users')
      .select('id', 'name')
      .where('active', '=', true)
      .orderBy('name', 'ASC')
      .limit(10);

    // Verify query is built
    let sql = queryBuilder.toSql();
    expect(sql).toContain('SELECT id, name');
    expect(sql).toContain('FROM users');

    // Reset and verify it's empty
    queryBuilder.reset();
    sql = queryBuilder.toSql();
    expect(sql).toContain('SELECT *');
    expect(sql).toContain('FROM ');
    expect(sql).not.toContain('WHERE');
    expect(sql).not.toContain('ORDER BY');
    expect(sql).not.toContain('LIMIT');
  });
}); 