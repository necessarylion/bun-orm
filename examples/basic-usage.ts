import { BunORM, initializeORM, QueryBuilder, Table, Column } from '../index';

// Example user interface
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
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

async function basicUsageExample() {
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

  try {
    // Example 1: Simple SELECT query
    console.log('=== Example 1: Simple SELECT ===');
    const users = await orm.query<User>()
      .from('users')
      .select('id', 'name', 'email')
      .where('age', '>=', 18)
      .orderBy('name', 'ASC')
      .limit(10)
      .get();

    console.log(`Found ${users.count} users`);
    users.data.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });

    // Example 2: Complex WHERE conditions
    console.log('\n=== Example 2: Complex WHERE conditions ===');
    const activeUsers = await orm.query<User>()
      .from('users')
      .where('active', '=', true)
      .andWhere(condition => {
        condition.where('age', '>=', 18);
        condition.where('email', 'LIKE', '%@gmail.com');
      })
      .orWhere(condition => {
        condition.where('verified', '=', true);
        condition.where('premium', '=', true);
      })
      .get();

    console.log(`Found ${activeUsers.count} active users`);

    // Example 3: JOIN operations
    console.log('\n=== Example 3: JOIN operations ===');
    const postsWithAuthors = await orm.query<Post & { author_name: string }>()
      .from('posts')
      .select('posts.id', 'posts.title', 'posts.content', 'users.name as author_name')
      .innerJoin('users', 'posts.user_id = users.id')
      .where('posts.published', '=', true)
      .orderBy('posts.created_at', 'DESC')
      .limit(5)
      .get();

    console.log(`Found ${postsWithAuthors.count} published posts`);
    postsWithAuthors.data.forEach(post => {
      console.log(`- "${post.title}" by ${post.author_name}`);
    });

    // Example 4: INSERT operations
    console.log('\n=== Example 4: INSERT operations ===');
    const newUser = await orm.insert<User>()
      .into('users')
      .insert({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true
      })
      .returning('id', 'name', 'email')
      .execute();

    console.log(`Created user: ${newUser.first?.name} (ID: ${newUser.first?.id})`);

    // Example 5: Bulk INSERT
    console.log('\n=== Example 5: Bulk INSERT ===');
    const newUsers = await orm.insert<User>()
      .into('users')
      .insertMany([
        { name: 'Jane Smith', email: 'jane@example.com', age: 30, active: true },
        { name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: false },
        { name: 'Alice Brown', email: 'alice@example.com', age: 28, active: true }
      ])
      .returning('id', 'name')
      .execute();

    console.log(`Created ${newUsers.count} users`);

    // Example 6: UPDATE operations
    console.log('\n=== Example 6: UPDATE operations ===');
    const updatedUsers = await orm.update<User>()
      .update('users')
      .set('active', false)
      .where('last_login', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // 30 days ago
      .returning('id', 'name', 'email')
      .execute();

    console.log(`Updated ${updatedUsers.count} inactive users`);

    // Example 7: DELETE operations
    console.log('\n=== Example 7: DELETE operations ===');
    const deletedUsers = await orm.delete<User>()
      .from('users')
      .where('active', '=', false)
      .where('created_at', '<', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) // 1 year ago
      .returning('id', 'name')
      .execute();

    console.log(`Deleted ${deletedUsers.count} old inactive users`);

    // Example 8: Using Table and Column objects
    console.log('\n=== Example 8: Using Table and Column objects ===');
    const usersTable = orm.table('users', 'public');
    const postsTable = orm.table('posts', 'public');
    
    const nameColumn = orm.column('name', 'users');
    const emailColumn = orm.column('email', 'users');
    
    const recentPosts = await orm.query<Post & { author_name: string }>()
      .from(usersTable.as('u'))
      .select(
        postsTable.column('id').as('post_id'),
        postsTable.column('title').as('post_title'),
        nameColumn.as('author_name')
      )
      .innerJoin(postsTable.displayName, 'u.id = posts.user_id')
      .where(postsTable.column('published'), '=', true)
      .orderBy(postsTable.column('created_at'), 'DESC')
      .limit(3)
      .get();

    console.log(`Found ${recentPosts.count} recent posts`);

    // Example 9: Aggregation queries
    console.log('\n=== Example 9: Aggregation queries ===');
    const userStats = await orm.query<{ age_group: string; count: number; avg_age: number }>()
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

    console.log('User age group statistics:');
    userStats.data.forEach(stat => {
      console.log(`- ${stat.age_group}: ${stat.count} users (avg age: ${Math.round(stat.avg_age)})`);
    });

    // Example 10: Transactions
    console.log('\n=== Example 10: Transactions ===');
    await orm.transaction(async (transactionORM) => {
      // Create a new user
      const userResult = await transactionORM.insert<User>()
        .into('users')
        .insert({
          name: 'Transaction User',
          email: 'transaction@example.com',
          age: 40,
          active: true
        })
        .returning('id')
        .execute();

      const userId = userResult.first?.id;
      if (!userId) throw new Error('Failed to create user');

      // Create a post for the user
      await transactionORM.insert<Post>()
        .into('posts')
        .insert({
          title: 'My First Post',
          content: 'This is my first post created in a transaction!',
          user_id: userId,
          published: true
        })
        .execute();

      console.log(`Created user and post in transaction (User ID: ${userId})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect from the database
    await orm.disconnect();
  }
}

// Run the example
basicUsageExample().catch(console.error); 