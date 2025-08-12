import { snakeCase } from 'change-case'
import pluralize from 'pluralize'

export function parseTableName(name: string) {
  return pluralize(snakeCase(name))
}

export function cloneInstance<T>(instance: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(instance)), instance)
}

export function toSnakeCase(insertData: Record<string, any>, columnMap: Map<unknown, unknown>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(insertData).map(([key, value]) => {
      const column = columnMap.get(key) as string
      return [snakeCase(column), value]
    })
  )
}
