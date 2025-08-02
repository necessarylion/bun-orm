import { spark } from '../index';

async function main() {
  // Initialize database connection
  const db = spark({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'bun_orm',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  // Test connection
  const isConnected = await db.testConnection();
  if (!isConnected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  console.log('✅ Connected to database');

  // Create example tables
  await db.raw(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      balance DECIMAL(10,2) DEFAULT 0
    )
  `);

  await db.raw(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      from_account_id INTEGER REFERENCES accounts(id),
      to_account_id INTEGER REFERENCES accounts(id),
      amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clear existing data
  await db.raw('DELETE FROM transactions');
  await db.raw('DELETE FROM accounts');

  console.log('📋 Created example tables');

  // Example 1: Simple transaction with automatic commit/rollback
  console.log('\n🔄 Example 1: Simple transaction with automatic commit/rollback');
  
  try {
    const result = await db.transaction(async (trx) => {
      // Create accounts
      const account1 = await trx.insert({ name: 'Alice', balance: 1000.00 })
        .into('accounts')
        .returning(['id', 'name', 'balance'])
        .execute();

      const account2 = await trx.insert({ name: 'Bob', balance: 500.00 })
        .into('accounts')
        .returning(['id', 'name', 'balance'])
        .execute();

      // Transfer money
      await trx.update({ balance: 900.00 })
        .table('accounts')
        .where('id', '=', account1[0].id)
        .execute();

      await trx.update({ balance: 600.00 })
        .table('accounts')
        .where('id', '=', account2[0].id)
        .execute();

      // Record the transaction
      await trx.insert({
        from_account_id: account1[0].id,
        to_account_id: account2[0].id,
        amount: 100.00
      }).into('transactions').execute();

      // Return final account balances
      return await trx.select(['name', 'balance'])
        .from('accounts')
        .orderBy('name', 'ASC')
        .get();
    });

    console.log('✅ Transaction completed successfully');
    console.log('Final account balances:');
    result.forEach(account => {
      console.log(`  ${account.name}: $${account.balance}`);
    });
  } catch (error: any) {
    console.error('❌ Transaction failed:', error.message);
  }

  // Example 2: Transaction that fails and rolls back
  console.log('\n🔄 Example 2: Transaction that fails and rolls back');
  
  try {
    await db.transaction(async (trx) => {
      // Create an account
      await trx.insert({ name: 'David', balance: 300.00 })
        .into('accounts')
        .execute();

      console.log('✅ Created account for David');

      // This will fail due to duplicate primary key (trying to insert with id=1 again)
      await trx.raw(
        'INSERT INTO accounts (id, name, balance) VALUES (1, \'Eve\', 100.00)'
      );

      console.log('❌ This should not be reached');
    });
  } catch (error: any) {
    console.log('❌ Transaction failed as expected:', error.message);
  }

  // Verify David's account was not created due to rollback
  const davidAccount = await db.select()
    .from('accounts')
    .where('name', '=', 'David')
    .first();

  if (!davidAccount) {
    console.log('✅ David\'s account was not created (rollback worked)');
  } else {
    console.log('❌ David\'s account was created (rollback failed)');
  }

  // Example 3: Using raw SQL in transactions
  console.log('\n🔄 Example 3: Using raw SQL in transactions');
  
  const result = await db.transaction(async (trx) => {
    // Use raw SQL to insert
    await trx.raw(
      'INSERT INTO accounts (name, balance) VALUES ($1, $2)',
      ['Frank', 1200.00]
    );

    // Use raw SQL to select
    const accounts = await trx.raw(
      'SELECT name, balance FROM accounts WHERE balance > $1 ORDER BY balance DESC',
      [1000.00]
    );

    return accounts;
  });

  console.log('✅ High balance accounts:');
  result.forEach(account => {
    console.log(`  ${account.name}: $${account.balance}`);
  });

  // Example 4: Complex transaction with multiple operations
  console.log('\n🔄 Example 4: Complex transaction with multiple operations');
  
  try {
    const finalState = await db.transaction(async (trx) => {
      // Get all accounts
      const accounts = await trx.select(['id', 'name', 'balance'])
        .from('accounts')
        .orderBy('name', 'ASC')
        .get();

      console.log('📊 Initial account balances:');
      accounts.forEach(account => {
        console.log(`  ${account.name}: $${account.balance}`);
      });

      // Perform multiple transfers
      for (let i = 0; i < accounts.length - 1; i++) {
        const fromAccount = accounts[i];
        const toAccount = accounts[i + 1];
        const transferAmount = 50.00;

        // Update balances
        await trx.update({ balance: parseFloat(fromAccount.balance) - transferAmount })
          .table('accounts')
          .where('id', '=', fromAccount.id)
          .execute();

        await trx.update({ balance: parseFloat(toAccount.balance) + transferAmount })
          .table('accounts')
          .where('id', '=', toAccount.id)
          .execute();

        // Record transaction
        await trx.insert({
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          amount: transferAmount
        }).into('transactions').execute();

        console.log(`💰 Transferred $${transferAmount} from ${fromAccount.name} to ${toAccount.name}`);
      }

      // Return final state
      return await trx.select(['name', 'balance'])
        .from('accounts')
        .orderBy('name', 'ASC')
        .get();
    });

    console.log('✅ All transfers completed successfully');
    console.log('📊 Final account balances:');
    finalState.forEach(account => {
      console.log(`  ${account.name}: $${account.balance}`);
    });
  } catch (error: any) {
    console.error('❌ Complex transaction failed:', error.message);
  }

  // Show transaction history
  console.log('\n📜 Transaction History:');
  const transactions = await db.select([
    'transactions.amount',
    'from_acc.name as from_account',
    'to_acc.name as to_account'
  ])
    .from('transactions')
    .join('accounts', 'transactions.from_account_id = from_acc.id', 'from_acc')
    .join('accounts', 'transactions.to_account_id = to_acc.id', 'to_acc')
    .get();

  transactions.forEach(tx => {
    console.log(`  ${tx.from_account} → ${tx.to_account}: $${tx.amount}`);
  });

  // Clean up
  await db.close();
  console.log('\n👋 Database connection closed');
}

main().catch(console.error); 