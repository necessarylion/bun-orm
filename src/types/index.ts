import type { QueryBuilder } from '../query-builders/query-builder'

export type ConnectionConfig = Bun.SQL.Options

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

export type NestedQueryBuilder = {
  where: (column: string, operatorOrValue: any, value?: any) => NestedQueryBuilder
  orWhere: (column: string, operatorOrValue: any, value?: any) => NestedQueryBuilder
  whereIn: (column: string, values: any[]) => NestedQueryBuilder
  orWhereIn: (column: string, values: any[]) => NestedQueryBuilder
  whereNotIn: (column: string, values: any[]) => NestedQueryBuilder
  orWhereNotIn: (column: string, values: any[]) => NestedQueryBuilder
  whereNull: (column: string) => NestedQueryBuilder
  orWhereNull: (column: string) => NestedQueryBuilder
  whereNotNull: (column: string) => NestedQueryBuilder
  orWhereNotNull: (column: string) => NestedQueryBuilder
  whereRaw: (sql: string, params: any[]) => NestedQueryBuilder
  orWhereRaw: (sql: string, params: any[]) => NestedQueryBuilder
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

export type Transaction<M = any> = {
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilder<M>
  from: (table: string, alias?: string) => QueryBuilder<M>
  table: (table: string, alias?: string) => QueryBuilder<M>
  insert: (data?: Record<string, any> | Record<string, any>[]) => QueryBuilder<M>
  update: (data?: Record<string, any>) => QueryBuilder<M>
  delete: () => QueryBuilder<M>
  raw: (sql: string, params?: any[]) => Promise<any[]>
  commit: () => Promise<void>
  rollback: () => Promise<void>
}
