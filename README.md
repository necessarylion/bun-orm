# Bun ORM (Spark)

A PostgreSQL query builder for Bun, inspired by Knex.js but built specifically for Bun's native SQL API.

## Features

- 🚀 **Built for Bun**: Uses Bun's native `bun:sql` API for maximum performance
- 🔒 **SQL Injection Safe**: Parameterized queries with proper escaping
- 📝 **Knex-like API**: Familiar query builder interface
- 🔄 **Full CRUD Support**: SELECT, INSERT, UPDATE, DELETE operations
- 🎯 **TypeScript Support**: Full type safety and IntelliSense
- 🧪 **Comprehensive Testing**: Extensive test suite with real PostgreSQL
- ⚡ **Zero Dependencies**: No external dependencies required

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd bun-orm

# Install dependencies
bun install
```

## Quick Start

### 1. Set up your database connection

Create a `.env` file in your project root:

```env
DB_HOST=localhost
DB_NAME=bun_orm
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
```

### 2. Initialize the query builder

```typescript
import { spark } from 'bun-orm';

const db = spark({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'bun_orm',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});
```

### 3. Start building queries

```typescript
// SELECT queries
const users = await db.select()
  .from('users')
  .where('active', '=', true)
  .orderBy('name', 'ASC')
  .get();

// INSERT queries
const newUser = await db.insert({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
}).into('users').returning(['id', 'name']).execute();

// UPDATE queries
const updatedUser = await db.update({ age: 31 })
  .table('users')
  .where('id', '=', 1)
  .returning(['id', 'name', 'age'])
  .execute();

// DELETE queries
const deletedUser = await db.delete()
  .from('users')
  .where('id', '=', 1)
  .returning(['id', 'name'])
  .execute();
```

## API Reference

### Connection

#### `spark(config?: ConnectionConfig): Spark`

Initialize the query builder with database configuration.

```typescript
interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idle_timeout?: number;
  connect_timeout?: number;
}
```

### SELECT Queries

#### Basic SELECT

```typescript
// Select all columns
const users = await db.select().from('users').get();

// Select specific columns
const users = await db.select(['name', 'email']).from('users').get();

// Select with aliases
const users = await db.select({ user_name: 'name', user_email: 'email' }).from('users').get();
```

#### WHERE Clauses

```typescript
// Simple WHERE
const users = await db.select()
  .from('users')
  .where('active', '=', true)
  .get();

// Multiple WHERE conditions
const users = await db.select()
  .from('users')
  .where('active', '=', true)
  .where('age', '>', 25)
  .get();

// WHERE IN
const users = await db.select()
  .from('users')
  .whereIn('id', [1, 2, 3])
  .get();

// WHERE NOT IN
const users = await db.select()
  .from('users')
  .whereNotIn('id', [1, 2])
  .get();

// WHERE NULL
const users = await db.select()
  .from('users')
  .whereNull('age')
  .get();

// WHERE NOT NULL
const users = await db.select()
  .from('users')
  .whereNotNull('age')
  .get();
```

#### JOINs

```typescript
// INNER JOIN
const postsWithUsers = await db.select(['posts.title', 'users.name as author'])
  .from('posts')
  .join('users', 'posts.user_id = users.id')
  .get();

// LEFT JOIN
const postsWithUsers = await db.select(['posts.title', 'users.name as author'])
  .from('posts')
  .leftJoin('users', 'posts.user_id = users.id')
  .get();

// RIGHT JOIN
const postsWithUsers = await db.select(['posts.title', 'users.name as author'])
  .from('posts')
  .rightJoin('users', 'posts.user_id = users.id')
  .get();

// FULL JOIN
const postsWithUsers = await db.select(['posts.title', 'users.name as author'])
  .from('posts')
  .fullJoin('users', 'posts.user_id = users.id')
  .get();
```

#### ORDER BY, LIMIT, OFFSET

```typescript
const users = await db.select()
  .from('users')
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(20)
  .get();
```

#### DISTINCT

```typescript
const distinctAges = await db.select('age')
  .from('users')
  .distinct()
  .get();
```

#### Aggregation

```typescript
// Count
const count = await db.select()
  .from('users')
  .where('active', '=', true)
  .count();

// Count specific column
const count = await db.select()
  .from('users')
  .where('active', '=', true)
  .count('id');
```

#### GROUP BY

```typescript
const userPostCounts = await db.select(['users.name', 'COUNT(posts.id) as post_count'])
  .from('users')
  .leftJoin('posts', 'users.id = posts.user_id')
  .groupBy('users.name')
  .get();
```

### INSERT Queries

#### Single Record

```typescript
const newUser = await db.insert({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  active: true
}).into('users').returning(['id', 'name', 'email']).execute();
```

#### Multiple Records

```typescript
const newUsers = await db.insert([
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35 }
]).into('users').returning(['id', 'name']).execute();
```

### UPDATE Queries

#### Single Record

```typescript
const updatedUser = await db.update({
  name: 'John Updated',
  age: 31
}).table('users').where('id', '=', 1).returning(['id', 'name', 'age']).execute();
```

#### Multiple Records

```typescript
const updatedUsers = await db.update({
  active: false
}).table('users').where('age', '>', 30).returning(['id', 'name', 'active']).execute();
```

### DELETE Queries

#### Single Record

```typescript
const deletedUser = await db.delete()
  .from('users')
  .where('id', '=', 1)
  .returning(['id', 'name'])
  .execute();
```

#### Multiple Records

```typescript
const deletedUsers = await db.delete()
  .from('users')
  .where('active', '=', false)
  .returning(['id', 'name', 'active'])
  .execute();
```

### Raw Queries

```typescript
// Execute raw SQL
const result = await db.raw('SELECT COUNT(*) as total FROM users WHERE age > ?', [25]);

// Get raw SQL from query builder
const query = db.select(['name', 'email'])
  .from('users')
  .where('active', '=', true)
  .raw();

console.log(query.sql);    // "SELECT name, email FROM users WHERE active = ?"
console.log(query.params); // [true]
```

### Utility Methods

```typescript
// Test connection
const isConnected = await db.testConnection();

// Check if table exists
const exists = await db.hasTable('users');

// Drop table
await db.dropTable('users');

// Close connection
await db.close();
```

## Running Tests

Make sure you have PostgreSQL running with the test database:

```bash
# Run all tests
bun test

# Run specific test file
bun test test/select.test.ts

# Run tests with coverage
bun test --coverage
```

## Running Examples

```bash
# Run the basic usage example
bun run examples/basic-usage.ts
```

## Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create the database**:
   ```sql
   CREATE DATABASE bun_orm;
   ```
3. **Set up environment variables** in `.env` file
4. **Run tests** to verify everything works

## Comparison with Knex.js

| Feature | Bun ORM (Spark) | Knex.js |
|---------|---------|---------|
| Runtime | Bun only | Node.js |
| SQL API | Native `bun:sql` | Multiple drivers |
| Performance | Native bindings | JavaScript layer |
| Dependencies | Zero | Multiple |
| TypeScript | Full support | Full support |
| Query Builder | ✅ | ✅ |
| Migrations | ❌ | ✅ |
| Schema Builder | Basic | Full |
| Transactions | ❌ | ✅ |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] Transaction support
- [ ] Migration system
- [ ] Schema builder
- [ ] Connection pooling
- [ ] Query logging
- [ ] Performance optimizations
- [ ] MySQL support
- [ ] SQLite support
