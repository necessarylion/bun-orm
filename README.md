# Bun ORM (Spark)

A lightweight, type-safe query builder for Bun with PostgreSQL support. Built with performance and developer experience in mind.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1. Setup Database Connection](#1-setup-database-connection)
  - [2. Basic Queries (Query Builder)](#2-basic-queries-query-builder)
    - [SELECT Queries](#select-queries)
    - [INSERT Queries](#insert-queries)
    - [UPDATE Queries](#update-queries)
    - [DELETE Queries](#delete-queries)
  - [3. Models (ORM)](#3-models-orm)
    - [Creating a Model](#creating-a-model)
    - [Model Operations](#model-operations)
    - [Querying with Models](#querying-with-models)
  - [4. Transactions](#4-transactions)
  - [5. Raw SQL Queries](#5-raw-sql-queries)
- [Type Safety](#type-safety)
- [API Reference](#api-reference)
  - [Connection Configuration](#connection-configuration)
  - [Query Builder Methods](#query-builder-methods)
  - [Model Methods](#model-methods)
  - [Column Decorator Options](#column-decorator-options)
- [Development](#development)
  - [Running Tests](#running-tests)
  - [Environment Setup](#environment-setup)
  - [Available Scripts](#available-scripts)
- [CI/CD](#cicd)
- [License](#license)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

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

// `db` is a query builder instance
const isConnected = await db.testConnection()
console.log('Connected:', isConnected)
```

### 2. Basic Queries (Query Builder)

#### SELECT Queries

```typescript
// Select all users
const users = await db.table('users').get()

// Select specific columns
const userNames = await db.table('users').select(['name', 'email']).get()

// Select with column aliases
const usersWithAliases = await db
  .table('users')
  .select({ user_name: 'name', user_email: 'email' })
  .get()

// Filter with WHERE clause (explicit operator)
const activeUsers = await db
  .table('users')
  .where('active', '=', true)
  .get()

// Filter with WHERE clause (implicit equals operator)
const user = await db
  .table('users')
  .where('id', 1) // Type-safe: null/undefined values are prevented at compile time
  .first()

// Multiple WHERE conditions
const users = await db
  .table('users')
  .where('active', '=', true)
  .where('age', '>', 25)
  .get()

// WHERE IN clause
const specificUsers = await db
  .table('users')
  .whereIn('id', [1, 2, 3])
  .get()

// WHERE NULL clause
const usersWithoutAge = await db
  .table('users')
  .whereNull('age')
  .get()

// WHERE NOT NULL clause
const usersWithAge = await db
  .table('users')
  .whereNotNull('age')
  .get()

// WHERE NOT IN clause
const excludedUsers = await db
  .table('users')
  .whereNotIn('id', [1, 2, 3])
  .get()

// ORDER BY, LIMIT, and OFFSET
const sortedAndPaginatedUsers = await db
  .table('users')
  .orderBy('name', 'DESC')
  .limit(10)
  .offset(5)
  .get()

// Get first result
const firstUser = await db
  .table('users')
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
  age: 28,
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

### 3. Models (ORM)

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

#### Column Decorator

The `@column` decorator maps model properties to database columns.

```typescript
@column(options?: ColumnOptions)
```

**Options:**

- `name: string`: The database column name. Defaults to the property name.
- `primary: boolean`: Marks the column as the primary key.
- `serializeAs: string`: A custom name for the property when serializing the model.
- `serialize: (value: any) => any`: A function to customize the value when serializing.

**Example:**

```typescript
import { Model, column } from 'bun-spark'

class User extends Model {
  @column({ primary: true })
  public id: number

  @column({ name: 'full_name' })
  public name: string

  @column({
    serializeAs: 'user_email',
    serialize: (value: string) => `Email: ${value}`
  })
  public email: string

  @column({ type: 'number', default: 0 })
  public score: number
}
```

#### Model Operations

```typescript
// Create a new user
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})

// Find a user by ID
const foundUser = await User.find(1)
if (foundUser) {
  console.log(foundUser.name) // Access properties directly
}

// Get all users
const users = await User.all()
users.forEach(user => {
  console.log(`${user.name} (${user.email})`)
})

// Insert multiple users
const newUsers = await User.insert([
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
])

// Update user properties and save
if (foundUser) {
  foundUser.age = 31
  await foundUser.save() // Save changes to the database
}

// Delete a user
if (foundUser) {
  await foundUser.delete()
}
```

#### Querying with Models

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
    .table('users')
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

## Type Safety

This library is designed with type safety as a core principle. It leverages TypeScript to catch common errors at compile time, long before they become runtime issues.

### Compile-Time Null Prevention

The query builder prevents the use of `null` or `undefined` in `where` and `whereIn` clauses, which helps avoid unexpected SQL errors.

```typescript
// ✅ These are valid and type-safe
db.table('users').where('id', 1)
db.table('users').where('id', '=', 1)
db.table('users').whereIn('id', [1, 2, 3])

// ❌ These will cause TypeScript compilation errors
db.table('users').where('id', null)
// Error: Argument of type 'null' is not assignable to parameter of type 'NonNullable<any>'.

db.table('users').where('id', undefined)
// Error: Argument of type 'undefined' is not assignable to parameter of type 'NonNullable<any>'.

db.table('users').whereIn('id', [1, null, 3])
// Error: Type 'null' is not assignable to type 'NonNullable<any>'.
```

This feature is enforced by using `NonNullable<T>` in method signatures, ensuring that you always provide valid values.

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
