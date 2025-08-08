import { camelCase } from 'change-case'
import type { Model } from '../core/model'
import { getColumns } from '../decorators/column'
import { QueryBuilder } from './query-builder'

export default class ModelQueryBuilder<M> extends QueryBuilder<M> {
  constructor(m: Model, table: string) {
    super()
    this.modelInstance = m
    this.table(table)
  }

  override hydrate(instance: Model, data: Record<string, any>) {
    // Get column metadata to map database column names to property names
    const columns = getColumns(instance)
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
}
