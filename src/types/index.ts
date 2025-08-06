export type ConnectionConfig = Bun.SQL.Options

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

export type WhereCondition = {
  column: string
  operator: WhereOperator | 'IS NULL' | 'IS NOT NULL'
  value?: any
  values?: any[]
}

export type JoinCondition = {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  table: string
  on: string
  alias?: string
}

export type OrderByCondition = {
  column: string
  direction: 'ASC' | 'DESC'
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
  insert: <T = any>(
    data: Record<string, any> | Record<string, any>[]
  ) => Promise<T[]>

  // Update operations
  update: <T = any>(data: Record<string, any>) => Promise<T[]>

  // Delete operations
  delete: <T = any>() => Promise<T[]>

  // Where conditions
  where: (
    column: string,
    operatorOrValue: NonNullable<any>,
    value?: NonNullable<any>
  ) => QueryBuilderInterface
  whereIn: (column: string, values: NonNullable<any>[]) => QueryBuilderInterface
  whereNotIn: (
    column: string,
    values: NonNullable<any>[]
  ) => QueryBuilderInterface
  whereNull: (column: string) => QueryBuilderInterface
  whereNotNull: (column: string) => QueryBuilderInterface

  // Join operations
  join: (table: string, on: string, alias?: string) => QueryBuilderInterface
  leftJoin: (table: string, on: string, alias?: string) => QueryBuilderInterface
  rightJoin: (
    table: string,
    on: string,
    alias?: string
  ) => QueryBuilderInterface
  fullJoin: (table: string, on: string, alias?: string) => QueryBuilderInterface

  // Order and grouping
  orderBy: (column: string, direction?: 'ASC' | 'DESC') => QueryBuilderInterface
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
  insert: (
    data?: Record<string, any> | Record<string, any>[]
  ) => QueryBuilderInterface
  update: (data?: Record<string, any>) => QueryBuilderInterface
  delete: () => QueryBuilderInterface
  raw: (sql: string, params?: any[]) => Promise<any[]>
  commit: () => Promise<void>
  rollback: () => Promise<void>
}
