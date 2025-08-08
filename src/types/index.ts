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

export type QueryBuilderInterface = {
  // Table operations
  table: (table: string, alias?: string) => QueryBuilderInterface
  from: (table: string, alias?: string) => QueryBuilderInterface
  into: (table: string) => QueryBuilderInterface

  // Query mode
  query: () => QueryBuilderInterface

  // Select operations
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilderInterface

  // Insert operations
  insert: <T = any>(data: Record<string, any> | Record<string, any>[]) => Promise<T[]>

  // Update operations
  update: <T = any>(data: Record<string, any>) => Promise<T[]>

  // Delete operations
  delete: <T = any>() => Promise<T[]>

  // Where conditions
  where: (column: string | WhereCallback, operatorOrValue?: any, value?: any) => QueryBuilderInterface
  orWhere: (column: string, operatorOrValue: any, value?: any) => QueryBuilderInterface
  whereRaw: (sql: string, params?: any[]) => QueryBuilderInterface
  orWhereRaw: (sql: string, params?: any[]) => QueryBuilderInterface
  whereIn: (column: string, values: NonNullable<any>[]) => QueryBuilderInterface
  orWhereIn: (column: string, values: NonNullable<any>[]) => QueryBuilderInterface
  whereNotIn: (column: string, values: NonNullable<any>[]) => QueryBuilderInterface
  orWhereNotIn: (column: string, values: NonNullable<any>[]) => QueryBuilderInterface
  whereNull: (column: string) => QueryBuilderInterface
  orWhereNull: (column: string) => QueryBuilderInterface
  whereNotNull: (column: string) => QueryBuilderInterface
  orWhereNotNull: (column: string) => QueryBuilderInterface

  // Join operations
  join: (table: string, on: string, alias?: string) => QueryBuilderInterface
  leftJoin: (table: string, on: string, alias?: string) => QueryBuilderInterface
  rightJoin: (table: string, on: string, alias?: string) => QueryBuilderInterface
  fullJoin: (table: string, on: string, alias?: string) => QueryBuilderInterface

  // Order and grouping
  orderBy: (column: string, direction?: OrderDirection) => QueryBuilderInterface
  groupBy: (column: string) => QueryBuilderInterface
  having: (condition: string) => QueryBuilderInterface

  // Pagination
  limit: (count: number) => QueryBuilderInterface
  offset: (count: number) => QueryBuilderInterface
  distinct: () => QueryBuilderInterface

  // Returning
  returning: (columns?: string | string[]) => QueryBuilderInterface

  // Execution methods
  count: (column?: string) => Promise<number>
  first: <T = any>() => Promise<T | null>
  get: <T = any>() => Promise<T[]>
  raw: () => { sql: string; params: any[] }
  toSql: () => string
}

// Legacy types for backward compatibility
export type InsertQueryBuilderInterface = QueryBuilderInterface
export type UpdateQueryBuilderInterface = QueryBuilderInterface
export type DeleteQueryBuilderInterface = QueryBuilderInterface

export type TransactionCallback<T = any> = (trx: Transaction) => Promise<T>

export type Transaction = {
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilderInterface
  from: (table: string, alias?: string) => QueryBuilderInterface
  table: (table: string, alias?: string) => QueryBuilderInterface
  insert: (data?: Record<string, any> | Record<string, any>[]) => QueryBuilderInterface
  update: (data?: Record<string, any>) => QueryBuilderInterface
  delete: () => QueryBuilderInterface
  raw: (sql: string, params?: any[]) => Promise<any[]>
  commit: () => Promise<void>
  rollback: () => Promise<void>
}
