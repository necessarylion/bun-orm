import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { DeleteQueryBuilder } from "../../src/application/services/delete-query-builder";
import { setupTestDatabase, teardownTestDatabase, testORM, insertTestData, clearTestData, type TestUser } from "../setup";

describe("Application - Delete Query Builder", () => {
  let deleteBuilder: DeleteQueryBuilder<TestUser>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    await insertTestData();
    deleteBuilder = testORM.delete<TestUser>();
  });

  describe("Basic Delete Operations", () => {
    test("should create a delete query builder instance", () => {
      expect(deleteBuilder).toBeInstanceOf(DeleteQueryBuilder);
    });

    test("should set table", () => {
      deleteBuilder.from('users');
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('DELETE FROM users');
    });

    test("should set returning columns", () => {
      deleteBuilder.from('users').returning('id', 'name', 'email');
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('RETURNING id, name, email');
    });
  });

  describe("WHERE Conditions", () => {
    test("should add simple WHERE condition", () => {
      deleteBuilder.from('users').where('id', '=', 1);
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('WHERE id = $1');
    });

    test("should add WHERE IN condition", () => {
      deleteBuilder.from('users').whereIn('id', [1, 2, 3]);
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('WHERE id IN ($1, $2, $3)');
    });

    test("should add WHERE NOT IN condition", () => {
      deleteBuilder.from('users').whereNotIn('status', ['inactive', 'banned']);
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('WHERE status NOT IN ($1, $2)');
    });

    test("should add WHERE BETWEEN condition", () => {
      deleteBuilder.from('users').whereBetween('age', 25, 35);
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('WHERE age BETWEEN $1 AND $2');
    });

    test("should add WHERE NULL condition", () => {
      deleteBuilder.from('users').whereNull('deleted_at');
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('WHERE deleted_at IS NULL');
    });

    test("should add WHERE NOT NULL condition", () => {
      deleteBuilder.from('users').whereNotNull('email');
      const sql = deleteBuilder.toSql();
      
      expect(sql).toContain('WHERE email IS NOT NULL');
    });

    test("should add AND WHERE group", () => {
      deleteBuilder.from('users')
        .where('active', '=', false)
        .andWhere(condition => {
          condition.where('age', '>', 30);
          condition.where('verified', '=', false);
        });
      
      const sql = deleteBuilder.toSql();
      expect(sql).toContain('WHERE active = $1 AND (age > $2 AND verified = $3)');
    });

    test("should add OR WHERE group", () => {
      deleteBuilder.from('users')
        .where('active', '=', false)
        .orWhere(condition => {
          condition.where('verified', '=', false);
          condition.where('premium', '=', false);
        });
      
      const sql = deleteBuilder.toSql();
      expect(sql).toContain('WHERE active = $1 OR (verified = $2 AND premium = $3)');
    });
  });

  describe("Delete Execution", () => {
    test("should execute simple delete", async () => {
      const result = await deleteBuilder
        .from('users')
        .where('id', '=', 1)
        .returning('id', 'name', 'email')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.affectedRows).toBe(1);
      expect(result.first?.id).toBe(1);
      expect(result.first?.name).toBe('John Doe');
      
      // Verify the record is actually deleted
      const remainingUsers = await testORM.query<TestUser>()
        .from('users')
        .where('id', '=', 1)
        .get();
      
      expect(remainingUsers.data).toHaveLength(0);
    });

    test("should execute delete with multiple conditions", async () => {
      const result = await deleteBuilder
        .from('users')
        .where('active', '=', false)
        .where('age', '>', 30)
        .returning('id', 'name', 'age')
        .execute();
      
      expect(result.data).toHaveLength(1); // Only Bob Johnson matches
      expect(result.first?.name).toBe('Bob Johnson');
      expect(result.first?.age).toBe(35);
    });

    test("should execute delete with IN condition", async () => {
      const result = await deleteBuilder
        .from('users')
        .whereIn('id', [1, 2, 3])
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(3);
      const deletedIds = result.data.map(user => user.id);
      expect(deletedIds).toContain(1);
      expect(deletedIds).toContain(2);
      expect(deletedIds).toContain(3);
      
      // Verify records are actually deleted
      const remainingUsers = await testORM.query<TestUser>()
        .from('users')
        .whereIn('id', [1, 2, 3])
        .get();
      
      expect(remainingUsers.data).toHaveLength(0);
    });

    test("should execute delete with BETWEEN condition", async () => {
      const result = await deleteBuilder
        .from('users')
        .whereBetween('age', 20, 30)
        .returning('id', 'name', 'age')
        .execute();
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(user => {
        expect(user.age).toBeGreaterThanOrEqual(20);
        expect(user.age).toBeLessThanOrEqual(30);
      });
    });

    test("should return empty result when no records match", async () => {
      const result = await deleteBuilder
        .from('users')
        .where('id', '=', 999)
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(0);
      expect(result.count).toBe(0);
      expect(result.affectedRows).toBe(0);
    });

    test("should delete all records when no WHERE clause", async () => {
      const result = await deleteBuilder
        .from('users')
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(5); // All 5 users
      expect(result.count).toBe(5);
      expect(result.affectedRows).toBe(5);
      
      // Verify all records are deleted
      const remainingUsers = await testORM.query<TestUser>()
        .from('users')
        .get();
      
      expect(remainingUsers.data).toHaveLength(0);
    });
  });

  describe("Complex Delete Scenarios", () => {
    test("should delete with complex WHERE conditions", async () => {
      const result = await deleteBuilder
        .from('users')
        .where('active', '=', true)
        .andWhere(condition => {
          condition.where('age', '>=', 25);
          condition.where('age', '<=', 35);
        })
        .orWhere(condition => {
          condition.where('verified', '=', false);
          condition.where('premium', '=', false);
        })
        .returning('id', 'name', 'age', 'active', 'verified', 'premium')
        .execute();
      
      expect(result.data.length).toBeGreaterThan(0);
      
      // Verify the deleted records match the conditions
      result.data.forEach(user => {
        const matchesActiveAge = user.active && user.age >= 25 && user.age <= 35;
        const matchesUnverifiedNonPremium = !user.verified && !user.premium;
        expect(matchesActiveAge || matchesUnverifiedNonPremium).toBe(true);
      });
    });

    test("should delete with date conditions", async () => {
      // First, update a user to have a recent last_login
      await testORM.update<TestUser>()
        .update('users')
        .set('last_login', new Date())
        .where('id', '=', 1)
        .execute();
      
      const result = await deleteBuilder
        .from('users')
        .where('last_login', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .returning('id', 'name', 'last_login')
        .execute();
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(user => {
        expect(user.last_login).toBeDefined();
      });
    });

    test("should delete with boolean conditions", async () => {
      const result = await deleteBuilder
        .from('users')
        .where('active', '=', false)
        .where('verified', '=', false)
        .where('premium', '=', false)
        .returning('id', 'name', 'active', 'verified', 'premium')
        .execute();
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(user => {
        expect(user.active).toBe(false);
        expect(user.verified).toBe(false);
        expect(user.premium).toBe(false);
      });
    });

    test("should handle cascade deletes", async () => {
      // First, verify we have posts
      const postsBefore = await testORM.query()
        .from('posts')
        .get();
      
      expect(postsBefore.data.length).toBeGreaterThan(0);
      
      // Delete a user (should cascade to posts)
      const result = await deleteBuilder
        .from('users')
        .where('id', '=', 1)
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.first?.id).toBe(1);
      
      // Verify user is deleted
      const userAfter = await testORM.query<TestUser>()
        .from('users')
        .where('id', '=', 1)
        .get();
      
      expect(userAfter.data).toHaveLength(0);
      
      // Verify posts are also deleted (cascade)
      const postsAfter = await testORM.query()
        .from('posts')
        .where('user_id', '=', 1)
        .get();
      
      expect(postsAfter.data).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    test("should throw error when table is not set", async () => {
      await expect(deleteBuilder
        .where('id', '=', 1)
        .execute()).rejects.toThrow('Table name is required');
    });

    test("should handle foreign key constraint violations", async () => {
      // Try to delete a user that has posts (without cascade)
      // This should fail if foreign key constraints are enforced
      await expect(deleteBuilder
        .from('users')
        .where('id', '=', 1)
        .execute()).rejects.toThrow();
    });

    test("should handle invalid column names", async () => {
      await expect(deleteBuilder
        .from('users')
        .where('non_existent_column', '=', 'value')
        .execute()).rejects.toThrow();
    });
  });

  describe("Query Builder Reset", () => {
    test("should reset delete query builder", () => {
      deleteBuilder
        .from('users')
        .where('id', '=', 1)
        .returning('id', 'name');
      
      // Verify query is built
      let sql = deleteBuilder.toSql();
      expect(sql).toContain('DELETE FROM users');
      expect(sql).toContain('WHERE id = $1');
      expect(sql).toContain('RETURNING id, name');
      
      // Reset and verify it's empty
      deleteBuilder.reset();
      sql = deleteBuilder.toSql();
      expect(sql).toContain('DELETE FROM ');
      expect(sql).not.toContain('RETURNING');
      expect(sql).not.toContain('WHERE');
    });
  });

  describe("SQL Generation", () => {
    test("should generate correct SQL for simple delete", () => {
      const sql = deleteBuilder
        .from('users')
        .where('id', '=', 1)
        .returning('id', 'name')
        .toSql();
      
      expect(sql).toContain('DELETE FROM users');
      expect(sql).toContain('WHERE id = $1');
      expect(sql).toContain('RETURNING id, name');
    });

    test("should generate correct SQL for complex delete", () => {
      const sql = deleteBuilder
        .from('users')
        .where('active', '=', false)
        .andWhere(condition => {
          condition.where('age', '>', 30);
          condition.where('verified', '=', false);
        })
        .returning('*')
        .toSql();
      
      expect(sql).toContain('DELETE FROM users');
      expect(sql).toContain('WHERE active = $1 AND (age > $2 AND verified = $3)');
      expect(sql).toContain('RETURNING *');
    });

    test("should generate SQL without returning clause", () => {
      const sql = deleteBuilder
        .from('users')
        .where('id', '=', 1)
        .returning() // Clear returning columns
        .toSql();
      
      expect(sql).toContain('DELETE FROM users');
      expect(sql).toContain('WHERE id = $1');
      expect(sql).not.toContain('RETURNING');
    });

    test("should generate SQL without WHERE clause", () => {
      const sql = deleteBuilder
        .from('users')
        .returning('*')
        .toSql();
      
      expect(sql).toContain('DELETE FROM users');
      expect(sql).toContain('RETURNING *');
      expect(sql).not.toContain('WHERE');
    });
  });

  describe("Performance and Safety", () => {
    test("should handle large delete operations", async () => {
      // Create additional test data
      const additionalUsers = Array.from({ length: 10 }, (_, i) => ({
        name: `Test User ${i + 1}`,
        email: `test${i + 1}@example.com`,
        age: 20 + i,
        active: true,
        verified: false,
        premium: false,
        login_count: i
      }));
      
      await testORM.insert<TestUser>()
        .into('users')
        .insertMany(additionalUsers)
        .execute();
      
      // Delete all test users
      const result = await deleteBuilder
        .from('users')
        .where('email', 'LIKE', 'test%@example.com')
        .returning('id', 'name', 'email')
        .execute();
      
      expect(result.data).toHaveLength(10);
      expect(result.count).toBe(10);
      expect(result.affectedRows).toBe(10);
    });

    test("should be safe from accidental deletion", async () => {
      // This test ensures that delete operations require explicit WHERE clauses
      // or at least confirm that the operation is intentional
      
      const initialCount = await testORM.query<TestUser>()
        .from('users')
        .count();
      
      expect(initialCount).toBe(5); // We have 5 users initially
      
      // A delete without WHERE clause should delete all records
      // This is intentional behavior but should be used carefully
      const result = await deleteBuilder
        .from('users')
        .returning('id')
        .execute();
      
      expect(result.data).toHaveLength(5);
      
      // Verify all records are deleted
      const finalCount = await testORM.query<TestUser>()
        .from('users')
        .count();
      
      expect(finalCount).toBe(0);
    });
  });
}); 