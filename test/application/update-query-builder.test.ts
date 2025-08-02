import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { UpdateQueryBuilder } from "../../src/application/services/update-query-builder";
import { setupTestDatabase, teardownTestDatabase, testORM, insertTestData, clearTestData, type TestUser } from "../setup";

describe("Application - Update Query Builder", () => {
  let updateBuilder: UpdateQueryBuilder<TestUser>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    await insertTestData();
    updateBuilder = testORM.update<TestUser>();
  });

  describe("Basic Update Operations", () => {
    test("should create an update query builder instance", () => {
      expect(updateBuilder).toBeInstanceOf(UpdateQueryBuilder);
    });

    test("should set table", () => {
      updateBuilder.update('users');
      const sql = updateBuilder.toSql();
      
      expect(sql).toContain('UPDATE users');
    });

    test("should set single column value", () => {
      updateBuilder.update('users').set('name', 'Updated Name');
      const sql = updateBuilder.toSql();
      
      expect(sql).toContain('SET name = $1');
    });

    test("should set multiple column values", () => {
      updateBuilder.update('users')
        .set('name', 'Updated Name')
        .set('email', 'updated@example.com')
        .set('age', 30);
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('SET name = $1, email = $2, age = $3');
    });

    test("should set multiple values at once", () => {
      updateBuilder.update('users').setMany({
        name: 'Updated Name',
        email: 'updated@example.com',
        age: 30,
        active: false
      });
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('SET name = $1, email = $2, age = $3, active = $4');
    });

    test("should increment numeric column", () => {
      updateBuilder.update('users').increment('login_count', 5);
      const sql = updateBuilder.toSql();
      
      expect(sql).toContain('SET login_count = $login_count + 5');
    });

    test("should decrement numeric column", () => {
      updateBuilder.update('users').decrement('login_count', 2);
      const sql = updateBuilder.toSql();
      
      expect(sql).toContain('SET login_count = $login_count - 2');
    });

    test("should set returning columns", () => {
      updateBuilder.update('users')
        .set('name', 'Updated Name')
        .returning('id', 'name', 'email');
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('RETURNING id, name, email');
    });
  });

  describe("WHERE Conditions", () => {
    test("should add simple WHERE condition", () => {
      updateBuilder.update('users')
        .set('active', false)
        .where('id', '=', 1);
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE id = $2');
    });

    test("should add WHERE IN condition", () => {
      updateBuilder.update('users')
        .set('active', false)
        .whereIn('id', [1, 2, 3]);
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE id IN ($2, $3, $4)');
    });

    test("should add WHERE NOT IN condition", () => {
      updateBuilder.update('users')
        .set('active', false)
        .whereNotIn('status', ['inactive', 'banned']);
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE status NOT IN ($2, $3)');
    });

    test("should add WHERE BETWEEN condition", () => {
      updateBuilder.update('users')
        .set('premium', true)
        .whereBetween('age', 25, 35);
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE age BETWEEN $2 AND $3');
    });

    test("should add WHERE NULL condition", () => {
      updateBuilder.update('users')
        .set('last_login', new Date())
        .whereNull('last_login');
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE last_login IS NULL');
    });

    test("should add WHERE NOT NULL condition", () => {
      updateBuilder.update('users')
        .set('verified', true)
        .whereNotNull('email');
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE email IS NOT NULL');
    });

    test("should add AND WHERE group", () => {
      updateBuilder.update('users')
        .set('active', false)
        .where('age', '>', 30)
        .andWhere(condition => {
          condition.where('verified', '=', false);
          condition.where('premium', '=', false);
        });
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE age > $2 AND (verified = $3 AND premium = $4)');
    });

    test("should add OR WHERE group", () => {
      updateBuilder.update('users')
        .set('active', false)
        .where('age', '>', 30)
        .orWhere(condition => {
          condition.where('verified', '=', false);
          condition.where('premium', '=', false);
        });
      
      const sql = updateBuilder.toSql();
      expect(sql).toContain('WHERE age > $2 OR (verified = $3 AND premium = $4)');
    });
  });

  describe("Update Execution", () => {
    test("should execute simple update", async () => {
      const result = await updateBuilder
        .update('users')
        .set('name', 'Updated John Doe')
        .where('id', '=', 1)
        .returning('id', 'name', 'email')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.affectedRows).toBe(1);
      expect(result.first?.name).toBe('Updated John Doe');
      expect(result.first?.id).toBe(1);
    });

    test("should execute update with multiple columns", async () => {
      const result = await updateBuilder
        .update('users')
        .setMany({
          name: 'Updated User',
          email: 'updated@example.com',
          age: 30,
          active: false
        })
        .where('id', '=', 1)
        .returning('*')
        .execute();
      
      expect(result.data).toHaveLength(1);
      const user = result.first;
      expect(user?.name).toBe('Updated User');
      expect(user?.email).toBe('updated@example.com');
      expect(user?.age).toBe(30);
      expect(user?.active).toBe(false);
    });

    test("should execute update with WHERE conditions", async () => {
      const result = await updateBuilder
        .update('users')
        .set('active', false)
        .where('age', '>', 30)
        .returning('id', 'name', 'age')
        .execute();
      
      expect(result.data).toHaveLength(1); // Only Bob Johnson is over 30
      expect(result.first?.name).toBe('Bob Johnson');
      expect(result.first?.age).toBe(35);
      expect(result.first?.active).toBe(false);
    });

    test("should execute update with IN condition", async () => {
      const result = await updateBuilder
        .update('users')
        .set('premium', true)
        .whereIn('id', [1, 2, 3])
        .returning('id', 'name', 'premium')
        .execute();
      
      expect(result.data).toHaveLength(3);
      result.data.forEach(user => {
        expect(user.premium).toBe(true);
      });
    });

    test("should return empty result when no records match", async () => {
      const result = await updateBuilder
        .update('users')
        .set('active', false)
        .where('id', '=', 999)
        .returning('id', 'name')
        .execute();
      
      expect(result.data).toHaveLength(0);
      expect(result.count).toBe(0);
      expect(result.affectedRows).toBe(0);
    });

    test("should execute increment operation", async () => {
      // First get current login count
      const currentUser = await testORM.query<TestUser>()
        .from('users')
        .where('id', '=', 1)
        .first();
      
      const currentLoginCount = currentUser?.login_count || 0;
      
      const result = await updateBuilder
        .update('users')
        .increment('login_count', 3)
        .where('id', '=', 1)
        .returning('id', 'login_count')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.first?.login_count).toBe(currentLoginCount + 3);
    });

    test("should execute decrement operation", async () => {
      // First get current login count
      const currentUser = await testORM.query<TestUser>()
        .from('users')
        .where('id', '=', 1)
        .first();
      
      const currentLoginCount = currentUser?.login_count || 0;
      
      const result = await updateBuilder
        .update('users')
        .decrement('login_count', 1)
        .where('id', '=', 1)
        .returning('id', 'login_count')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.first?.login_count).toBe(currentLoginCount - 1);
    });
  });

  describe("Complex Update Scenarios", () => {
    test("should update multiple records with complex conditions", async () => {
      const result = await updateBuilder
        .update('users')
        .setMany({
          verified: true,
          premium: true
        })
        .where('active', '=', true)
        .andWhere(condition => {
          condition.where('age', '>=', 25);
          condition.where('age', '<=', 35);
        })
        .returning('id', 'name', 'verified', 'premium')
        .execute();
      
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(user => {
        expect(user.verified).toBe(true);
        expect(user.premium).toBe(true);
      });
    });

    test("should update with date values", async () => {
      const now = new Date();
      
      const result = await updateBuilder
        .update('users')
        .set('last_login', now)
        .where('id', '=', 1)
        .returning('id', 'last_login')
        .execute();
      
      expect(result.data).toHaveLength(1);
      expect(result.first?.last_login).toBeDefined();
    });

    test("should update with boolean values", async () => {
      const result = await updateBuilder
        .update('users')
        .setMany({
          active: false,
          verified: true,
          premium: false
        })
        .where('id', '=', 1)
        .returning('id', 'active', 'verified', 'premium')
        .execute();
      
      expect(result.data).toHaveLength(1);
      const user = result.first;
      expect(user?.active).toBe(false);
      expect(user?.verified).toBe(true);
      expect(user?.premium).toBe(false);
    });

    test("should handle mixed data types in update", async () => {
      const result = await updateBuilder
        .update('users')
        .setMany({
          name: 'Mixed Types User',
          age: 42,
          active: true,
          login_count: 100,
          last_login: new Date()
        })
        .where('id', '=', 1)
        .returning('*')
        .execute();
      
      expect(result.data).toHaveLength(1);
      const user = result.first;
      expect(user?.name).toBe('Mixed Types User');
      expect(user?.age).toBe(42);
      expect(user?.active).toBe(true);
      expect(user?.login_count).toBe(100);
      expect(user?.last_login).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("should throw error when table is not set", async () => {
      await expect(updateBuilder
        .set('name', 'Updated Name')
        .execute()).rejects.toThrow('Table name is required');
    });

    test("should throw error when no values are set", async () => {
      await expect(updateBuilder
        .update('users')
        .where('id', '=', 1)
        .execute()).rejects.toThrow('No values to update');
    });

    test("should handle constraint violations", async () => {
      // Try to update email to one that already exists
      await expect(updateBuilder
        .update('users')
        .set('email', 'jane@example.com') // Already exists for user 2
        .where('id', '=', 1)
        .execute()).rejects.toThrow();
    });

    test("should handle invalid column names", async () => {
      await expect(updateBuilder
        .update('users')
        .set('non_existent_column', 'value')
        .where('id', '=', 1)
        .execute()).rejects.toThrow();
    });
  });

  describe("Query Builder Reset", () => {
    test("should reset update query builder", () => {
      updateBuilder
        .update('users')
        .set('name', 'Updated Name')
        .set('email', 'updated@example.com')
        .where('id', '=', 1)
        .returning('id', 'name');
      
      // Verify query is built
      let sql = updateBuilder.toSql();
      expect(sql).toContain('UPDATE users');
      expect(sql).toContain('SET name = $1, email = $2');
      expect(sql).toContain('WHERE id = $3');
      expect(sql).toContain('RETURNING id, name');
      
      // Reset and verify it's empty
      updateBuilder.reset();
      sql = updateBuilder.toSql();
      expect(sql).toContain('UPDATE ');
      expect(sql).toContain('SET ');
      expect(sql).not.toContain('RETURNING');
    });
  });

  describe("SQL Generation", () => {
    test("should generate correct SQL for simple update", () => {
      const sql = updateBuilder
        .update('users')
        .set('name', 'Updated Name')
        .where('id', '=', 1)
        .returning('id', 'name')
        .toSql();
      
      expect(sql).toContain('UPDATE users');
      expect(sql).toContain('SET name = $1');
      expect(sql).toContain('WHERE id = $2');
      expect(sql).toContain('RETURNING id, name');
    });

    test("should generate correct SQL for multiple column update", () => {
      const sql = updateBuilder
        .update('users')
        .setMany({
          name: 'Updated Name',
          email: 'updated@example.com',
          age: 30
        })
        .where('id', '=', 1)
        .returning('*')
        .toSql();
      
      expect(sql).toContain('UPDATE users');
      expect(sql).toContain('SET name = $1, email = $2, age = $3');
      expect(sql).toContain('WHERE id = $4');
      expect(sql).toContain('RETURNING *');
    });

    test("should generate SQL without returning clause", () => {
      const sql = updateBuilder
        .update('users')
        .set('name', 'Updated Name')
        .where('id', '=', 1)
        .returning() // Clear returning columns
        .toSql();
      
      expect(sql).toContain('UPDATE users');
      expect(sql).toContain('SET name = $1');
      expect(sql).toContain('WHERE id = $2');
      expect(sql).not.toContain('RETURNING');
    });

    test("should generate SQL with increment/decrement", () => {
      const sql = updateBuilder
        .update('users')
        .increment('login_count', 5)
        .decrement('age', 1)
        .where('id', '=', 1)
        .toSql();
      
      expect(sql).toContain('UPDATE users');
      expect(sql).toContain('SET login_count = $login_count + 5, age = $age - 1');
      expect(sql).toContain('WHERE id = $1');
    });
  });
}); 