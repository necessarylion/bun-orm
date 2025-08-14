import { getColumns } from '../decorators/column'
import { spark } from './spark'
import { parseTableName, sanitizeInsertData } from '../utils/model-helper'
import ModelQueryBuilder from '../query-builders/model-query-builder'
import type { Transaction } from './transaction'
import type { QueryBuilder } from '../query-builders/query-builder'

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
  public static tableName?: string

  /**
   * Gets the table name for this model instance
   * @returns The table name derived from the constructor name
   */
  static getTableName<T extends typeof Model>(this: T) {
    return parseTableName(this.tableName ?? this.name)
  }

  /**
   * Creates a query builder with transaction context
   * @param {Transaction} trx - Transaction instance
   * @returns {QueryBuilder} Query builder instance
   */
  static useTransaction<T extends typeof Model>(this: T, trx: Transaction<T>): QueryBuilder<InstanceType<T>> {
    return spark().useTransaction(trx).table(this.getTableName()) as QueryBuilder<InstanceType<T>>
  }

  /**
   * Gets a query builder instance for this model's table
   * @returns A QueryBuilder instance configured for this model's table
   */
  static truncate<T extends typeof Model>(this: T): Promise<void> {
    return spark().truncate(this.getTableName())
  }

  /**
   * Gets a query builder instance for this model's table
   * @returns A QueryBuilder instance configured for this model's table
   */
  static db<T extends typeof Model>(this: T): QueryBuilder<InstanceType<T>> {
    const instance = Object.create(this.prototype)
    return new ModelQueryBuilder<InstanceType<T>>(instance, this.getTableName())
  }

  /**
   * Finds a record by its primary key
   * @template T - The model class type
   * @param id - The primary key value to search for
   * @returns Promise that resolves to the found model instance or null if not found
   */
  static query<T extends typeof Model>(this: T): ModelQueryBuilder<InstanceType<T>> {
    const instance = Object.create(this.prototype)
    return new ModelQueryBuilder<InstanceType<T>>(instance, this.getTableName())
  }

  /**
   * Deletes the current model instance from the database
   * Uses the primary key to identify the record to delete
   * @returns Promise that resolves when the deletion is complete
   */
  public async delete(): Promise<void> {
    const self = this as any
    const pk = getColumns(this.constructor).find((c: any) => c.primary)?.name || 'id'
    await spark().table(self.constructor.getTableName()).where(pk, self[pk]).delete()
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
   * Retrieves all records from the model's table
   * @template T - The model class type
   * @returns Promise that resolves to an array of model instances
   */
  static async all<T extends typeof Model>(this: T): Promise<InstanceType<T>[]> {
    return this.db().get()
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
    const columns = getColumns(this)
    const columnMap = new Map(columns.map((col: any) => [col.propertyKey, col.name]))
    const typeMap = new Map(columns.map((col: any) => [col.propertyKey, col.type]))
    return this.db().insert(sanitizeInsertData(data, columnMap, typeMap))
  }

  /**
   * Creates a single record in the model's table
   * @template T - The model class type
   * @param data - The data for the new record
   * @returns Promise that resolves to the created model instance
   * @throws Error if the creation fails
   */
  static async create<T extends typeof Model>(this: T, data: Partial<InstanceType<T>>): Promise<InstanceType<T>> {
    const results = await this.insert(data)
    if (!results || results.length === 0 || !results[0]) throw new Error('Failed to create')
    return results[0]
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
    return result ? result : null
  }
}
