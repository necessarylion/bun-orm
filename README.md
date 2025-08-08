# Bun ORM (Spark)

A lightweight, type-safe query builder for Bun with PostgreSQL support. Built with performance and developer experience in mind.

## Features

- 🚀 **Fast**: Built on Bun's high-performance runtime
- 🔒 **Type-safe**: Full TypeScript support with comprehensive type definitions and compile-time null/undefined prevention
- 🎯 **Simple**: Intuitive query builder API
- 🔄 **Transactions**: Full transaction support with automatic rollback
- 📊 **PostgreSQL**: Optimized for PostgreSQL with native features
- 🧪 **Tested**: Comprehensive test suite with real database integration

## Installation

```bash
bun add bun-spark
```

## Quick Start

### 1. Setup Database Connection

```typescript
import { spark } from 'bun-spark'

const db = spark({
  host: 'localhost',
  port: 5432,
  database: 'my_database',
  username: 'postgres',
  password: 'password'
})

// Test connection
const isConnected = await db.testConnection()
console.log('Connected:', isConnected)
```

### 2. Basic Queries

#### SELECT Queries

```typescript
// Select all users
const users = await db.select().from('users').get()

// Select specific columns
const userNames = await db.select(['name', 'email']).from('users').get()

// Select with column aliases
const usersWithAliases = await db
  .select({ user_name: 'name', user_email: 'email' })
  .from('users')
  .get()

// Filter with WHERE clause (explicit operator)
const activeUsers = await db
  .select()
  .from('users')
  .where('active', '=', true)
  .get()

// Filter with WHERE clause (implicit equals operator)
const user = await db
  .select()
  .from('users')
  .where('id', 1) // Type-safe: null/undefined values are prevented at compile time
  .first()

// Multiple WHERE conditions
const users = await db
  .select()
  .from('users')
  .where('active', '=', true)
  .where('age', '>', 25)
  .get()

// WHERE IN clause
const specificUsers = await db
  .select()
  .from('users')
  .whereIn('id', [1, 2, 3])
  .get()

// WHERE NULL clause
const usersWithoutAge = await db
  .select()
  .from('users')
  .whereNull('age')
  .get()

// Get first result
const firstUser = await db
  .select()
  .from('users')
  .where('id', '=', 1)
  .first()
```

#### INSERT Queries

```typescript
// Insert single record
const newUser = await db
  .table('users')
  .returning(['id', 'name', 'email'])
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    active: true
  })

// Insert multiple records
const newUsers = await db
  .table('users')
  .returning(['id', 'name'])
  .insert([
    { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
    { name: 'Bob Johnson', email: 'bob@example.com', age: 35 }
  ])

// Insert without returning data
await db.table('users').insert({
  name: 'Alice Brown',
  email: 'alice@example.com',
  age: 28
})
```

#### UPDATE Queries

```typescript
// Update single record
const updatedUser = await db
  .table('users')
  .where('id', '=', 1)
  .returning(['id', 'name', 'age'])
  .update({
    name: 'Updated Name',
    age: 31
  })

// Update multiple records
const updatedUsers = await db
  .table('users')
  .where('age', '>', 25)
  .returning(['id', 'name', 'active'])
  .update({ active: false })

// Update with WHERE IN
const users = await db
  .table('users')
  .whereIn('id', [1, 2, 3])
  .returning(['id', 'name', 'age'])
  .update({ age: 40 })
```

#### DELETE Queries

```typescript
// Delete single record
const deletedUser = await db
  .table('users')
  .where('id', '=', 1)
  .delete()

// Delete multiple records
const deletedUsers = await db
  .table('users')
  .where('active', '=', false)
  .delete()

// Delete with WHERE IN
const users = await db
  .table('users')
  .whereIn('id', [1, 2, 3])
  .delete()
```

### 3. Models

Bun ORM provides a powerful Model system for object-relational mapping (ORM) functionality. Models allow you to work with database records as objects with methods and properties.

#### Creating a Model

```typescript
import { Model } from 'bun-spark'
import { column } from 'bun-spark'

class User extends Model {
  @column({ primary: true })
  public id: number

  @column({ name: 'name' })
  public name: string

  @column({ 
    serializeAs: 'user_email', 
    serialize: (value: string) => `My email is ${value}` 
  })
  public email: string

  @column({ name: 'age' })
  public age: number

  @column({ name: 'active' })
  public active: boolean

  @column({ name: 'created_at' })
  public createdAt: Date
}
```

#### Model Decorators

