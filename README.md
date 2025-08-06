# Bun ORM (Spark)

A lightweight, type-safe query builder for Bun with PostgreSQL support. Built with performance and developer experience in mind.

## Features

- 🚀 **Fast**: Built on Bun's high-performance runtime
- 🔒 **Type-safe**: Full TypeScript support with comprehensive type definitions
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
  .where('id', 1)
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

### 3. Transactions

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

### 4. Raw SQL Queries

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
- `where(column: string, operatorOrValue: string | any, value?: any)` - Add WHERE condition (supports both `where('id', '=', 2)` and `where('id', 2)` syntax)
- `whereIn(column: string, values: any[])` - Add WHERE IN condition
- `whereNotIn(column: string, values: any[])` - Add WHERE NOT IN condition
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
