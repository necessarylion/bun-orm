import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { QueryBuilder } from "../../src/application/services/query-builder";
import { setupTestDatabase, teardownTestDatabase, testORM, insertTestData, clearTestData, type TestUser, type TestPost } from "../setup";

describe("Application - Query Builder", () => {
  let queryBuilder: QueryBuilder<TestUser>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    await insertTestData();
    queryBuilder = testORM.query<TestUser>();
  });

  describe("Basic Query Operations", () => {
    test("should create a query builder instance", () => {
      expect(queryBuilder).toBeInstanceOf(QueryBuilder);
    });

    test("should set table", () => {
      queryBuilder.from('users');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('FROM users');
    });

    test("should set table with alias", () => {
      queryBuilder.fromAs('users', 'u');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('FROM users AS u');
    });

    test("should select specific columns", () => {
      queryBuilder.from('users').select('id', 'name', 'email');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('SELECT id, name, email');
    });

    test("should select all columns by default", () => {
      queryBuilder.from('users');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('SELECT *');
    });

    test("should add DISTINCT clause", () => {
      queryBuilder.from('users').distinct().select('name');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('SELECT DISTINCT name');
    });
  });

  describe("WHERE Conditions", () => {
    test("should add simple WHERE condition", () => {
      queryBuilder.from('users').where('active', '=', true);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('WHERE active = $1');
    });

    test("should add WHERE IN condition", () => {
      queryBuilder.from('users').whereIn('id', [1, 2, 3]);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('WHERE id IN ($1, $2, $3)');
    });

    test("should add WHERE NOT IN condition", () => {
      queryBuilder.from('users').whereNotIn('status', ['inactive', 'banned']);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('WHERE status NOT IN ($1, $2)');
    });

    test("should add WHERE BETWEEN condition", () => {
      queryBuilder.from('users').whereBetween('age', 18, 65);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('WHERE age BETWEEN $1 AND $2');
    });

    test("should add WHERE NULL condition", () => {
      queryBuilder.from('users').whereNull('deleted_at');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('WHERE deleted_at IS NULL');
    });

    test("should add WHERE NOT NULL condition", () => {
      queryBuilder.from('users').whereNotNull('email');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('WHERE email IS NOT NULL');
    });

    test("should add AND WHERE group", () => {
      queryBuilder.from('users')
        .where('active', '=', true)
        .andWhere(condition => {
          condition.where('age', '>=', 18);
          condition.where('email', 'LIKE', '%@gmail.com');
        });
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('WHERE active = $1 AND (age >= $2 AND email LIKE $3)');
    });

    test("should add OR WHERE group", () => {
      queryBuilder.from('users')
        .where('active', '=', true)
        .orWhere(condition => {
          condition.where('verified', '=', true);
          condition.where('premium', '=', true);
        });
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('WHERE active = $1 OR (verified = $2 AND premium = $3)');
    });
  });

  describe("JOIN Operations", () => {
    test("should add INNER JOIN", () => {
      queryBuilder.from('posts')
        .innerJoin('users', 'posts.user_id = users.id');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('INNER JOIN users ON posts.user_id = users.id');
    });

    test("should add LEFT JOIN", () => {
      queryBuilder.from('posts')
        .leftJoin('categories', 'posts.category_id = categories.id', 'cat');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('LEFT JOIN categories AS cat ON posts.category_id = categories.id');
    });

    test("should add RIGHT JOIN", () => {
      queryBuilder.from('users')
        .rightJoin('profiles', 'users.id = profiles.user_id');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('RIGHT JOIN profiles ON users.id = profiles.user_id');
    });

    test("should add FULL JOIN", () => {
      queryBuilder.from('posts')
        .fullJoin('archived_posts', 'posts.id = archived_posts.post_id');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('FULL JOIN archived_posts ON posts.id = archived_posts.post_id');
    });

    test("should add CROSS JOIN", () => {
      queryBuilder.from('users')
        .crossJoin('numbers', 'n');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('CROSS JOIN numbers AS n');
    });
  });

  describe("ORDER BY Operations", () => {
    test("should add ORDER BY clause", () => {
      queryBuilder.from('users').orderBy('name', 'ASC');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('ORDER BY name ASC');
    });

    test("should add ORDER BY ASC", () => {
      queryBuilder.from('users').orderByAsc('name');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('ORDER BY name ASC');
    });

    test("should add ORDER BY DESC", () => {
      queryBuilder.from('users').orderByDesc('created_at');
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('ORDER BY created_at DESC');
    });

    test("should add multiple ORDER BY clauses", () => {
      queryBuilder.from('users')
        .orderBy('active', 'DESC')
        .orderBy('name', 'ASC');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('ORDER BY active DESC, name ASC');
    });
  });

  describe("GROUP BY and HAVING", () => {
    test("should add GROUP BY clause", () => {
      queryBuilder.from('users')
        .select('age', 'COUNT(*) as count')
        .groupBy('age');
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('GROUP BY age');
    });

    test("should add HAVING clause", () => {
      queryBuilder.from('users')
        .select('age', 'COUNT(*) as count')
        .groupBy('age')
        .having('count', '>', 1);
      
      const sql = queryBuilder.toSql();
      expect(sql).toContain('HAVING count > $1');
    });
  });

  describe("LIMIT and OFFSET", () => {
    test("should add LIMIT clause", () => {
      queryBuilder.from('users').limit(10);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('LIMIT 10');
    });

    test("should add OFFSET clause", () => {
      queryBuilder.from('users').offset(20);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('OFFSET 20');
    });

    test("should add both LIMIT and OFFSET", () => {
      queryBuilder.from('users').limit(10).offset(20);
      const sql = queryBuilder.toSql();
      
      expect(sql).toContain('LIMIT 10 OFFSET 20');
    });
  });

  describe("Query Execution", () => {
    test("should execute query and return results", async () => {
      const result = await queryBuilder
        .from('users')
        .select('id', 'name', 'email')
        .where('active', '=', true)
        .get();
      
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(4); // 4 active users
      expect(result.count).toBe(4);
      expect(result.hasData).toBe(true);
      expect(result.isEmpty).toBe(false);
    });

    test("should return first result", async () => {
      const user = await queryBuilder
        .from('users')
        .where('id', '=', 1)
        .first();
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
      expect(user?.name).toBe("John Doe");
    });

    test("should return null for non-existent first result", async () => {
      const user = await queryBuilder
        .from('users')
        .where('id', '=', 999)
        .first();
      
      expect(user).toBeNull();
    });

    test("should count results", async () => {
      const count = await queryBuilder
        .from('users')
        .where('active', '=', true)
        .count();
      
      expect(count).toBe(4);
    });

    test("should check if exists", async () => {
      const exists = await queryBuilder
        .from('users')
        .where('id', '=', 1)
        .exists();
      
      expect(exists).toBe(true);
    });

    test("should return false when not exists", async () => {
      const exists = await queryBuilder
        .from('users')
        .where('id', '=', 999)
        .exists();
      
      expect(exists).toBe(false);
    });
  });

  describe("Complex Queries", () => {
    test("should build complex query with multiple clauses", async () => {
      const result = await queryBuilder
        .from('users')
        .select('id', 'name', 'email', 'age')
        .where('active', '=', true)
        .andWhere(condition => {
          condition.where('age', '>=', 18);
          condition.where('age', '<=', 65);
        })
        .orderBy('name', 'ASC')
        .limit(10)
        .get();
      
      expect(result.data).toHaveLength(4);
      result.data.forEach(user => {
        expect(user.active).toBe(true);
        expect(user.age).toBeGreaterThanOrEqual(18);
        expect(user.age).toBeLessThanOrEqual(65);
      });
    });

    test("should build query with JOIN", async () => {
      const postQueryBuilder = testORM.query<TestPost & { author_name: string }>();
      
      const result = await postQueryBuilder
        .from('posts')
        .select('posts.id', 'posts.title', 'users.name as author_name')
        .innerJoin('users', 'posts.user_id = users.id')
        .where('posts.published', '=', true)
        .orderBy('posts.created_at', 'DESC')
        .get();
      
      expect(result.data).toHaveLength(4); // 4 published posts
      result.data.forEach(post => {
        expect(post.author_name).toBeDefined();
        expect(post.published).toBe(true);
      });
    });

    test("should build aggregation query", async () => {
      const result = await queryBuilder
        .from('users')
        .select(
          'CASE WHEN age < 25 THEN \'Young\' WHEN age < 50 THEN \'Middle-aged\' ELSE \'Senior\' END as age_group',
          'COUNT(*) as count',
          'AVG(age) as avg_age'
        )
        .where('active', '=', true)
        .groupBy('age_group')
        .orderBy('avg_age', 'ASC')
        .get();
      
      expect(result.data).toHaveLength(2); // Young and Middle-aged groups
      result.data.forEach(group => {
        expect(group.age_group).toBeDefined();
        expect(group.count).toBeGreaterThan(0);
        expect(group.avg_age).toBeGreaterThan(0);
      });
    });
  });

  describe("Query Builder Reset", () => {
    test("should reset query builder", () => {
      queryBuilder
        .from('users')
        .select('id', 'name')
        .where('active', '=', true)
        .orderBy('name', 'ASC')
        .limit(10);
      
      // Verify query is built
      let sql = queryBuilder.toSql();
      expect(sql).toContain('SELECT id, name');
      expect(sql).toContain('FROM users');
      expect(sql).toContain('WHERE active = $1');
      expect(sql).toContain('ORDER BY name ASC');
      expect(sql).toContain('LIMIT 10');
      
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

  describe("Error Handling", () => {
    test("should handle invalid table name", async () => {
      await expect(async () => {
        await queryBuilder
          .from('non_existent_table')
          .get();
      }).rejects.toThrow();
    });

    test("should handle invalid column name", async () => {
      await expect(async () => {
        await queryBuilder
          .from('users')
          .select('non_existent_column')
          .get();
      }).rejects.toThrow();
    });

    test("should handle invalid JOIN condition", async () => {
      await expect(async () => {
        await queryBuilder
          .from('users')
          .innerJoin('posts', 'invalid_join_condition')
          .get();
      }).rejects.toThrow();
    });
  });

  describe("Parameter Binding", () => {
    test("should properly bind string parameters", async () => {
      const result = await queryBuilder
        .from('users')
        .where('name', '=', 'John Doe')
        .get();
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John Doe');
    });

    test("should properly bind number parameters", async () => {
      const result = await queryBuilder
        .from('users')
        .where('age', '=', 25)
        .get();
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].age).toBe(25);
    });

    test("should properly bind boolean parameters", async () => {
      const result = await queryBuilder
        .from('users')
        .where('active', '=', true)
        .get();
      
      expect(result.data).toHaveLength(4);
      result.data.forEach(user => {
        expect(user.active).toBe(true);
      });
    });

    test("should properly bind array parameters", async () => {
      const result = await queryBuilder
        .from('users')
        .whereIn('id', [1, 2, 3])
        .get();
      
      expect(result.data).toHaveLength(3);
      const ids = result.data.map(user => user.id);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
    });
  });
}); 