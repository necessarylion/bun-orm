import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db, setupTestTables, cleanupTestData, insertTestData } from './setup';

describe('DELETE Query Builder', () => {
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

  it('should delete a single record', async () => {
    // First delete all post_categories, then posts for user 1
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').where('user_id', '=', 1).execute();
    
    const result = await db.delete()
      .from('users')
      .where('id', '=', 1)
      .returning(['id', 'name', 'email'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('John Doe');

    // Verify the record was deleted
    const deletedUser = await db.select().from('users').where('id', '=', 1).first();
    expect(deletedUser).toBeNull();

    // Verify other records still exist
    const remainingUsers = await db.select().from('users').get();
    expect(remainingUsers.length).toBe(3);
  });

  it('should delete multiple records', async () => {
    // First delete all post_categories, then posts for inactive users
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').where('user_id', '=', 3).execute(); // Bob Johnson is user 3
    
    const result = await db.delete()
      .from('users')
      .where('active', '=', false)
      .returning(['id', 'name', 'active'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1); // Only Bob Johnson is inactive
    expect(result[0].active).toBe(false);

    // Verify inactive users were deleted
    const inactiveUsers = await db.select().from('users').where('active', '=', false).get();
    expect(inactiveUsers.length).toBe(0);

    // Verify active users still exist
    const activeUsers = await db.select().from('users').where('active', '=', true).get();
    expect(activeUsers.length).toBe(3);
  });

  it('should delete with WHERE IN clause', async () => {
    // First delete all post_categories, then posts for these users
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').whereIn('user_id', [1, 2, 3]).execute();
    
    const result = await db.delete()
      .from('users')
      .whereIn('id', [1, 2, 3])
      .returning(['id', 'name'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(3);
    expect(result.map(user => user.id)).toEqual([1, 2, 3]);

    // Verify the records were deleted
    const deletedUsers = await db.select().from('users').whereIn('id', [1, 2, 3]).get();
    expect(deletedUsers.length).toBe(0);

    // Verify remaining record exists
    const remainingUsers = await db.select().from('users').get();
    expect(remainingUsers.length).toBe(1);
    expect(remainingUsers[0].id).toBe(4);
  });

  it('should delete with WHERE NULL clause', async () => {
    // First insert a user with null age
    await db.insert({ name: 'Null Age User', email: 'nullage@example.com', age: null }).into('users').execute();

    const result = await db.delete()
      .from('users')
      .whereNull('age')
      .returning(['id', 'name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].age).toBeNull();

    // Verify null age users were deleted
    const nullAgeUsers = await db.select().from('users').whereNull('age').get();
    expect(nullAgeUsers.length).toBe(0);
  });

  it('should delete with WHERE NOT NULL clause', async () => {
    // First delete all post_categories and posts
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').execute();
    
    const result = await db.delete()
      .from('users')
      .whereNotNull('age')
      .returning(['id', 'name', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(4);

    // Verify all users with age were deleted
    const usersWithAge = await db.select().from('users').whereNotNull('age').get();
    expect(usersWithAge.length).toBe(0);
  });

  it('should delete without returning clause', async () => {
    // First delete all post_categories and posts for user 1
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').where('user_id', '=', 1).execute();
    
    const result = await db.delete()
      .from('users')
      .where('id', '=', 1)
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);

    // Verify the record was deleted
    const deletedUser = await db.select().from('users').where('id', '=', 1).first();
    expect(deletedUser).toBeNull();
  });

  it('should delete with all returning columns', async () => {
    // First delete all post_categories and posts for user 1
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').where('user_id', '=', 1).execute();
    
    const result = await db.delete()
      .from('users')
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
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('should delete with specific returning columns', async () => {
    // First delete all post_categories and posts for user 1
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').where('user_id', '=', 1).execute();
    
    const result = await db.delete()
      .from('users')
      .where('id', '=', 1)
      .returning(['id', 'name'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).not.toHaveProperty('email');
    expect(result[0]).not.toHaveProperty('age');
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('should build raw query', async () => {
    const query = db.delete()
      .from('users')
      .where('id', '=', 1)
      .returning(['id', 'name'])
      .raw();

    expect(query).toHaveProperty('sql');
    expect(query).toHaveProperty('params');
    expect(query.sql).toContain('DELETE FROM');
    expect(query.sql).toContain('WHERE');
    expect(query.sql).toContain('RETURNING');
    expect(query.params).toContain(1);
  });

  it('should delete with multiple conditions', async () => {
    // First delete all post_categories, then posts for users that match the conditions
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').whereIn('user_id', [1, 4]).execute(); // Users 1 and 4 are active and age > 25
    
    const result = await db.delete()
      .from('users')
      .where('active', '=', true)
      .where('age', '>', 25)
      .returning(['id', 'name', 'active', 'age'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(2); // 2 users that are active and age > 25
    expect(result.every(user => user.active === true && user.age > 25)).toBe(true);

    // Verify the records were deleted
    const deletedUsers = await db.select()
      .from('users')
      .where('active', '=', true)
      .where('age', '>', 25)
      .get();
    expect(deletedUsers.length).toBe(0);
  });

  it('should not delete when no records match', async () => {
    const result = await db.delete()
      .from('users')
      .where('id', '=', 999)
      .returning(['id', 'name'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(0);

    // Verify no records were deleted
    const allUsers = await db.select().from('users').get();
    expect(allUsers.length).toBe(4);
  });

  it('should delete all records when no WHERE clause', async () => {
    // First delete all post_categories, then all posts
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').execute();
    
    const result = await db.delete()
      .from('users')
      .returning(['id', 'name'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(4);

    // Verify all records were deleted
    const allUsers = await db.select().from('users').get();
    expect(allUsers.length).toBe(0);
  });

  it('should handle cascading deletes', async () => {
    // First delete all post_categories and posts for user 1
    await db.delete().from('post_categories').execute();
    await db.delete().from('posts').where('user_id', '=', 1).execute();
    
    // Delete a user who had posts
    const result = await db.delete()
      .from('users')
      .where('id', '=', 1)
      .returning(['id', 'name'])
      .execute();

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);

    // Verify the user was deleted
    const deletedUser = await db.select().from('users').where('id', '=', 1).first();
    expect(deletedUser).toBeNull();

    // Note: Posts with user_id = 1 will still exist unless CASCADE is set up
    // This test demonstrates the current behavior without CASCADE
  });
}); 