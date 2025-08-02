import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { InsertQueryBuilder } from "../../src/application/services/insert-query-builder";
import { setupTestDatabase, teardownTestDatabase, testORM, clearTestData, type TestUser, type TestPost } from "../setup";

describe("Application - Insert Query Builder", () => {
  let insertBuilder: InsertQueryBuilder<TestUser>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    insertBuilder = testORM.insert<TestUser>();
  });

  describe("Basic Insert Operations", () => {
    test("should create an insert query builder instance", () => {
      expect(insertBuilder).toBeInstanceOf(InsertQueryBuilder);
    });

    test("should set table", () => {
      insertBuilder.into('users');
      const sql = insertBuilder.toSql();
      
      expect(sql).toContain('INSERT INTO users');
    });

    test("should set columns", () => {
      insertBuilder.into('users').columns('name', 'email', 'age');
      const sql = insertBuilder.toSql();
      
      expect(sql).toContain('(name, email, age)');
    });

    test("should add single row values", () => {
      insertBuilder.into('users').values('John Doe', 'john@example.com', 25);
      const sql = insertBuilder.toSql();
      
      expect(sql).toContain('VALUES ($1, $2, $3)');
    });

    test("should add multiple row values", () => {
      insertBuilder.into('users')
        .values('John Doe', 'john@example.com', 25)
        .values('Jane Smith', 'jane@example.com', 30);
      
      const sql = insertBuilder.toSql();
      expect(sql).toContain('VALUES ($1, $2, $3), ($4, $5, $6)');
    });

    test("should add values batch", () => {
      const valuesArray = [
        ['John Doe', 'john@example.com', 25],
        ['Jane Smith', 'jane@example.com', 30],
        ['Bob Johnson', 'bob@example.com', 35]
      ];
      
      insertBuilder.into('users').valuesBatch(valuesArray);
      const sql = insertBuilder.toSql();
      
      expect(sql).toContain('VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)');
    });

    test("should insert single object", () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true,
        verified: false,
        premium: false,
        login_count: 0
      };
      
      insertBuilder.into('users').insert(userData);
      const sql = insertBuilder.toSql();
      
      expect(sql).toContain('(name, email, age, active, verified, premium, login_count)');
      expect(sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7)');
    });

    test("should insert multiple objects", () => {
      const usersData = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          age: 30,
          active: true,
          verified: true,
          premium: false,
          login_count: 5
        }
      ];
      
      insertBuilder.into('users').insertMany(usersData);
      const sql = insertBuilder.toSql();
      
      expect(sql).toContain('(name, email, age, active, verified, premium, login_count)');
      expect(sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)');
    });

    test("should set returning columns", () => {
      insertBuilder.into('users')
        .insert({ name: 'John Doe', email: 'john@example.com', age: 25 })
        .returning('id', 'name', 'email');
      
      const sql = insertBuilder.toSql();
      expect(sql).toContain('RETURNING id, name, email');
    });
  });

  describe("Insert Execution", () => {
    test("should execute single insert", async () => {
      const result = await insertBuilder
        .into('users')
        .insert({
          name: 'Test User',
          email: 'test@example.com',
          age: 25,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        })
        .returning('id', 'name', 'email')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.affectedRows).toBe(1);
      expect(result.first?.name).toBe('Test User');
      expect(result.first?.email).toBe('test@example.com');
      expect(result.first?.id).toBeDefined();
    });

    test("should execute bulk insert", async () => {
      const usersData = [
        {
          name: 'User 1',
          email: 'user1@example.com',
          age: 25,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        },
        {
          name: 'User 2',
          email: 'user2@example.com',
          age: 30,
          active: true,
          verified: true,
          premium: false,
          login_count: 5
        },
        {
          name: 'User 3',
          email: 'user3@example.com',
          age: 35,
          active: false,
          verified: false,
          premium: false,
          login_count: 1
        }
      ];
      
      const result = await insertBuilder
        .into('users')
        .insertMany(usersData)
        .returning('id', 'name', 'email')
        .execute();
      
      expect(result.data).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.affectedRows).toBe(3);
      expect(result.data[0].name).toBe('User 1');
      expect(result.data[1].name).toBe('User 2');
      expect(result.data[2].name).toBe('User 3');
    });

    test("should execute insert with specific columns", async () => {
      const result = await insertBuilder
        .into('users')
        .columns('name', 'email', 'age', 'active')
        .values('John Doe', 'john@example.com', 25, true)
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.first?.name).toBe('John Doe');
      expect(result.first?.id).toBeDefined();
    });

    test("should execute insert with values batch", async () => {
      const valuesArray = [
        ['John Doe', 'john@example.com', 25, true],
        ['Jane Smith', 'jane@example.com', 30, true],
        ['Bob Johnson', 'bob@example.com', 35, false]
      ];
      
      const result = await insertBuilder
        .into('users')
        .columns('name', 'email', 'age', 'active')
        .valuesBatch(valuesArray)
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.affectedRows).toBe(3);
    });
  });

  describe("Error Handling", () => {
    test("should throw error when table is not set", async () => {
      await expect(insertBuilder
        .insert({ name: 'John Doe', email: 'john@example.com', age: 25 })
        .execute()
      ).rejects.toThrow('Table name is required');
    });

    test("should throw error when no values are provided", async () => {
      await expect(insertBuilder
        .into('users')
        .execute()
      ).rejects.toThrow('No values to insert');
    });

    test("should throw error when column count doesn't match value count", () => {
      expect(() => {
        insertBuilder
          .into('users')
          .columns('name', 'email', 'age')
          .values('John Doe', 'john@example.com'); // Missing age value
      }).toThrow('Expected 3 values, got 2');
    });

    test("should handle constraint violations", async () => {
      // First insert
      await insertBuilder
        .into('users')
        .insert({
          name: 'Duplicate User',
          email: 'duplicate@example.com',
          age: 25,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        })
        .execute();
      
      // Try to insert with same email (should fail due to unique constraint)
      await expect(insertBuilder
        .into('users')
        .insert({
          name: 'Another Duplicate',
          email: 'duplicate@example.com', // Same email
          age: 30,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        })
        .execute()
      ).rejects.toThrow();
    });
  });

  describe("Query Builder Reset", () => {
    test("should reset insert query builder", () => {
      insertBuilder
        .into('users')
        .columns('name', 'email')
        .values('John Doe', 'john@example.com')
        .returning('id', 'name');
      
      // Verify query is built
      let sql = insertBuilder.toSql();
      expect(sql).toContain('INSERT INTO users');
      expect(sql).toContain('(name, email)');
      expect(sql).toContain('VALUES ($1, $2)');
      expect(sql).toContain('RETURNING id, name');
      
      // Reset and verify it's empty
      insertBuilder.reset();
      sql = insertBuilder.toSql();
      expect(sql).toContain('INSERT INTO ');
      expect(sql).toContain('VALUES ()');
      expect(sql).not.toContain('RETURNING');
    });
  });

  describe("Complex Scenarios", () => {
    test("should handle mixed data types", async () => {
      const result = await insertBuilder
        .into('users')
        .insert({
          name: 'Mixed Types User',
          email: 'mixed@example.com',
          age: 25,
          active: true,
          verified: false,
          premium: true,
          login_count: 42
        })
        .returning('*')
        .execute();
      
      expect(result.data).toHaveLength(1);
      const user = result.first;
      expect(user?.name).toBe('Mixed Types User');
      expect(user?.age).toBe(25);
      expect(user?.active).toBe(true);
      expect(user?.verified).toBe(false);
      expect(user?.premium).toBe(true);
      expect(user?.login_count).toBe(42);
    });

    test("should handle large batch inserts", async () => {
      const largeBatch = Array.from({ length: 10 }, (_, i) => ({
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + i,
        active: i % 2 === 0, // Alternate active status
        verified: i % 3 === 0, // Every third user verified
        premium: i % 4 === 0, // Every fourth user premium
        login_count: i * 5
      }));
      
      const result = await insertBuilder
        .into('users')
        .insertMany(largeBatch)
        .returning('id', 'name', 'email')
        .execute();
      
      expect(result.data).toHaveLength(10);
      expect(result.count).toBe(10);
      expect(result.affectedRows).toBe(10);
      
      // Verify some specific values
      expect(result.data[0].name).toBe('User 1');
      expect(result.data[9].name).toBe('User 10');
    });

    test("should work with post insert", async () => {
      const postInsertBuilder = testORM.insert<TestPost>();
      
      // First insert a user
      const userResult = await insertBuilder
        .into('users')
        .insert({
          name: 'Post Author',
          email: 'author@example.com',
          age: 28,
          active: true,
          verified: true,
          premium: false,
          login_count: 0
        })
        .returning('id')
        .execute();
      
      const userId = userResult.first?.id;
      expect(userId).toBeDefined();
      
      // Then insert a post for that user
      const postResult = await postInsertBuilder
        .into('posts')
        .insert({
          title: 'My First Post',
          content: 'This is my first post!',
          user_id: userId!,
          published: true
        })
        .returning('id', 'title', 'user_id')
        .execute();
      
      expect(postResult.data).toHaveLength(1);
      expect(postResult.first?.title).toBe('My First Post');
      expect(postResult.first?.user_id).toBe(userId);
    });
  });

  describe("SQL Generation", () => {
    test("should generate correct SQL for single insert", () => {
      const sql = insertBuilder
        .into('users')
        .insert({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25
        })
        .returning('id', 'name')
        .toSql();
      
      expect(sql).toContain('INSERT INTO users (name, email, age)');
      expect(sql).toContain('VALUES ($1, $2, $3)');
      expect(sql).toContain('RETURNING id, name');
    });

    test("should generate correct SQL for bulk insert", () => {
      const sql = insertBuilder
        .into('users')
        .insertMany([
          { name: 'User 1', email: 'user1@example.com', age: 25 },
          { name: 'User 2', email: 'user2@example.com', age: 30 }
        ])
        .returning('*')
        .toSql();
      
      expect(sql).toContain('INSERT INTO users (name, email, age)');
      expect(sql).toContain('VALUES ($1, $2, $3), ($4, $5, $6)');
      expect(sql).toContain('RETURNING *');
    });

    test("should generate SQL without returning clause", () => {
      const sql = insertBuilder
        .into('users')
        .insert({ name: 'John Doe', email: 'john@example.com', age: 25 })
        .toSql();
      
      expect(sql).toContain('INSERT INTO users (name, email, age)');
      expect(sql).toContain('VALUES ($1, $2, $3)');
      expect(sql).not.toContain('RETURNING');
    });
  });
}); 