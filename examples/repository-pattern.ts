import { BunORM, initializeORM, BaseRepository } from '../index';

// Example user interface
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
  created_at: Date;
}

// Example post interface
interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number;
  published: boolean;
  created_at: Date;
}

// User Repository
class UserRepository extends BaseRepository<User> {
  constructor(orm: BunORM) {
    super(orm['connection'], 'users', 'id');
  }

  /**
   * Find users by age range
   */
  async findByAgeRange(minAge: number, maxAge: number): Promise<User[]> {
    return await this.connection.execute<User>(
      'SELECT * FROM users WHERE age BETWEEN ? AND ? ORDER BY age ASC',
      [minAge, maxAge]
    );
  }

  /**
   * Find active users
   */
  async findActive(): Promise<User[]> {
    return await this.connection.execute<User>(
      'SELECT * FROM users WHERE active = ? ORDER BY created_at DESC',
      [true]
    );
  }

  /**
   * Find users by email domain
   */
  async findByEmailDomain(domain: string): Promise<User[]> {
    return await this.connection.execute<User>(
      'SELECT * FROM users WHERE email LIKE ? ORDER BY name ASC',
      [`%@${domain}`]
    );
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    averageAge: number;
  }> {
    const result = await this.connection.execute<{
      total: number;
      active: number;
      averageAge: number;
    }>(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN active = ? THEN 1 END) as active, AVG(age) as averageAge FROM users',
      [true]
    );

    return result[0] || { total: 0, active: 0, averageAge: 0 };
  }

  /**
   * Deactivate old users
   */
  async deactivateOldUsers(daysOld: number): Promise<number> {
    const result = await this.connection.execute(
      'UPDATE users SET active = ? WHERE created_at < ? AND active = ?',
      [false, new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000), true]
    );
    return result.length;
  }
}

// Post Repository
class PostRepository extends BaseRepository<Post> {
  constructor(orm: BunORM) {
    super(orm['connection'], 'posts', 'id');
  }

