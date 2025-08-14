import { env } from 'bun'
import { spark, type ConnectionConfig } from '../index'

// Test database configuration
export const testConfig: ConnectionConfig = {
  driver: (env.DB_DRIVER ?? 'postgres') as 'postgres' | 'sqlite',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'bun_orm',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  debug: false,
}

// Initialize spark with test configuration
const db = spark(testConfig)

// Test connection at startup
db.testConnection()
  .then((isConnected) => {
    if (!isConnected) {
      console.error('Failed to connect to test database. Please check your PostgreSQL connection.')
      process.exit(1)
    }
    console.log('✅ Connected to test database successfully')
  })
  .catch((error) => {
    console.error('❌ Database connection error:', error)
    process.exit(1)
  })

export function getAutoIncrementSQL() {
  const driver = testConfig.driver
  if (driver === 'sqlite') {
    return `INTEGER PRIMARY KEY AUTOINCREMENT`
  }
  return `SERIAL PRIMARY KEY`
}

// Test tables setup
export async function setupTestTables() {
  // Create users table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id ${getAutoIncrementSQL()},
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      age INTEGER,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create posts table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS posts (
      id ${getAutoIncrementSQL()},
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      content TEXT,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create categories table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS categories (
      id ${getAutoIncrementSQL()},
      name VARCHAR(255) NOT NULL,
      description TEXT
    )
  `)

  // Create post_categories junction table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS post_categories (
      post_id INTEGER REFERENCES posts(id),
      category_id INTEGER REFERENCES categories(id),
      PRIMARY KEY (post_id, category_id)
    )
  `)
}

// Clean up test data
export async function cleanupTestData() {
  await db.dropTable('post_categories', { cascade: true })
  await db.dropTable('posts', { cascade: true })
  await db.dropTable('categories', { cascade: true })
  await db.dropTable('users', { cascade: true })
}

// Insert test data
export async function insertTestData() {
  // Insert users
  await db.table('users').insert([
    { name: 'John Doe', email: 'john@example.com', age: 30, active: true },
    { name: 'Jane Smith', email: 'jane@example.com', age: 25, active: true },
    { name: 'Bob Johnson', email: 'bob@example.com', age: 35, active: false },
    { name: 'Alice Brown', email: 'alice@example.com', age: 28, active: true },
  ])

  // Insert categories
  await db.table('categories').insert([
    { name: 'Technology', description: 'Tech related posts' },
    { name: 'Travel', description: 'Travel related posts' },
    { name: 'Food', description: 'Food related posts' },
  ])

  // Insert posts
  await db.table('posts').insert([
    {
      user_id: 1,
      title: 'Getting Started with Bun',
      content: 'Bun is a fast JavaScript runtime...',
      published: true,
    },
    {
      user_id: 1,
      title: 'PostgreSQL with Bun',
      content: 'Learn how to use PostgreSQL...',
      published: true,
    },
    {
      user_id: 2,
      title: 'Travel to Japan',
      content: 'My amazing trip to Japan...',
      published: false,
    },
    {
      user_id: 3,
      title: 'Best Pizza Places',
      content: 'Top pizza restaurants in the city...',
      published: true,
    },
  ])

  // Insert post categories
  await db.table('post_categories').insert([
    { post_id: 1, category_id: 1 },
    { post_id: 2, category_id: 1 },
    { post_id: 3, category_id: 2 },
    { post_id: 4, category_id: 3 },
  ])
}

export { db }
