import { snakeCase } from 'change-case'
import pluralize from 'pluralize'

export function getTableName(name: string) {
  return pluralize(snakeCase(name))
}
