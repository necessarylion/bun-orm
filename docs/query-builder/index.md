# Basic Queries

## All

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

## Select

The `select` method allows selecting columns from the database table. You can either pass an array of columns or pass them as multiple arguments.

### Select specific column

```ts hl_lines="2"
const users = await db.table('users')
  .select(['name', 'email'])
  .get()

// output
[
  {
    name: 'John Doe',
    email: 'john.doe@example.com'
  }
]
```

### Select with column aliases

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

## First

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

## Where

The where method is used to define the where clause in your SQL queries. The query builder accepts a wide range of arguments types to let you leverage the complete power of SQL.

```ts hl_lines="2 3"
const users = await db.table('users')
  .where('active', '=', true)
  .where('age', '>', 25)
  .get()
```

## Where In

The whereIn method is used to define the wherein SQL clause. The method accepts the column name as the first argument and an array of values as the second argument.

```ts hl_lines="2"
const users = await db.table('users')
  .whereIn('id', [1, 2, 3])
  .get()
```

## Where null

The whereNull method adds a where null clause to the query.

```ts hl_lines="2"
const users = await db.table('users')
  .whereNull('age')
  .get()

```

The whereNotNull method adds a where not null clause to the query.

## Where not null

```ts hl_lines="2"
const users = await db.table('users')
  .whereNotNull('age')
  .get()
```

## Where not in

The whereNotIn method adds a where not in clause to the query.

```ts hl_lines="2"
const users = await db.table('users')
  .whereNotIn('id', [1, 2, 3])
  .get()
```

## Order by

The orderBy method is used to sort the results of the query.

```ts hl_lines="2"
const users = await db.table('users')
  .orderBy('name', 'desc') // or 'asc'
  .get()
```

## Limit

The limit method is used to limit the number of results returned by the query.

```ts hl_lines="2"
const users = await db.table('users')
  .limit(10)
  .get()
```

## Offset

The offset method is used to skip a number of results in the query.

```ts hl_lines="2"
const users = await db.table('users')
  .offset(5)
  .get()
```
