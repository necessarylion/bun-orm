import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { cleanupTestData, insertTestData, setupTestTables } from './setup'
import { Model, column } from '../index'

class User extends Model {
  @column({ primary: true })
  public id: number

  @column()
  public name: string

  @column()
  public email: string

  public fullName(): string {
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

  it('should create a new user', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
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
    expect(user?.fullName()).toBe('John Doe john@example.com')
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

  it('should find a user by id', async () => {
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
    })
    const id = user.id
    await User.query().where('id', id).delete()
    const deletedUser = await User.find(id)
    expect(deletedUser).toBeNull()
  })
})