The `@column` decorator configures how model properties map to database columns:

```typescript
@column({
  name: 'column_name',        // Database column name (optional, defaults to property name)
  primary: true,              // Mark as primary key
  serializeAs: 'custom_name', // Custom name for serialization
  serialize: (value: string) => `My email is ${value}` // Custom serializer function
})
```

#### Basic Model Operations

```typescript
// Create a new user
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})

// Find user by ID
const user = await User.find(1)
if (user) {
  console.log(user.name) // Access properties directly
}

// Get all users
const users = await User.all()
users.forEach(user => {
  console.log(`${user.name} (${user.email})`)
})

// Insert multiple users
const newUsers = await User.insert([
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35 }
])

// Update user properties
if (user) {
  user.age = 31
  await user.save() // Save changes to database
}

// Delete user
if (user) {
  await user.delete()
}
```

#### Model Querying

Models provide a fluent query interface:

```typescript
// Basic queries
const activeUsers = await User.query()
  .where('active', true)
  .get()

const user = await User.query()
  .where('email', 'john@example.com')
  .first()

// Complex queries
const users = await User.query()
  .where('age', '>', 25)
  .where('active', true)
  .orderBy('name', 'ASC')
  .limit(10)
  .get()

// Count records
const count = await User.query()
  .where('active', true)
  .count()
```

#### Model Serialization

Models can be serialized to plain objects for API responses:

```typescript
const user = await User.find(1)
if (user) {
  // Serialize to plain object
  const userData = user.serialize()
  console.log(userData) // { id: 1, name: 'John Doe', email: 'john@example.com', ... }
}
```

#### Model Hydration

Convert database results back to model instances:

```typescript
// Hydrate single record
const userData = { id: 1, name: 'John Doe', email: 'john@example.com' }
const user = User.hydrate(userData)

// Hydrate multiple records
const usersData = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
]
const users = User.hydrateMany(usersData)
```

#### Model Metadata

Access model configuration and column information:

```typescript
// Get model metadata
const metadata = User.getMetadata()
console.log(metadata.tableName) // 'users'
console.log(metadata.columns)   // Array of column definitions

// Get table name
console.log(User.db.table) // QueryBuilder for this model's table
```

#### Advanced Model Features

```typescript
class Post extends Model {
  @Column({ name: 'id', primary: true, autoIncrement: true })
  id!: number

  @Column({ name: 'title' })
  title!: string

  @Column({ name: 'content' })
  content!: string

  @Column({ name: 'user_id' })
  userId!: number

  // Custom methods
  get excerpt(): string {
    return this.content.substring(0, 100) + '...'
  }

  // Static methods for business logic
  static async findByAuthor(userId: number) {
    return this.query().where('user_id', userId).get()
  }

  static async published() {
    return this.query().where('published', true).get()
  }
}

// Usage
const userPosts = await Post.findByAuthor(1)
const publishedPosts = await Post.published()
```

### 4. Transactions

```typescript
import { Transaction } from 'bun-spark'

// Successful transaction
const result = await db.transaction(async (trx: Transaction) => {
  // Insert data
  await trx
    .table('users')
    .insert({ name: 'John Doe', email: 'john@example.com' })

  // Update data
  await trx
    .table('users')
    .where('name', '=', 'John Doe')
    .update({ age: 30 })

  // Return final result
  return await trx
    .select()
    .from('users')
    .where('name', '=', 'John Doe')
    .first()
})

// Failed transaction (automatic rollback)
try {
  await db.transaction(async (trx: Transaction) => {
    await trx
      .table('users')
      .insert({ name: 'Jane Smith', email: 'jane@example.com' })
    
    // This will fail and cause rollback
    await trx.raw('INSERT INTO users (name) VALUES (NULL)')
  })
} catch (error) {
  console.log('Transaction rolled back:', error.message)
}
```

### 5. Raw SQL Queries

```typescript
// Execute raw SQL
const result = await db.raw(`
  SELECT u.name, COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  GROUP BY u.id, u.name
  HAVING COUNT(p.id) > 0
`)

// Create tables
await db.raw(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)
```

### 6. Type Safety

Bun ORM provides compile-time type safety to prevent common errors:

```typescript
// ✅ These work correctly
db.select().from('users').where('id', 1)
db.select().from('users').where('id', '=', 1)
db.select().from('users').whereIn('id', [1, 2, 3])

// ❌ These will cause TypeScript compilation errors
db.select().from('users').where('id', null) // Error: null not assignable
db.select().from('users').where('id', undefined) // Error: undefined not assignable
db.select().from('users').whereIn('id', [1, null, 3]) // Error: null not assignable
```

