import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { cleanupTestData, db, insertTestData, setupTestTables } from './setup'
import { Model, column } from '../index'

class Customer extends Model {
  public static override tableName = 'users'

  @column({ primary: true })
  public id: number

  @column({
    serializeAs: 'full_name',
    serialize: (value: string) => `My name is ${value}`,
  })
  public name: string

  @column()
  public age: number

  @column()
  public email: string

  @column({ name: 'created_at', serializeAs: 'created_time' })
  public createdTime: Date

  public info(): string {
    return `${this.name} ${this.email}`
  }
}

describe('Model with custom table name', () => {
  beforeEach(async () => {
    await setupTestTables()
    await insertTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('should create a new user with custom serialize', async () => {
    const user = await Customer.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 20,
    })
    const data = user.serialize()
    expect(data.id).toBeDefined()
    expect(data).toBeDefined()
    expect(data.full_name).toBe('My name is John Doe')
    expect(data.email).toBe('john.doe@example.com')
    expect(data.created_at).toBeDefined
  })

  it('should create a new user', async () => {
    const user = await Customer.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 20,
    })
    expect(user.id).toBeDefined()
    expect(user).toBeDefined()
    expect(user.name).toBe('John Doe')
    expect(user.email).toBe('john.doe@example.com')
  })

  it('should find a user by id', async () => {
    const user = await Customer.find(1)
    expect(user?.id).toBe(1)
    expect(user?.name).toBe('John Doe')
    expect(user?.email).toBe('john@example.com')
    expect(user?.info()).toBe('John Doe john@example.com')
  })

  it('should find all users', async () => {
    const users = await Customer.all()
    expect(users.length).toBeGreaterThan(2)
    expect(users[0]?.id).toBe(1)
    expect(users[0]?.name).toBe('John Doe')
    expect(users[0]?.email).toBe('john@example.com')
  })

  it('should find a user', async () => {
    const customer = await Customer.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = customer.id
    await customer.delete()
    const deletedUser = await Customer.find(id)
    expect(deletedUser).toBeNull()
  })

  it('should find a user by id and remove it', async () => {
    const user = await Customer.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = user.id
    await Customer.query().where('id', id).delete()
    const deletedUser = await Customer.find(id)
    expect(deletedUser).toBeNull()
  })

  it('query first', async () => {
    const user = await Customer.query().where('id', '>=', 1).first()
    expect(user?.createdTime).toBeInstanceOf(Date)
    expect(user?.info()).toBe('John Doe john@example.com')
  })

  it('query all', async () => {
    const users = await Customer.query().where('id', '>=', 1).get()
    expect(users.length).toBe(4)
    expect(users[0]?.info()).toBe('John Doe john@example.com')
  })

  it('with manual transaction with rollback due to error', async () => {
    await Customer.insert({
      name: 'John Wrick',
      email: 'johnwrick@example.com',
      age: 20,
    })
    const trx = await db.beginTransaction()
    try {
      await Customer.useTransaction(trx).query().where('email', 'johnwrick@example.com').update({
        name: 'Boogeyman',
        age: 25,
      })
      throw new Error('test')
    } catch (_) {
      await trx.rollback()
    }
    const user = await Customer.query().where('email', 'johnwrick@example.com').first()
    expect(user?.name).toBe('John Wrick')
    expect(user?.age).toBe(20)
  })

  it('with manual transaction with commit should success', async () => {
    await Customer.insert({
      name: 'John Wrick',
      email: 'johnwrick@example.com',
      age: 20,
    })
    const trx = await db.beginTransaction()
    try {
      await Customer.useTransaction(trx).query().where('email', 'johnwrick@example.com').update({
        name: 'Boogeyman',
        age: 25,
      })
      await trx.commit()
    } catch (_) {
      await trx.rollback()
    }
    const user = await Customer.query().where('email', 'johnwrick@example.com').first()
    expect(user?.name).toBe('Boogeyman')
    expect(user?.age).toBe(25)
  })
})
