// model.ts
import { getColumns } from '../decorators/column'
import { type QueryBuilder, spark } from './spark'
import { getTableName } from '../utils/model-helper'

export abstract class Model {
  static _tableName: string
  static primaryKey: string

  public get tableName() {
    return getTableName(this.constructor.name)
  }

  static get db(): QueryBuilder {
    if (!this._tableName) {
      this._tableName = getTableName(this.name)
    }
    return spark().table(this._tableName)
  }

  static getMetadata() {
    return {
      tableName: (this as any)._tableName,
      columns: getColumns(this),
    }
  }

  static query(): QueryBuilder {
    return this.db
  }

  public async delete(): Promise<void> {
    const self = this as any
    const pk = getColumns(this).find((c: any) => c.primary)?.name || 'id'
    await spark().table(this.tableName).where(pk, self[pk]).delete()
  }

  /**
   * Hydrates a plain object into a model instance
   */
  static hydrate<T extends typeof Model>(this: T, data: Record<string, any>): InstanceType<T> {
    const instance = Object.create(this.prototype) as InstanceType<T>
    Object.assign(instance, data)
    return instance
  }

  /**
   * Hydrates an array of plain objects into model instances
   */
  static hydrateMany<T extends typeof Model>(this: T, data: Record<string, any>[]): InstanceType<T>[] {
    return data.map((item) => this.hydrate(item))
  }

  static async all<T extends typeof Model>(this: T): Promise<InstanceType<T>[]> {
    const results = await this.db.get()
    return this.hydrateMany(results)
  }

  static async insert<T extends typeof Model>(
    this: T,
    data: Record<string, any> | Record<string, any>[]
  ): Promise<InstanceType<T>[]> {
    const results = await this.db.insert(data)
    return this.hydrateMany(results)
  }

  static async create<T extends typeof Model>(this: T, data: Record<string, any>): Promise<InstanceType<T>> {
    const results = await this.db.insert(data)
    if (!results || results.length === 0) throw new Error('Failed to create')
    return this.hydrate(results[0])
  }

  static async find<T extends typeof Model>(this: T, id: number): Promise<InstanceType<T> | null> {
    const pk = this.getMetadata().columns.find((c: any) => c.primary)?.name || 'id'
    const result = await this.db.where(pk, id).first()
    return result ? this.hydrate(result) : null
  }
}