  /**
   * Find posts by user
   */
  async findByUser(userId: number): Promise<Post[]> {
    return await this.connection.execute<Post>(
      'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  /**
   * Find published posts
   */
  async findPublished(): Promise<Post[]> {
    return await this.connection.execute<Post>(
      'SELECT * FROM posts WHERE published = ? ORDER BY created_at DESC',
      [true]
    );
  }

  /**
   * Find posts with author information
   */
  async findWithAuthor(): Promise<(Post & { author_name: string; author_email: string })[]> {
    return await this.connection.execute<Post & { author_name: string; author_email: string }>(
      `SELECT p.*, u.name as author_name, u.email as author_email 
       FROM posts p 
       INNER JOIN users u ON p.user_id = u.id 
       WHERE p.published = ? 
       ORDER BY p.created_at DESC`,
      [true]
    );
  }

  /**
   * Get post statistics by user
   */
  async getPostCountByUser(): Promise<{ user_id: number; post_count: number; user_name: string }[]> {
    return await this.connection.execute<{ user_id: number; post_count: number; user_name: string }>(
      `SELECT u.id as user_id, u.name as user_name, COUNT(p.id) as post_count 
       FROM users u 
       LEFT JOIN posts p ON u.id = p.user_id 
       GROUP BY u.id, u.name 
       ORDER BY post_count DESC`
    );
  }
}

async function repositoryPatternExample() {
  // Initialize the ORM
  const orm = initializeORM({
    database: 'myapp',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password'
  });

  // Connect to the database
  await orm.connect();

  // Create repositories
  const userRepo = new UserRepository(orm);
  const postRepo = new PostRepository(orm);

  try {
    console.log('=== Repository Pattern Example ===\n');

    // Example 1: Basic CRUD operations
    console.log('1. Basic CRUD operations:');
    
    // Create a new user
    const newUser = await userRepo.create({
      name: 'Repository User',
      email: 'repo@example.com',
      age: 30,
      active: true
    });
    console.log(`Created user: ${newUser.name} (ID: ${newUser.id})`);

    // Find the user
    const foundUser = await userRepo.find(newUser.id);
    console.log(`Found user: ${foundUser?.name}`);

    // Update the user
    const updatedUser = await userRepo.update(newUser.id, { age: 31 });
    console.log(`Updated user age to: ${updatedUser?.age}`);

    // Count total users
    const totalUsers = await userRepo.count();
    console.log(`Total users: ${totalUsers}`);

    // Example 2: Custom repository methods
    console.log('\n2. Custom repository methods:');
    
    // Find users by age range
    const youngUsers = await userRepo.findByAgeRange(18, 25);
    console.log(`Found ${youngUsers.length} young users (18-25)`);

    // Find active users
    const activeUsers = await userRepo.findActive();
    console.log(`Found ${activeUsers.length} active users`);

    // Find users by email domain
    const gmailUsers = await userRepo.findByEmailDomain('gmail.com');
    console.log(`Found ${gmailUsers.length} Gmail users`);

    // Get user statistics
    const userStats = await userRepo.getStatistics();
    console.log(`User statistics: ${userStats.total} total, ${userStats.active} active, avg age: ${Math.round(userStats.averageAge)}`);

    // Example 3: Post operations
    console.log('\n3. Post operations:');
    
    // Create a post for the user
    const newPost = await postRepo.create({
      title: 'My First Post',
      content: 'This is my first post using the repository pattern!',
      user_id: newUser.id,
      published: true
    });
    console.log(`Created post: "${newPost.title}"`);

    // Find posts by user
    const userPosts = await postRepo.findByUser(newUser.id);
    console.log(`User has ${userPosts.length} posts`);

    // Find published posts
    const publishedPosts = await postRepo.findPublished();
    console.log(`Found ${publishedPosts.length} published posts`);

    // Find posts with author information
    const postsWithAuthors = await postRepo.findWithAuthor();
    console.log(`Found ${postsWithAuthors.length} posts with author info`);
    postsWithAuthors.forEach(post => {
      console.log(`- "${post.title}" by ${post.author_name}`);
    });

    // Example 4: Complex queries
    console.log('\n4. Complex queries:');
    
    // Get post count by user
    const postCounts = await postRepo.getPostCountByUser();
    console.log('Post count by user:');
    postCounts.forEach(count => {
      console.log(`- ${count.user_name}: ${count.post_count} posts`);
    });

    // Example 5: Bulk operations
    console.log('\n5. Bulk operations:');
    
    // Create multiple users
    const bulkUsers = await Promise.all([
      userRepo.create({ name: 'User 1', email: 'user1@example.com', age: 25, active: true }),
      userRepo.create({ name: 'User 2', email: 'user2@example.com', age: 30, active: true }),
      userRepo.create({ name: 'User 3', email: 'user3@example.com', age: 35, active: false })
    ]);
    console.log(`Created ${bulkUsers.length} users in bulk`);

    // Example 6: Transaction with repositories
    console.log('\n6. Transaction with repositories:');
    
    await orm.transaction(async (transactionORM) => {
      const transactionUserRepo = new UserRepository(transactionORM);
      const transactionPostRepo = new PostRepository(transactionORM);

      // Create user in transaction
      const transactionUser = await transactionUserRepo.create({
        name: 'Transaction User',
        email: 'transaction@example.com',
        age: 40,
        active: true
      });

      // Create post in transaction
      await transactionPostRepo.create({
        title: 'Transaction Post',
        content: 'This post was created in a transaction!',
        user_id: transactionUser.id,
        published: true
      });

      console.log(`Created user and post in transaction (User ID: ${transactionUser.id})`);
    });

    // Example 7: Cleanup operations
    console.log('\n7. Cleanup operations:');
    
    // Deactivate old users
    const deactivatedCount = await userRepo.deactivateOldUsers(30); // 30 days
    console.log(`Deactivated ${deactivatedCount} old users`);

    // Delete the test user
    const deleted = await userRepo.delete(newUser.id);
    console.log(`Deleted test user: ${deleted}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect from the database
    await orm.disconnect();
  }
}

// Run the example
repositoryPatternExample().catch(console.error); 