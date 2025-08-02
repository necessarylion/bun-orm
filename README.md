# Bun ORM - PostgreSQL Query Builder

A modern, type-safe PostgreSQL query builder for Bun, built with Domain-Driven Design (DDD) principles and following Laravel's Eloquent-inspired syntax.

## Features

- 🚀 **Built for Bun** - Native Bun SQL API integration
- 🏗️ **Domain-Driven Design** - Clean architecture with proper separation of concerns
- 🔒 **Type Safety** - Full TypeScript support with generics
- 🎯 **Fluent Interface** - Chainable query builder methods
- 🔄 **Repository Pattern** - Abstract data access with custom repositories
- 💾 **Transaction Support** - ACID-compliant database transactions
- 🛡️ **SQL Injection Protection** - Parameterized queries with proper escaping
- 📊 **Rich Query API** - Support for complex joins, aggregations, and subqueries
- 🎨 **Laravel-Inspired** - Familiar syntax for Laravel developers

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bun-orm.git
cd bun-orm

# Install dependencies
bun install
```

## Quick Start

```typescript
import { initializeORM } from 'bun-orm';

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

// Simple query
const users = await orm.query<User>()
  .from('users')
  .select('id', 'name', 'email')
  .where('active', '=', true)
  .orderBy('name', 'ASC')
  .limit(10)
  .get();

console.log(`Found ${users.count} users`);
```

## Architecture

This ORM follows Domain-Driven Design principles with a clean layered architecture:

```
src/
├── domain/                 # Domain Layer
│   ├── value-objects/     # Value Objects (Column, Table, WhereCondition, etc.)
│   └── entities/          # Domain Entities (QueryResult)
├── infrastructure/        # Infrastructure Layer
│   ├── connection/        # Database connection management
│   └── repositories/      # Repository pattern implementation
├── application/           # Application Layer
│   └── services/          # Query builders and business logic
└── orm.ts                # Main ORM facade
```

## Core Concepts

### 1. Value Objects

Value objects represent immutable concepts in your domain:

```typescript
import { Table, Column } from 'bun-orm';

// Create table and column references
const usersTable = new Table('users', 'public');
const nameColumn = new Column('name', 'users');

// Use with aliases
const aliasedTable = usersTable.as('u');
const aliasedColumn = nameColumn.as('user_name');
```

### 2. Query Builder

The main query builder provides a fluent interface for building SQL queries:

```typescript
// Basic SELECT
const users = await orm.query<User>()
  .from('users')
  .select('id', 'name', 'email')
  .where('age', '>=', 18)
  .orderBy('name', 'ASC')
  .get();

// Complex WHERE conditions
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

// JOIN operations
const postsWithAuthors = await orm.query<Post & { author_name: string }>()
  .from('posts')
  .select('posts.id', 'posts.title', 'users.name as author_name')
  .innerJoin('users', 'posts.user_id = users.id')
  .where('posts.published', '=', true)
  .get();
```

### 3. Insert Query Builder

```typescript
// Single insert
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

// Bulk insert
const newUsers = await orm.insert<User>()
  .into('users')
  .insertMany([
    { name: 'Jane Smith', email: 'jane@example.com', age: 30 },
    { name: 'Bob Johnson', email: 'bob@example.com', age: 35 }
  ])
  .returning('id', 'name')
  .execute();
```

### 4. Update Query Builder

```typescript
// Simple update
const updatedUsers = await orm.update<User>()
  .table('users')
  .set('active', false)
  .where('last_login', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  .returning('id', 'name', 'email')
  .execute();

// Increment/decrement
await orm.update<User>()
  .table('users')
  .increment('login_count', 1)
  .where('id', '=', userId)
  .execute();
```

### 5. Delete Query Builder

```typescript
// Delete with conditions
const deletedUsers = await orm.delete<User>()
  .from('users')
  .where('active', '=', false)
  .where('created_at', '<', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
  .returning('id', 'name')
  .execute();
```

### 6. Repository Pattern

Create custom repositories for domain-specific data access:

```typescript
import { BaseRepository } from 'bun-orm';

class UserRepository extends BaseRepository<User> {
  constructor(orm: BunORM) {
    super(orm['connection'], 'users', 'id');
  }

  // Custom methods
  async findActive(): Promise<User[]> {
    return await this.connection.execute<User>(
      'SELECT * FROM users WHERE active = ? ORDER BY created_at DESC',
      [true]
    );
  }

  async findByEmailDomain(domain: string): Promise<User[]> {
    return await this.connection.execute<User>(
      'SELECT * FROM users WHERE email LIKE ? ORDER BY name ASC',
      [`%@${domain}`]
    );
  }
}

// Usage
const userRepo = new UserRepository(orm);
const activeUsers = await userRepo.findActive();
const gmailUsers = await userRepo.findByEmailDomain('gmail.com');
```

### 7. Transactions

```typescript
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
});
```

## Advanced Features

### Aggregation Queries

```typescript
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
```

### Raw SQL Queries

```typescript
const result = await orm.raw<User>(
  'SELECT * FROM users WHERE age > ? AND active = ? ORDER BY created_at DESC',
  [18, true]
);
```

### Query Result Methods

```typescript
const users = await orm.query<User>().from('users').get();

// Access data
console.log(users.data);        // Array of users
console.log(users.first);       // First user or undefined
console.log(users.last);        // Last user or undefined
console.log(users.count);       // Total count
console.log(users.length);      // Number of rows
console.log(users.isEmpty);     // Boolean
console.log(users.hasData);     // Boolean

// Transform data
const names = users.map(user => user.name);
const activeUsers = users.filter(user => user.active);
const john = users.find(user => user.name === 'John');
```

## Configuration

```typescript
interface DatabaseConfig {
  host?: string;              // Database host (default: localhost)
  port?: number;              // Database port (default: 5432)
  database: string;           // Database name (required)
  username?: string;          // Database username
  password?: string;          // Database password
  ssl?: boolean;              // Enable SSL (default: false)
  maxConnections?: number;    // Max connections in pool (default: 10)
  connectionTimeout?: number; // Connection timeout in ms
  idleTimeout?: number;       // Idle timeout in ms
  lifetimeTimeout?: number;   // Connection lifetime in ms
}
```

## Examples

See the `examples/` directory for comprehensive usage examples:

- `examples/basic-usage.ts` - Basic query builder usage
- `examples/repository-pattern.ts` - Repository pattern implementation

## Running Examples

```bash
# Run basic usage example
bun run examples/basic-usage.ts

# Run repository pattern example
bun run examples/repository-pattern.ts
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build

# Development mode with watch
bun run dev
```

## Design Patterns Used

1. **Domain-Driven Design (DDD)** - Clear separation of domain, application, and infrastructure layers
2. **Repository Pattern** - Abstract data access with custom repositories
3. **Builder Pattern** - Fluent interface for building complex queries
4. **Value Objects** - Immutable objects representing domain concepts
5. **Factory Pattern** - ORM instance creation
6. **Singleton Pattern** - Database connection management
7. **Strategy Pattern** - Different query builders for different operations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Laravel's Eloquent ORM
- Built on Bun's excellent SQL API
- Follows Domain-Driven Design principles from Eric Evans
