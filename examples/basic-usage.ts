import { spark } from '../index';

// Example usage of the Bun ORM query builder
async function main() {
  // Initialize the database connection
  const db = spark({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'bun_orm',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    // Test connection
    const isConnected = await db.testConnection();
    console.log('Database connected:', isConnected);

    // Create tables if they don't exist
    await db.raw(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clear existing data
    await db.raw('DELETE FROM posts');
    await db.raw('DELETE FROM users');
    await db.raw('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await db.raw('ALTER SEQUENCE posts_id_seq RESTART WITH 1');

    console.log('\n=== INSERT Examples ===');

    // Insert single user
    const newUser = await db.insert({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true
    }).into('users').returning(['id', 'name', 'email']).execute();

    console.log('Inserted user:', newUser[0]);

    // Insert multiple users
    const newUsers = await db.insert([
      { name: 'Jane Smith', email: 'jane@example.com', age: 25, active: true },
      { name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: false },
      { name: 'Alice Brown', email: 'alice@example.com', age: 28, active: true }
    ]).into('users').returning(['id', 'name', 'email']).execute();

    console.log('Inserted users:', newUsers);

    // Insert posts
    const posts = await db.insert([
      { user_id: 1, title: 'Getting Started with Bun', content: 'Bun is a fast JavaScript runtime...', published: true },
      { user_id: 1, title: 'PostgreSQL with Bun', content: 'Learn how to use PostgreSQL...', published: true },
      { user_id: 2, title: 'Travel to Japan', content: 'My amazing trip to Japan...', published: false },
      { user_id: 3, title: 'Best Pizza Places', content: 'Top pizza restaurants in the city...', published: true }
    ]).into('posts').returning(['id', 'title', 'user_id']).execute();

    console.log('Inserted posts:', posts);

    console.log('\n=== SELECT Examples ===');

    // Select all users
    const allUsers = await db.select().from('users').get();
    console.log('All users:', allUsers);

    // Select specific columns
    const userNames = await db.select(['name', 'email']).from('users').get();
    console.log('User names and emails:', userNames);

    // Select with WHERE clause
    const activeUsers = await db.select()
      .from('users')
      .where('active', '=', true)
      .get();
    console.log('Active users:', activeUsers);

    // Select with multiple conditions
    const olderActiveUsers = await db.select()
      .from('users')
      .where('active', '=', true)
      .where('age', '>', 25)
      .get();
    console.log('Older active users:', olderActiveUsers);

    // Select with WHERE IN
    const specificUsers = await db.select()
      .from('users')
      .whereIn('id', [1, 2, 3])
      .get();
    console.log('Specific users:', specificUsers);

    // Select with JOIN
    const postsWithAuthors = await db.select(['posts.title', 'users.name as author'])
      .from('posts')
      .join('users', 'posts.user_id = users.id')
      .get();
    console.log('Posts with authors:', postsWithAuthors);

    // Select with ORDER BY
    const orderedUsers = await db.select()
      .from('users')
      .orderBy('name', 'ASC')
      .get();
    console.log('Users ordered by name:', orderedUsers);

    // Select with LIMIT and OFFSET
    const paginatedUsers = await db.select()
      .from('users')
      .orderBy('id', 'ASC')
      .limit(2)
      .offset(1)
      .get();
    console.log('Paginated users:', paginatedUsers);

    // Select with DISTINCT
    const distinctAges = await db.select('age')
      .from('users')
      .distinct()
      .get();
    console.log('Distinct ages:', distinctAges);

    // Get first result
    const firstUser = await db.select()
      .from('users')
      .orderBy('id', 'ASC')
      .first();
    console.log('First user:', firstUser);

    // Count results
    const userCount = await db.select()
      .from('users')
      .where('active', '=', true)
      .count();
    console.log('Active user count:', userCount);

    console.log('\n=== UPDATE Examples ===');

    // Update single record
    const updatedUser = await db.update({ name: 'John Updated', age: 31 })
      .table('users')
      .where('id', '=', 1)
      .returning(['id', 'name', 'age'])
      .execute();
    console.log('Updated user:', updatedUser[0]);

    // Update multiple records
    const updatedUsers = await db.update({ active: false })
      .table('users')
      .where('age', '>', 30)
      .returning(['id', 'name', 'age', 'active'])
      .execute();
    console.log('Updated older users:', updatedUsers);

    // Update with WHERE IN
    const updatedSpecificUsers = await db.update({ age: 40 })
      .table('users')
      .whereIn('id', [2, 3])
      .returning(['id', 'name', 'age'])
      .execute();
    console.log('Updated specific users:', updatedSpecificUsers);

    console.log('\n=== DELETE Examples ===');

    // Delete single record (first delete related posts to avoid foreign key constraint)
    await db.delete().from('posts').where('user_id', '=', 4).execute();
    const deletedUser = await db.delete()
      .from('users')
      .where('id', '=', 4)
      .returning(['id', 'name'])
      .execute();
    console.log('Deleted user:', deletedUser[0]);

    // Delete multiple records (first delete related posts for inactive users)
    await db.delete().from('posts').whereIn('user_id', [1, 3]).execute(); // John and Bob are now inactive
    const deletedUsers = await db.delete()
      .from('users')
      .where('active', '=', false)
      .returning(['id', 'name', 'active'])
      .execute();
    console.log('Deleted inactive users:', deletedUsers);

    console.log('\n=== Raw Query Examples ===');

    // Raw query with parameters
    const rawResult = await db.raw('SELECT COUNT(*) as total FROM users WHERE age > $1', [25]);
    console.log('Raw query result:', rawResult[0]);

    // Get raw SQL from query builder
    const rawQuery = db.select(['name', 'email'])
      .from('users')
      .where('active', '=', true)
      .raw();
    console.log('Raw SQL:', rawQuery.sql);
    console.log('Raw params:', rawQuery.params);

    console.log('\n=== Final State ===');

    // Show final state
    const finalUsers = await db.select().from('users').get();
    console.log('Final users:', finalUsers);

    const finalPosts = await db.select().from('posts').get();
    console.log('Final posts:', finalPosts);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the database connection
    await db.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the example
main().catch(console.error); 