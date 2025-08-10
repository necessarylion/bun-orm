import { snakeCase } from 'change-case'
import pluralize from 'pluralize'

export function parseTableName(name: string) {
  return pluralize(snakeCase(name))
}

export function cloneInstance<T>(instance: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(instance)), instance)
}
