import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db, setupTestTables, cleanupTestData, insertTestData } from './setup';

describe('UPDATE Query Builder', () => {
  beforeAll(async () => {
    await setupTestTables();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await insertTestData();
  });

  afterAll(async () => {
    // Connection is shared across tests, don't close here
  });

  it('should update a single record', async () => {
    const updateData = {
      name: 'Updated Name',
      age: 31
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .returning(['id', 'name', 'age', 'email'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('Updated Name');
    expect(result[0].age).toBe(31);
    expect(result[0].email).toBe('john@example.com'); // Should remain unchanged

    // Verify the update in database
    const updatedUser = await db.select().from('users').where('id', '=', 1).first();
    expect(updatedUser.name).toBe('Updated Name');
    expect(updatedUser.age).toBe(31);
  });

  it('should update multiple records', async () => {
    const updateData = {
      active: false
    };

    const result = await db.update(updateData)
      .table('users')
      .where('age', '>', 25)
      .returning(['id', 'name', 'active'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(3); // 3 users with age > 25
    expect(result.every(user => user.active === false)).toBe(true);

    // Verify all matching records were updated
    const updatedUsers = await db.select().from('users').where('age', '>', 25).get();
    expect(updatedUsers.every(user => user.active === false)).toBe(true);
  });

  it('should update with WHERE IN clause', async () => {
    const updateData = {
      age: 40
    };

    const result = await db.update(updateData)
      .table('users')
      .whereIn('id', [1, 2, 3])
      .returning(['id', 'name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(3);
    expect(result.every(user => user.age === 40)).toBe(true);
  });

  it('should update with WHERE NULL clause', async () => {
    // First insert a user with null age
    await db.insert({ name: 'Null Age User', email: 'nullage@example.com', age: null }).into('users').execute();

    const updateData = {
      age: 25
    };

    const result = await db.update(updateData)
      .table('users')
      .whereNull('age')
      .returning(['id', 'name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].age).toBe(25);
  });

  it('should update with WHERE NOT NULL clause', async () => {
    const updateData = {
      age: 50
    };

    const result = await db.update(updateData)
      .table('users')
      .whereNotNull('age')
      .returning(['id', 'name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(4);
    expect(result.every(user => user.age === 50)).toBe(true);
  });

  it('should update without returning clause', async () => {
    const updateData = {
      name: 'No Return Update'
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(0); // No returning clause

    // Verify the update happened
    const updatedUser = await db.select().from('users').where('id', '=', 1).first();
    expect(updatedUser.name).toBe('No Return Update');
  });

  it('should update with all returning columns', async () => {
    const updateData = {
      name: 'All Return Update',
      email: 'allreturn@example.com'
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .returning()
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('email');
    expect(result[0]).toHaveProperty('age');
    expect(result[0]).toHaveProperty('active');
    expect(result[0]).toHaveProperty('created_at');
    expect(result[0].name).toBe('All Return Update');
    expect(result[0].email).toBe('allreturn@example.com');
  });

  it('should update with specific returning columns', async () => {
    const updateData = {
      name: 'Specific Return Update',
      age: 35
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .returning(['name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('age');
    expect(result[0]).not.toHaveProperty('id');
    expect(result[0]).not.toHaveProperty('email');
    expect(result[0].name).toBe('Specific Return Update');
    expect(result[0].age).toBe(35);
  });

  it('should handle null values in update', async () => {
    const updateData = {
      age: null
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .returning(['id', 'name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].age).toBeNull();
  });

  it('should build raw query', async () => {
    const updateData = {
      name: 'Raw Query Update',
      age: 42
    };

    const query = db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .returning(['id', 'name'])
      .raw();

    expect(query).toHaveProperty('sql');
    expect(query).toHaveProperty('params');
    expect(query.sql).toContain('UPDATE');
    expect(query.sql).toContain('SET');
    expect(query.sql).toContain('WHERE');
    expect(query.sql).toContain('RETURNING');
    expect(query.params).toContain('Raw Query Update');
    expect(query.params).toContain(42);
  });

  it('should handle update with constructor data', async () => {
    const updateData = {
      name: 'Constructor Update',
      email: 'constructor@example.com'
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 1)
      .returning(['id', 'name', 'email'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Constructor Update');
    expect(result[0].email).toBe('constructor@example.com');
  });

  it('should update with multiple conditions', async () => {
    const updateData = {
      active: false
    };

    const result = await db.update(updateData)
      .table('users')
      .where('active', '=', true)
      .where('age', '>', 25)
      .returning(['id', 'name', 'active'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(2); // 2 users that are active and age > 25
    expect(result.every(user => user.active === false)).toBe(true);
  });

  it('should not update when no records match', async () => {
    const updateData = {
      name: 'No Match Update'
    };

    const result = await db.update(updateData)
      .table('users')
      .where('id', '=', 999)
      .returning(['id', 'name'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(0);
  });
}); 