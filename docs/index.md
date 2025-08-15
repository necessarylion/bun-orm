# Introduction

A lightweight, type-safe query builder for Bun. Built with performance and developer experience in mind.

## Supported Drivers

- PostgreSQL
- SQLite

## Installation

```
bun add bun-spark
```

## Features

- **Fast**: Built on Bun's high-performance runtime
- **Type-safe**: Full TypeScript support with comprehensive type definitions and compile-time null/undefined prevention
- **Simple**: Intuitive query builder API
- **Transactions**: Full transaction support with automatic rollback
- **Tested**: Comprehensive test suite with real database integration


## Quick Start

=== "PostgreSQL"
    ```ts hl_lines="4"
    import { spark } from 'bun-spark'

    const db = spark({
      driver: 'postgres'
      host: 'localhost',
      port: 5432,
      database: 'my_database',
      username: 'postgres',
      password: 'password'
    })

    // `db` is a query builder instance
    const isConnected = await db.testConnection()
    console.log('Connected:', isConnected)

    const users = await db.table('users').where('id', 1).get()
    console.log(users)
    ```

=== "SQLite"
    ```ts  hl_lines="4"
    import { spark } from 'bun-spark'

    const db = spark({
      driver: 'sqlite'
      filename: 'db.sqlite'
    })

    // `db` is a query builder instance
    const isConnected = await db.testConnection()
    console.log('Connected:', isConnected)

    const users = await db.table('users').where('id', 1).get()
    console.log(users)
    ```