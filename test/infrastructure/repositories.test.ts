import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { BaseRepository } from "../../src/infrastructure/repositories/base-repository";
import { setupTestDatabase, teardownTestDatabase, testORM, insertTestData, clearTestData, type TestUser, type TestPost } from "../setup";

// Test repository implementation
class TestUserRepository extends BaseRepository<TestUser> {
  constructor() {
    super(testORM['connection'], 'users', 'id');
  }

  async findActive(): Promise<TestUser[]> {
    return await this.executeQuery(
      'SELECT * FROM users WHERE active = ? ORDER BY created_at DESC',
      [true]
    );
  }

  async findByAgeRange(minAge: number, maxAge: number): Promise<TestUser[]> {
    return await this.executeQuery(
      'SELECT * FROM users WHERE age BETWEEN ? AND ? ORDER BY age ASC',
      [minAge, maxAge]
    );
  }

  async findByEmailDomain(domain: string): Promise<TestUser[]> {
    return await this.executeQuery(
      'SELECT * FROM users WHERE email LIKE ? ORDER BY name ASC',
      [`%@${domain}`]
    );
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    averageAge: number;
  }> {
    const result = await this.executeQuery<{
      total: number;
      active: number;
      averageAge: number;
    }>(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN active = ? THEN 1 END) as active, AVG(age) as averageAge FROM users',
      [true]
    );

    return result[0] || { total: 0, active: 0, averageAge: 0 };
  }

  async deactivateOldUsers(daysOld: number): Promise<number> {
    const result = await this.executeQuery(
      'UPDATE users SET active = ? WHERE created_at < ? AND active = ?',
      [false, new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000), true]
    );
    return result.length;
  }
}

class TestPostRepository extends BaseRepository<TestPost> {
  constructor() {
    super(testORM['connection'], 'posts', 'id');
  }

  async findByUser(userId: number): Promise<TestPost[]> {
    return await this.executeQuery(
      'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  async findPublished(): Promise<TestPost[]> {
    return await this.executeQuery(
      'SELECT * FROM posts WHERE published = ? ORDER BY created_at DESC',
      [true]
    );
  }

  async findWithAuthor(): Promise<(TestPost & { author_name: string; author_email: string })[]> {
    return await this.executeQuery<TestPost & { author_name: string; author_email: string }>(
      `SELECT p.*, u.name as author_name, u.email as author_email 
       FROM posts p 
       INNER JOIN users u ON p.user_id = u.id 
       WHERE p.published = ? 
       ORDER BY p.created_at DESC`,
      [true]
    );
  }

  async getPostCountByUser(): Promise<{ user_id: number; post_count: number; user_name: string }[]> {
    return await this.executeQuery<{ user_id: number; post_count: number; user_name: string }>(
      `SELECT u.id as user_id, u.name as user_name, COUNT(p.id) as post_count 
       FROM users u 
       LEFT JOIN posts p ON u.id = p.user_id 
       GROUP BY u.id, u.name 
       ORDER BY post_count DESC`
    );
  }
}

describe("Infrastructure - Repositories", () => {
  let userRepo: TestUserRepository;
  let postRepo: TestPostRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    userRepo = new TestUserRepository();
    postRepo = new TestPostRepository();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    await insertTestData();
  });

