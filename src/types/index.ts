import type { Transaction } from '../core/transaction'
import type { WhereQueryBuilder } from '../query-builders/where-query-builder'

export type Driver = 'sqlite' | 'postgres'

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

export type HavingOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'NOT LIKE'
  | 'NOT ILIKE'
  | 'IS NULL'
  | 'IS NOT NULL'

export type WhereOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'NOT LIKE'
  | 'NOT ILIKE'
  | 'IS NULL'
  | 'IS NOT NULL'
  | 'RAW'

export type WhereCondition = {
  type: 'AND' | 'OR'
  column: string
  operator: WhereOperator
  value?: any
}

export type WhereCallback = (query: WhereQueryBuilder<WhereQueryBuilder>) => void

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
