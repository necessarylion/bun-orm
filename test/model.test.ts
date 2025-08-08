import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { cleanupTestData, insertTestData, setupTestTables } from './setup'
import { Model, column } from '../index'

class User extends Model {
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

describe('Model', () => {
  beforeAll(async () => {
    await setupTestTables()
  })

  beforeEach(async () => {
    await cleanupTestData()
    await insertTestData()
  })

  it('should create a new user with custom serialize', async () => {
    const user = await User.create({
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
    const user = await User.create({
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
    const user = await User.find(1)
    expect(user?.id).toBe(1)
    expect(user?.name).toBe('John Doe')
    expect(user?.email).toBe('john@example.com')
    expect(user?.info()).toBe('John Doe john@example.com')
  })

  it('should find all users', async () => {
    const users = await User.all()
    expect(users.length).toBeGreaterThan(2)
    expect(users[0]?.id).toBe(1)
    expect(users[0]?.name).toBe('John Doe')
    expect(users[0]?.email).toBe('john@example.com')
  })

  it('should find a user', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = user.id
    await user.delete()
    const deletedUser = await User.find(id)
    expect(deletedUser).toBeNull()
  })

  it('should find a user by id and remove it', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = user.id
    await User.query().where('id', id).delete()
    const deletedUser = await User.find(id)
    expect(deletedUser).toBeNull()
  })

  it('query first', async () => {
    const user = await User.query().where('id', '>=', 1).first()
    expect(user?.createdTime).toBeInstanceOf(Date)
    expect(user?.info()).toBe('John Doe john@example.com')
  })

  it('query all', async () => {
    const users = await User.query().where('id', '>=', 1).get()
    expect(users.length).toBe(4)
    expect(users[0]?.info()).toBe('Alice Brown alice@example.com')
  })
})
