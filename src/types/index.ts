import type { Transaction } from '../core/transaction'
import type { NestedQueryBuilder } from '../query-builders/nested-query-builder'

export type ConnectionConfig =
  | ({ driver: 'postgres' } & Bun.SQL.Options & { debug?: boolean })
  | {
      driver: 'sqlite'
      filename?: string
      readonly?: boolean
      create?: boolean
      readwrite?: boolean
      strict?: boolean
      safeIntegers?: boolean
      debug?: boolean
    }

export type WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN'

export type FullWhereOperators = WhereOperator | 'IS NULL' | 'IS NOT NULL' | 'RAW'

export type WhereCondition = {
  column: string
  operator: FullWhereOperators
  value?: any
}

export type WhereCallback = (query: NestedQueryBuilder) => void

export type WhereGroupCondition = {
  type: 'AND' | 'OR'
  conditions: (WhereCondition | WhereGroupCondition)[]
}

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'

export type JoinCondition = {
  type: JoinType
  table: string
  on: string
  alias?: string
}

export type OrderDirection = 'asc' | 'desc' | 'ASC' | 'DESC'

export type OrderByCondition = {
  column: string
  direction: OrderDirection
}

export type GroupByCondition = {
  column: string
}

export type SelectColumn = string | { [key: string]: string }

export type QueryResult<T = any> = T[]

export type TransactionCallback<M, T = any> = (trx: Transaction<M>) => Promise<T>
