# Model

Bun Spark Model is a simple, yet powerful ORM (Object-Relational Mapper) that allows you to interact with your database tables in an object-oriented way. It is built on top of the query builder and provides a simple and elegant way to perform CRUD operations.

## Defining a Model

To define a model, you need to create a class that extends the `Model` class and use the `@column` decorator to define the table columns.

```ts
import { Model, column } from 'bun-spark'

class User extends Model {
  @column({ primary: true })
  public id: number

  @column()
  public name: string

  @column()
  public email: string
}
```

By default, Bun Spark will use the pluralized version of the class name as the table name. In this case, the table name will be `users`. You can customize the table name by adding a static `tableName` property to the model.

```ts
class User extends Model {
  public static override tableName = 'my_users'

  // ...
}
```

## Column decorator

The `@column` decorator is used to define the table columns. It accepts an options object with the following properties:

- `primary`: A boolean that indicates if the column is a primary key.
- `name`: The name of the column in the database. By default, it is the same as the property name.
- `serializeAs`: The name of the property in the serialized object. By default, it is the same as the property name.
- `serialize`: A function that allows you to transform the value of the column when serializing the model.

```ts
class User extends Model {
  @column({ primary: true })
  public id: number

  @column({
    name: 'full_name',
    serializeAs: 'full_name',
    serialize: (value: string) => `My name is ${value}`,
  })
  public name: string

  @column()
  public email: string
}
```

## Creating a new record

You can create a new record in the database using the `create` static method.

```ts
const user = await User.create({
  name: 'John Doe',
  email: 'john.doe@example.com',
})
```

The `create` method will return a new instance of the model with the `id` property set.

You can also use the `insert` method to insert multiple records at once.

```ts
const users = await User.insert([
  { name: 'John Doe', email: 'john.doe@example.com' },
  { name: 'Jane Doe', email: 'jane.doe@example.com' },
])
```

## Finding records

You can find a record by its primary key using the `find` static method.

```ts
const user = await User.find(1)
```

You can find all records in the table using the `all` static method.

```ts
const users = await User.all()
```

## Querying records

You can use the `query` static method to create a new query builder instance for the model.

```ts
const users = await User.query()
  .where('name', 'like', '%John%')
  .get()
```

## Updating records

You can update a record by changing its properties and calling the `save` method.

```ts
const user = await User.find(1)
user.name = 'John Smith'
await user.save()
```

## Deleting records

You can delete a record by calling the `delete` method.

```ts
const user = await User.find(1)
await user.delete()
```

You can also delete records using the query builder.

```ts
await User.query().where('name', 'John Doe').delete()
```

## Serializing a model

You can serialize a model to a plain JavaScript object using the `serialize` method.

```ts
const user = await User.find(1)
const data = user.serialize()
```

## Transactions

You can use transactions with models by calling the `useTransaction` static method.

```ts
const trx = await db.beginTransaction()

try {
  await User.useTransaction(trx).create({
    name: 'John Doe',
    email: 'john.doe@example.com'
  })
  await trx.commit()
} catch(e) {
  await trx.rollback()
}
```