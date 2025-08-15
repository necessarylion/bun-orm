# Basic Queries

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