  describe("BaseRepository", () => {
    describe("CRUD Operations", () => {
      test("should find a record by ID", async () => {
        const user = await userRepo.find(1);
        
        expect(user).toBeDefined();
        expect(user?.id).toBe(1);
        expect(user?.name).toBe("John Doe");
        expect(user?.email).toBe("john@example.com");
      });

      test("should return null for non-existent ID", async () => {
        const user = await userRepo.find(999);
        
        expect(user).toBeNull();
      });

      test("should find all records", async () => {
        const users = await userRepo.findAll();
        
        expect(users).toHaveLength(5);
        expect(users[0].id).toBe(1);
        expect(users[4].id).toBe(5);
      });

      test("should create a new record", async () => {
        const newUser = await userRepo.create({
          name: "Test User",
          email: "test@example.com",
          age: 25,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        });
        
        expect(newUser.id).toBeDefined();
        expect(newUser.name).toBe("Test User");
        expect(newUser.email).toBe("test@example.com");
        expect(newUser.age).toBe(25);
        expect(newUser.active).toBe(true);
      });

      test("should update a record", async () => {
        const updatedUser = await userRepo.update(1, {
          name: "Updated John Doe",
          age: 26
        });
        
        expect(updatedUser).toBeDefined();
        expect(updatedUser?.name).toBe("Updated John Doe");
        expect(updatedUser?.age).toBe(26);
        expect(updatedUser?.email).toBe("john@example.com"); // Should remain unchanged
      });

      test("should return null when updating non-existent record", async () => {
        const updatedUser = await userRepo.update(999, {
          name: "Non-existent User"
        });
        
        expect(updatedUser).toBeNull();
      });

      test("should delete a record", async () => {
        const deleted = await userRepo.delete(1);
        
        expect(deleted).toBe(true);
        
        // Verify the record is actually deleted
        const user = await userRepo.find(1);
        expect(user).toBeNull();
      });

      test("should return false when deleting non-existent record", async () => {
        const deleted = await userRepo.delete(999);
        
        expect(deleted).toBe(false);
      });

      test("should count total records", async () => {
        const count = await userRepo.count();
        
        expect(count).toBe(5);
      });
    });

    describe("Custom Repository Methods", () => {
      test("should find active users", async () => {
        const activeUsers = await userRepo.findActive();
        
        expect(activeUsers).toHaveLength(4); // 4 active users out of 5
        activeUsers.forEach(user => {
          expect(user.active).toBe(true);
        });
      });

      test("should find users by age range", async () => {
        const youngUsers = await userRepo.findByAgeRange(20, 30);
        
        expect(youngUsers).toHaveLength(3); // John (25), Alice (28), Charlie (22)
        youngUsers.forEach(user => {
          expect(user.age).toBeGreaterThanOrEqual(20);
          expect(user.age).toBeLessThanOrEqual(30);
        });
      });

      test("should find users by email domain", async () => {
        const gmailUsers = await userRepo.findByEmailDomain("gmail.com");
        
        // No gmail users in test data, so should be empty
        expect(gmailUsers).toHaveLength(0);
        
        const exampleUsers = await userRepo.findByEmailDomain("example.com");
        expect(exampleUsers).toHaveLength(5); // All users have @example.com
      });

      test("should get user statistics", async () => {
        const stats = await userRepo.getStatistics();
        
        expect(stats.total).toBe(5);
        expect(stats.active).toBe(4);
        expect(stats.averageAge).toBeGreaterThan(0);
      });

      test("should deactivate old users", async () => {
        // This should deactivate users created more than 1 day ago
        const deactivatedCount = await userRepo.deactivateOldUsers(1);
        
        expect(deactivatedCount).toBeGreaterThanOrEqual(0);
        
        // Verify some users were deactivated
        const activeUsers = await userRepo.findActive();
        expect(activeUsers.length).toBeLessThan(4);
      });
    });

    describe("Post Repository", () => {
      test("should find posts by user", async () => {
        const userPosts = await postRepo.findByUser(1);
        
        expect(userPosts).toHaveLength(2); // John has 2 posts
        userPosts.forEach(post => {
          expect(post.user_id).toBe(1);
        });
      });

      test("should find published posts", async () => {
        const publishedPosts = await postRepo.findPublished();
        
        expect(publishedPosts).toHaveLength(4); // 4 published posts out of 5
        publishedPosts.forEach(post => {
          expect(post.published).toBe(true);
        });
      });

      test("should find posts with author information", async () => {
        const postsWithAuthors = await postRepo.findWithAuthor();
        
        expect(postsWithAuthors).toHaveLength(4); // 4 published posts
        postsWithAuthors.forEach(post => {
          expect(post.author_name).toBeDefined();
          expect(post.author_email).toBeDefined();
          expect(post.published).toBe(true);
        });
      });

      test("should get post count by user", async () => {
        const postCounts = await postRepo.getPostCountByUser();
        
        expect(postCounts).toHaveLength(5); // 5 users
        expect(postCounts[0].user_id).toBe(1); // John has most posts
        expect(postCounts[0].post_count).toBe(2);
      });
    });

    describe("Transaction Support", () => {
      test("should execute transaction", async () => {
        const result = await userRepo.executeTransaction(async () => {
          const user = await userRepo.create({
            name: "Transaction User",
            email: "transaction@example.com",
            age: 30,
            active: true,
            verified: false,
            premium: false,
            login_count: 0
          });
          
          const post = await postRepo.create({
            title: "Transaction Post",
            content: "Created in transaction",
            user_id: user.id,
            published: true
          });
          
          return { user, post };
        });
        
        expect(result.user.id).toBeDefined();
        expect(result.post.id).toBeDefined();
        expect(result.post.user_id).toBe(result.user.id);
      });

      test("should rollback transaction on error", async () => {
        const initialUserCount = await userRepo.count();
        
        await expect(async () => {
          await userRepo.executeTransaction(async () => {
            await userRepo.create({
              name: "Rollback User",
              email: "rollback@example.com",
              age: 25,
              active: true,
              verified: false,
              premium: false,
              login_count: 0
            });
            
            throw new Error("Test rollback");
          });
        }).rejects.toThrow("Test rollback");
        
        // Verify the user was not created (transaction rolled back)
        const finalUserCount = await userRepo.count();
        expect(finalUserCount).toBe(initialUserCount);
      });
    });

    describe("Error Handling", () => {
      test("should handle invalid queries gracefully", async () => {
        await expect(async () => {
          await userRepo.executeQuery("INVALID SQL QUERY");
        }).rejects.toThrow();
      });

      test("should handle constraint violations", async () => {
        // Try to create a user with duplicate email
        await userRepo.create({
          name: "Duplicate User",
          email: "john@example.com", // Already exists
          age: 25,
          active: true,
          verified: false,
          premium: false,
          login_count: 0
        });
        
        await expect(async () => {
          await userRepo.create({
            name: "Another Duplicate",
            email: "john@example.com", // Duplicate email
            age: 30,
            active: true,
            verified: false,
            premium: false,
            login_count: 0
          });
        }).rejects.toThrow();
      });
    });
  });
}); 