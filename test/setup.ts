import { BunORM, initializeORM } from '../src/orm';

// Test database configuration
export const TEST_DB_CONFIG = {
  database: ':memory:' // Use in-memory SQLite for tests
};

// Global test ORM instance
export let testORM: BunORM;

// Setup function to initialize test database
export async function setupTestDatabase(): Promise<void> {
  testORM = initializeORM(TEST_DB_CONFIG);
  await testORM.connect();
  
  // Create test tables
  createTestTables();
  
  // Insert initial test data
  insertTestData();
}

// Teardown function to clean up test database
export async function teardownTestDatabase(): Promise<void> {
  if (testORM && testORM.isConnected()) {
    // Drop test tables
    await dropTestTables();
    await testORM.disconnect();
  }
}

// Create test tables
async function createTestTables(): Promise<void> {
  const db = testORM['connection'].getSql();
  
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER,
      active INTEGER DEFAULT 1,
      verified INTEGER DEFAULT 0,
      premium INTEGER DEFAULT 0,
      login_count INTEGER DEFAULT 0,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create posts table
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create post_categories junction table
  db.run(`
    CREATE TABLE IF NOT EXISTS post_categories (
      post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, category_id)
    )
  `);
}

// Drop test tables
async function dropTestTables(): Promise<void> {
  const db = testORM['connection'].getSql();
  
  db.run('DROP TABLE IF EXISTS post_categories');
  db.run('DROP TABLE IF EXISTS categories');
  db.run('DROP TABLE IF EXISTS posts');
  db.run('DROP TABLE IF EXISTS users');
}

// Insert test data
export async function insertTestData(): Promise<void> {
  if (!testORM || !testORM.isConnected()) {
    return; // Skip if not connected
  }
  
  const db = testORM['connection'].getSql();
  
  // Insert test users
  db.run(`
    INSERT INTO users (name, email, age, active, verified, premium, login_count) VALUES
    ('John Doe', 'john@example.com', 25, 1, 1, 0, 5),
    ('Jane Smith', 'jane@example.com', 30, 1, 1, 1, 10),
    ('Bob Johnson', 'bob@example.com', 35, 0, 0, 0, 2),
    ('Alice Brown', 'alice@example.com', 28, 1, 1, 0, 8),
    ('Charlie Wilson', 'charlie@example.com', 22, 1, 0, 0, 1)
  `);

  // Insert test categories
  db.run(`
    INSERT INTO categories (name, description) VALUES
    ('Technology', 'Tech-related posts'),
    ('Travel', 'Travel experiences'),
    ('Food', 'Food and recipes'),
    ('Lifestyle', 'Lifestyle tips')
  `);

  // Insert test posts
  db.run(`
    INSERT INTO posts (title, content, user_id, published) VALUES
    ('Getting Started with Bun', 'Bun is a fast JavaScript runtime...', 1, 1),
    ('My Travel to Japan', 'Amazing experience in Tokyo...', 2, 1),
    ('Best Coffee Shops', 'Here are my favorite coffee places...', 3, 0),
    ('Web Development Tips', 'Essential tips for web developers...', 1, 1),
    ('Healthy Recipes', 'Quick and healthy meal ideas...', 4, 1)
  `);

  // Insert post-category relationships
  db.run(`
    INSERT INTO post_categories (post_id, category_id) VALUES
    (1, 1), -- Getting Started with Bun -> Technology
    (2, 2), -- My Travel to Japan -> Travel
    (3, 3), -- Best Coffee Shops -> Food
    (4, 1), -- Web Development Tips -> Technology
    (5, 4)  -- Healthy Recipes -> Lifestyle
  `);
}

// Clear test data
export async function clearTestData(): Promise<void> {
  if (!testORM || !testORM.isConnected()) {
    return; // Skip if not connected
  }
  
  const db = testORM['connection'].getSql();
  
  db.run('DELETE FROM post_categories');
  db.run('DELETE FROM posts');
  db.run('DELETE FROM categories');
  db.run('DELETE FROM users');
}

// Test interfaces
export interface TestUser {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
  verified: boolean;
  premium: boolean;
  login_count: number;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TestPost {
  id: number;
  title: string;
  content: string;
  user_id: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TestCategory {
  id: number;
  name: string;
  description: string;
  created_at: Date;
} 