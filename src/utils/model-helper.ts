import { snakeCase } from 'change-case'
import pluralize from 'pluralize'

export function parseTableName(name: string) {
  return pluralize(snakeCase(name))
}

export function cloneInstance<T>(instance: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(instance)), instance)
}

export function sanitizeInsertData(
  insertData: Record<string, any>,
  columnMap: Map<unknown, unknown>,
  typeMap: Map<unknown, unknown>
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(insertData).map(([key, value]) => {
      const column = columnMap.get(key) as string
      const type = typeMap.get(key) as string
      if (type === 'Object') {
        return [snakeCase(column), value ? JSON.stringify(value) : value]
      }
      return [snakeCase(column), value]
    })
  )
}

export function safeParseJSON(value: any) {
  try {
    return JSON.parse(value)
  } catch (_error) {
    return value
  }
}
