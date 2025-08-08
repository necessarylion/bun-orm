import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { cleanupTestData, insertTestData, setupTestTables } from './setup'
import { Model, column, spark } from '../index'

class User extends Model {
  @column({ primary: true })
  public uuid: number

  @column({
    serializeAs: 'full_name',
    serialize: (value: string) => `My name is ${value}`,
  })
  public name: string

  @column()
  public age: number

  @column()
  public email: string

  @column({ name: 'created_at' })
  public createdTime: string

  public info(): string {
    return `${this.name} ${this.email}`
  }
}

describe('Model', () => {
  beforeAll(async () => {
    await spark().dropTable('transactions', { cascade: true })
    await spark().dropTable('post_categories', { cascade: true })
    await spark().dropTable('categories', { cascade: true })
    await spark().dropTable('posts', { cascade: true })
    await spark().dropTable('users', { cascade: true })
    await setupTestTables('uuid')
  })

  beforeEach(async () => {
    await cleanupTestData('uuid')
    await insertTestData()
  })

  it('should create a new user with custom serialize', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 20,
    })
    const data = user.serialize()
    expect(data.uuid).toBeDefined()
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
    expect(user.uuid).toBeDefined()
    expect(user).toBeDefined()
    expect(user.name).toBe('John Doe')
    expect(user.email).toBe('john.doe@example.com')
  })

  it('should find a user by primary key', async () => {
    const user = await User.find(1)
    expect(user?.uuid).toBe(1)
    expect(user?.name).toBe('John Doe')
    expect(user?.email).toBe('john@example.com')
    expect(user?.info()).toBe('John Doe john@example.com')
  })

  it('should find all users', async () => {
    const users = await User.all()
    expect(users.length).toBeGreaterThan(2)
    expect(users[0]?.uuid).toBe(1)
    expect(users[0]?.name).toBe('John Doe')
    expect(users[0]?.email).toBe('john@example.com')
  })

  it('should find a user', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = user.uuid
    await user.delete()
    const deletedUser = await User.find(id)
    expect(deletedUser).toBeNull()
  })

  it('should find a user by id and remove it', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = user.uuid
    await User.query().where('uuid', id).delete()
    const deletedUser = await User.find(id)
    expect(deletedUser).toBeNull()
  })

  it('query first', async () => {
    const users = await User.query().where('uuid', '>=', 1).first()
    expect(users?.info()).toBe('John Doe john@example.com')
  })

  it('query all', async () => {
    const users = await User.query().where('uuid', '>=', 1).get()
    expect(users.length).toBe(4)
    expect(users[0]?.info()).toBe('Alice Brown alice@example.com')
  })
})
