# Basic Queries

## insert

Single record

```ts
const users = await db.table('users')
  .insert({ name: 'John Doe', email: 'john.doe@example.com' })
```

Multiple records

```ts
const users = await db.table('users')
  .insert([
    { name: 'John Doe', email: 'john.doe@example.com' },
    { name: 'Jane Doe', email: 'jane.doe@example.com' }
  ])
```

## update

```ts
const user = await db.table('users')
  .where('id', 1)
  .update({ name: 'John Doe', email: 'john.doe@example.com' })
```

## delete

```ts
const user = await db.table('users')
  .where('id', 1)
  .delete()
```

## upsert

Note: The table must have a unique constraint on the conflict column(s) for upsert to work properly.

```ts
const user = await db.table('users')
  .onConflict('id')
  .upsert({ id: 1, name: 'John Doe', email: 'john.doe@example.com' })

const user = await db.table('users')
  .onConflict(['email', 'name'])
  .upsert({ name: 'John Doe', email: 'john.doe@example.com' })
```

## all

```ts hl_lines="2 5"
const users = await db.table('users')
  .get()

const users = await db.table('users')
  .all()

// output 
[
  {
    name: 'John Doe',
    email: 'john.doe@example.com'
    age: 25
  }
]
```

## select

The `select` method allows selecting columns from the database table. You can either pass an array of columns or pass them as multiple arguments.

```ts hl_lines="2"
const users = await db.table('users')
  .select(['name', 'email'])
  .get()
```

```ts hl_lines="2"
const users = await db.table('users')
  .select('name', 'email')
  .get()
```

You can define aliases for the columns using the as expression or passing an object of key-value pair.

```ts hl_lines="2"
const users = await db.table('users')
  .select('name as user_name', 'email as user_email')
  .get()
```

```ts hl_lines="4 5"
const users = await db.table('users')
  .select({ 
    // Key is alias name
    user_name: 'name', 
    user_email: 'email' 
  })
  .get()

// output
[
  {
    user_name: 'John Doe',
    user_email: 'john.doe@example.com'
  }
]
```

## first

The select queries always return an array of objects, even when the query is intended to fetch a single row. However, using the first method will give you the first row or null (when there are no rows).

```ts hl_lines="2"
const user = await db.table('users')
  .where('id', 1)
  .first()

// output
{
  name: 'John Doe',
  email: 'john.doe@example.com'
  age: 25
}
```

## where

The where method is used to define the where clause in your SQL queries. The query builder accepts a wide range of arguments types to let you leverage the complete power of SQL.

```ts hl_lines="2 3"
const users = await db.table('users')
  .where('active', true)
  .where('age', '>', 25)
  .where('name', 'like', '%John%')
  .get()
```

You can create where groups by passing a callback to the where method. For example:

```ts hl_lines="3 8"
const query = db
  .table('users')
  .where((query) => {
    query
      .where('username', 'James Bond')
      .whereNull('deleted_at')
  })
  .orWhere((query) => {
    query
      .where('email', 'james@example.com')
      .whereNull('deleted_at')
  })
```

## whereIn

The whereIn method is used to define the wherein SQL clause. The method accepts the column name as the first argument and an array of values as the second argument.

```ts hl_lines="2"
const users = await db.table('users')
  .whereIn('id', [1, 2, 3])
  .get()
```

## whereNull

The whereNull method adds a where null clause to the query.

```ts hl_lines="2"
const users = await db.table('users')
  .whereNull('age')
  .get()

```

The whereNotNull method adds a where not null clause to the query.

## whereNotNull

```ts hl_lines="2"
const users = await db.table('users')
  .whereNotNull('age')
  .get()
```

## whereNotIn

The whereNotIn method adds a where not in clause to the query.

```ts hl_lines="2"
const users = await db.table('users')
  .whereNotIn('id', [1, 2, 3])
  .get()
```

## orWhere

The where method is used to define the where clause in your SQL queries. The query builder accepts a wide range of arguments types to let you leverage the complete power of SQL.

```ts hl_lines="3"
const users = await db.table('users')
  .where('active', '=', true)
  .orWhere('age', '>', 25)
  .get()
```

## orWhereIn

The whereIn method is used to define the wherein SQL clause. The method accepts the column name as the first argument and an array of values as the second argument.

```ts hl_lines="3"
const users = await db.table('users')
  .where('active', '=', true)
  .OrWhereIn('id', [1, 2, 3])
  .get()
```

## orWhereNull

The whereNull method adds a where null clause to the query.

```ts hl_lines="3"
const users = await db.table('users')
  .where('active', '=', true)
  .orWhereNull('age')
  .get()

```

The whereNotNull method adds a where not null clause to the query.

## orWhereNotNull

```ts hl_lines="3"
const users = await db.table('users')
  .where('active', '=', true)
  .orWhereNotNull('age')
  .get()
```

## orWhereNotIn

The whereNotIn method adds a where not in clause to the query.

```ts hl_lines="3"
const users = await db.table('users')
  .where('active', '=', true)
  .orWhereNotIn('id', [1, 2, 3])
  .get()
```

## whereRaw

You can use the whereRaw method to express conditions not covered by the existing query builder methods. Always make sure to use bind parameters to define query values.

```ts hl_lines="2 3"
const users = await db.table('users')
  .whereRaw('age > ?', [25])
  .orWhereRaw('name = ?', ['John Doe'])
  .get()
```

## orderBy

The orderBy method is used to sort the results of the query.

```ts hl_lines="2"
const users = await db.table('users')
  .orderBy('name', 'desc') // or 'asc'
  .get()
```

## groupBy

The groupBy method is used to group the results of the query.

```ts hl_lines="2"
const users = await db.table('users')
  .groupBy('name')
  .get()
```

## limit

The limit method is used to limit the number of results returned by the query.

```ts hl_lines="2"
const users = await db.table('users')
  .limit(10)
  .get()
```

## offset

The offset method is used to skip a number of results in the query.

```ts hl_lines="2"
const users = await db.table('users')
  .offset(5)
  .get()
```

## Transactions

Bun ORM supports both automatic and manual transaction management.

### Callback (Automatic) Transactions

The `transaction` method provides an easy way to run database transactions. It accepts a callback function, and if the callback throws an exception, the transaction is automatically rolled back. Otherwise, the transaction is committed if the callback runs successfully.

```ts
// Successful transaction
const result = await db.transaction(async (trx) => {
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
```

If an error is thrown inside the transaction callback, the transaction will be automatically rolled back.

```ts
// Failed transaction (automatic rollback)
try {
  await db.transaction(async (trx) => {
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

### Manual Transactions

For more control over the transaction lifecycle, you can use manual transactions. The `beginTransaction` method starts a new transaction, and you can use the `commit` and `rollback` methods to control the outcome.

```ts hl_lines="2 9 11"
// Manual transaction with commit
const trx = await db.beginTransaction()
try {
  await trx
    .table('users')
    .where('name', 'John')
    .update({ age: 30 })

  await trx.commit()
} catch (error) {
  await trx.rollback()
  console.log('Transaction rolled back:', error.message)
}
```

```ts hl_lines="2 12 14"
// Manual transaction with rollback
const trx = await db.beginTransaction()
try {
  await trx
    .table('users')
    .where('name', 'John')
    .update({ age: 25 })

  // Some operation that might fail
  throw new Error('Something went wrong')

  await trx.commit()
} catch (error) {
  await trx.rollback()
  console.log('Transaction rolled back:', error.message)
}
```