The library uses `NonNullable<any>` types to ensure that null and undefined values are caught at compile time, preventing runtime errors.

## API Reference

### Connection Configuration

```typescript
interface ConnectionConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
}
```

### Query Builder Methods

#### SELECT
- `select(columns?: string[] | Record<string, string>)` - Start a SELECT query
- `from(table: string)` - Specify the table to query
- `where(column: string, operatorOrValue: NonNullable<any>, value?: NonNullable<any>)` - Add WHERE condition (supports both `where('id', '=', 2)` and `where('id', 2)` syntax, prevents null/undefined values)
- `whereIn(column: string, values: NonNullable<any>[])` - Add WHERE IN condition (prevents null/undefined values)
- `whereNotIn(column: string, values: NonNullable<any>[])` - Add WHERE NOT IN condition (prevents null/undefined values)
- `whereNull(column: string)` - Add WHERE NULL condition
- `whereNotNull(column: string)` - Add WHERE NOT NULL condition
- `orderBy(column: string, direction?: 'ASC' | 'DESC')` - Add ORDER BY clause
- `limit(count: number)` - Add LIMIT clause
- `offset(count: number)` - Add OFFSET clause
- `get()` - Execute query and return all results
- `first()` - Execute query and return first result

#### INSERT
- `table(table: string)` - Specify the table to insert into
- `insert(data: Record<string, any> | Record<string, any>[])` - Insert data
- `returning(columns: string[])` - Specify columns to return

#### UPDATE
- `table(table: string)` - Specify the table to update
- `update(data: Record<string, any>)` - Update data
- `returning(columns: string[])` - Specify columns to return

#### DELETE
- `table(table: string)` - Specify the table to delete from
- `delete()` - Delete records

### Transaction Methods

- `transaction(callback: TransactionCallback)` - Execute a transaction
- `raw(sql: string)` - Execute raw SQL within transaction

### Model Methods

#### Static Methods
- `Model.create(data: Partial<InstanceType<T>>)` - Create a single record
- `Model.insert(data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[])` - Insert one or more records
- `Model.find(id: number)` - Find record by primary key
- `Model.all()` - Get all records
- `Model.query()` - Get query builder for this model
- `Model.hydrate(data: Record<string, any>)` - Convert plain object to model instance
- `Model.hydrateMany(data: Record<string, any>[])` - Convert array of plain objects to model instances
- `Model.getMetadata()` - Get model metadata (table name, columns)

#### Instance Methods
- `model.delete()` - Delete the current record
- `model.serialize()` - Serialize model to plain object

#### Column Decorator Options
- `name: string` - Database column name
- `primary: boolean` - Mark as primary key
- `autoIncrement: boolean` - Auto-incrementing column
- `type: string` - SQL data type
- `nullable: boolean` - Allow NULL values
- `default: any` - Default value
- `unique: boolean` - Unique constraint
- `serializeAs: string` - Custom name for serialization

## Development

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/select.test.ts
```

### Environment Setup

Set up your test database environment variables:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=bun_orm
export DB_USER=postgres
export DB_PASSWORD=postgres
```

### Available Scripts

```bash
# Development
bun run dev              # Start development server with watch mode
bun run build            # Build the project
bun run type-check       # Run TypeScript type checking

# Testing
bun run test             # Run all tests
bun run test:coverage    # Run tests with coverage

# Code Quality
bun run lint             # Run linting
bun run lint:fix         # Fix linting issues
bun run format           # Format code with Biome
```

### CI/CD

This project uses GitHub Actions for continuous integration:

- **Test Workflow** (`.github/workflows/test.yml`): Runs tests on push and pull requests
- **Lint Workflow** (`.github/workflows/lint.yml`): Checks code formatting and linting
- **Publish Workflow** (`.github/workflows/publish.yml`): Publishes to NPM on releases

The CI pipeline:
1. Sets up Bun runtime
2. Starts PostgreSQL service container
3. Installs dependencies
4. Runs tests with database integration
5. Checks code quality (linting, formatting, type checking)
6. Publishes to NPM when a new release is created

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] JOIN support
- [ ] Aggregation functions (COUNT, SUM, AVG, etc.)
- [ ] Migration system
- [ ] Connection pooling
- [ ] Query logging
- [ ] Prepared statements
- [ ] Multiple database support (MySQL, SQLite)
