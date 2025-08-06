export type ConnectionConfig = Bun.SQL.Options

export type WhereCondition = {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
  values?: any[];
};

export type JoinCondition = {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
  alias?: string;
};

export type OrderByCondition = {
  column: string;
  direction: 'ASC' | 'DESC';
};

export type GroupByCondition = {
  column: string;
};

export type SelectColumn = string | { [key: string]: string };

export type QueryResult<T = any> = T[];

export type QueryBuilderChain = {
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilderChain;
  from: (table: string, alias?: string) => QueryBuilderChain;
  where: (column: string, operator: string, value?: any) => QueryBuilderChain;
  whereIn: (column: string, values: any[]) => QueryBuilderChain;
  whereNotIn: (column: string, values: any[]) => QueryBuilderChain;
  whereNull: (column: string) => QueryBuilderChain;
  whereNotNull: (column: string) => QueryBuilderChain;
  join: (table: string, on: string, alias?: string) => QueryBuilderChain;
  leftJoin: (table: string, on: string, alias?: string) => QueryBuilderChain;
  rightJoin: (table: string, on: string, alias?: string) => QueryBuilderChain;
  fullJoin: (table: string, on: string, alias?: string) => QueryBuilderChain;
  orderBy: (column: string, direction?: 'ASC' | 'DESC') => QueryBuilderChain;
  groupBy: (column: string) => QueryBuilderChain;
  having: (condition: string) => QueryBuilderChain;
  limit: (count: number) => QueryBuilderChain;
  offset: (count: number) => QueryBuilderChain;
  distinct: () => QueryBuilderChain;
  count: (column?: string) => Promise<number>;
  first: <T = any>() => Promise<T | null>;
  get: <T = any>() => Promise<T[]>;
  raw: () => { sql: string; params: any[] };
};

export type InsertQueryBuilderChain = {
  into: (table: string) => InsertQueryBuilderChain;
  values: (data: Record<string, any> | Record<string, any>[]) => InsertQueryBuilderChain;
  returning: (columns?: string | string[]) => InsertQueryBuilderChain;
  execute: <T = any>() => Promise<T[]>;
  raw: () => { sql: string; params: any[] };
};

export type UpdateQueryBuilderChain = {
  table: (table: string) => UpdateQueryBuilderChain;
  set: (data: Record<string, any>) => UpdateQueryBuilderChain;
  where: (column: string, operator: string, value?: any) => UpdateQueryBuilderChain;
  whereIn: (column: string, values: any[]) => UpdateQueryBuilderChain;
  whereNull: (column: string) => UpdateQueryBuilderChain;
  whereNotNull: (column: string) => UpdateQueryBuilderChain;
  returning: (columns?: string | string[]) => UpdateQueryBuilderChain;
  execute: <T = any>() => Promise<T[]>;
  raw: () => { sql: string; params: any[] };
};

export type DeleteQueryBuilderChain = {
  from: (table: string) => DeleteQueryBuilderChain;
  where: (column: string, operator: string, value?: any) => DeleteQueryBuilderChain;
  whereIn: (column: string, values: any[]) => DeleteQueryBuilderChain;
  whereNull: (column: string) => DeleteQueryBuilderChain;
  whereNotNull: (column: string) => DeleteQueryBuilderChain;
  returning: (columns?: string | string[]) => DeleteQueryBuilderChain;
  execute: <T = any>() => Promise<T[]>;
  raw: () => { sql: string; params: any[] };
};

export type TransactionCallback<T = any> = (trx: Transaction) => Promise<T>;

export type Transaction = {
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilderChain;
  from: (table: string, alias?: string) => QueryBuilderChain;
  table: (table: string, alias?: string) => QueryBuilderChain;
  insert: (data?: Record<string, any> | Record<string, any>[]) => InsertQueryBuilderChain;
  update: (data?: Record<string, any>) => UpdateQueryBuilderChain;
  delete: () => DeleteQueryBuilderChain;
  raw: (sql: string, params?: any[]) => Promise<any[]>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}; 