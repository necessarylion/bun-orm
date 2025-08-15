# Bun Spark (sql query builder for bun)

A lightweight, type-safe query builder for Bun. Built with performance and developer experience in mind.

## [Documentation](https://necessarylion.github.io/bun-spark)

## Supported Drivers

- PostgreSQL
- SQLite

## Features

- **Fast**: Built on Bun's high-performance runtime
- **Type-safe**: Full TypeScript support with comprehensive type definitions and compile-time null/undefined prevention
- **Simple**: Intuitive query builder API
- **Transactions**: Full transaction support with automatic rollback
- **Tested**: Comprehensive test suite with real database integration

## Installation

```bash
bun add bun-spark
```

## Quick Start

### 1. Setup Database Connection

```typescript
import { spark } from 'bun-spark'

const db = spark({
  driver: 'postgresql',
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

### Examples Queries

```typescript
const users = await db.table('users').select(['name', 'email']).get()

const users = await db
  .table('users')
  .where('active', '=', true)
  .where('age', '>', 25)
  .get()

const firstUser = await db
  .table('users')
  .where('id', '=', 1)
  .first()
```

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
touch .env
```

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bun_orm
DB_USER=postgres
DB_PASSWORD=postgres
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

