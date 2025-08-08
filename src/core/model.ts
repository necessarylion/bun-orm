import { getColumns } from '../decorators/column'
import { type QueryBuilder, spark } from './spark'
import { getTableName } from '../utils/model-helper'
import { camelCase } from 'change-case'
import ModelQueryBuilder from '../query-builders/model-query-builder'

/**
 * Interface for objects that can be serialized to a specific type
 * @template T - The type to serialize to
 */
export interface Serializable<T> {
  /**
   * Serializes the object to type T
   * @returns The serialized object
   */
  serialize(): T
}

/**
 * Abstract base class for all database models
 * Provides common functionality for database operations, serialization, and hydration
 * @template T - The type of the serialized data (defaults to Record<string, any>)
 */
export abstract class Model implements Serializable<Record<string, any>> {
  /**
   * Gets the table name for this model instance
   * @returns The table name derived from the constructor name
   */
  public get tableName() {
    return getTableName(this.constructor.name)
  }

  /**
   * Gets a query builder instance for this model's table
   * @returns A QueryBuilder instance configured for this model's table
   */
  static db<T extends typeof Model>(this: T): QueryBuilder<InstanceType<T>> {
    return spark().table(getTableName(this.name)) as QueryBuilder<InstanceType<T>>
  }

  /**
   * Finds a record by its primary key
   * @template T - The model class type
   * @param id - The primary key value to search for
   * @returns Promise that resolves to the found model instance or null if not found
   */
  static query<T extends typeof Model>(this: T): ModelQueryBuilder<InstanceType<T>> {
    const instance = Object.create(this.prototype)
    return new ModelQueryBuilder<InstanceType<T>>(instance, getTableName(this.name))
  }

  /**
   * Deletes the current model instance from the database
   * Uses the primary key to identify the record to delete
   * @returns Promise that resolves when the deletion is complete
   */
  public async delete(): Promise<void> {
    const self = this as any
    const pk = getColumns(this.constructor).find((c: any) => c.primary)?.name || 'id'
    await spark().table(this.tableName).where(pk, self[pk]).delete()
  }

  /**
   * Serializes the model instance to a plain object
   * Maps property names to database column names and applies any custom serialization
   * @returns A plain object representation of the model
   */
  public serialize(): Record<string, any> {
    const self = this as any
    const columns = getColumns(this.constructor)
    const serialized: Record<string, any> = {}
    for (const col of columns) {
      serialized[col.serializeAs] = col.serialize ? col.serialize(self[col.propertyKey]) : self[col.propertyKey]
    }
    return serialized
  }

  /**
   * Hydrates a plain object into a model instance
   * Maps database column names to property names and creates a new model instance
   * @template T - The model class type
   * @param data - The plain object data from the database
   * @returns A new model instance with the provided data
   */
  static hydrate<T extends typeof Model>(this: T, data: Record<string, any>): InstanceType<T> {
    const instance = Object.create(this.prototype) as InstanceType<T>

    // Get column metadata to map database column names to property names
    const columns = getColumns(this)
    const columnMap = new Map(columns.map((col: any) => [col.name, col.propertyKey]))

    // Map database column names to property names
    const mappedData: Record<string, any> = {}
    for (const [dbColumn, value] of Object.entries(data)) {
      const propertyName = columnMap.get(dbColumn) ?? camelCase(dbColumn)
      mappedData[propertyName as string] = value
    }

    Object.assign(instance, mappedData)
    return instance
  }

  /**
   * Hydrates an array of plain objects into model instances
   * @template T - The model class type
   * @param data - Array of plain object data from the database
   * @returns Array of model instances
   */
  static hydrateMany<T extends typeof Model>(this: T, data: Record<string, any>[]): InstanceType<T>[] {
    return data.map((item) => this.hydrate(item))
  }

  /**
   * Retrieves all records from the model's table
   * @template T - The model class type
   * @returns Promise that resolves to an array of model instances
   */
  static async all<T extends typeof Model>(this: T): Promise<InstanceType<T>[]> {
    const results = await this.db().get()
    return this.hydrateMany(results)
  }

  /**
   * Inserts one or more records into the model's table
   * @template T - The model class type
   * @param data - Single record or array of records to insert
   * @returns Promise that resolves to an array of created model instances
   */
  static async insert<T extends typeof Model>(
    this: T,
    data: Partial<InstanceType<T>> | Partial<InstanceType<T>>[]
  ): Promise<InstanceType<T>[]> {
    const results = await this.db().insert(data)
    return this.hydrateMany(results)
  }

  /**
   * Creates a single record in the model's table
   * @template T - The model class type
   * @param data - The data for the new record
   * @returns Promise that resolves to the created model instance
   * @throws Error if the creation fails
   */
  static async create<T extends typeof Model>(this: T, data: Partial<InstanceType<T>>): Promise<InstanceType<T>> {
    const results = await this.db().insert(data)
    if (!results || results.length === 0) throw new Error('Failed to create')
    return this.hydrate(results[0])
  }

  /**
   * Finds a record by its primary key
   * @template T - The model class type
   * @param id - The primary key value to search for
   * @returns Promise that resolves to the found model instance or null if not found
   */
  static async find<T extends typeof Model>(this: T, id: number): Promise<InstanceType<T> | null> {
    const pk = getColumns(this).find((c: any) => c.primary)?.name || 'id'
    const result = await this.db().where(pk, id).first()
    return result ? this.hydrate(result) : null
  }
}
