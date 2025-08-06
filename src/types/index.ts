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
  // Table operations
  table: (table: string, alias?: string) => QueryBuilderChain;
  from: (table: string, alias?: string) => QueryBuilderChain;
  into: (table: string) => QueryBuilderChain;
  
  // Query mode
  query: () => QueryBuilderChain;
  
  // Select operations
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilderChain;
  
  // Insert operations
  insert: <T = any>(data: Record<string, any> | Record<string, any>[]) => Promise<T[]>;
  
  // Update operations
  update: <T = any>(data: Record<string, any>) => Promise<T[]>;
  
  // Delete operations
  delete: <T = any>() => Promise<T[]>;
  
  // Where conditions
  where: (column: string, operator: string, value?: any) => QueryBuilderChain;
  whereIn: (column: string, values: any[]) => QueryBuilderChain;
  whereNotIn: (column: string, values: any[]) => QueryBuilderChain;
  whereNull: (column: string) => QueryBuilderChain;
  whereNotNull: (column: string) => QueryBuilderChain;
  
  // Join operations
  join: (table: string, on: string, alias?: string) => QueryBuilderChain;
  leftJoin: (table: string, on: string, alias?: string) => QueryBuilderChain;
  rightJoin: (table: string, on: string, alias?: string) => QueryBuilderChain;
  fullJoin: (table: string, on: string, alias?: string) => QueryBuilderChain;
  
  // Order and grouping
  orderBy: (column: string, direction?: 'ASC' | 'DESC') => QueryBuilderChain;
  groupBy: (column: string) => QueryBuilderChain;
  having: (condition: string) => QueryBuilderChain;
  
  // Pagination
  limit: (count: number) => QueryBuilderChain;
  offset: (count: number) => QueryBuilderChain;
  distinct: () => QueryBuilderChain;
  
  // Returning
  returning: (columns?: string | string[]) => QueryBuilderChain;
  
  // Execution methods
  count: (column?: string) => Promise<number>;
  first: <T = any>() => Promise<T | null>;
  get: <T = any>() => Promise<T[]>;
  raw: () => { sql: string; params: any[] };
};

// Legacy types for backward compatibility
export type InsertQueryBuilderChain = QueryBuilderChain;
export type UpdateQueryBuilderChain = QueryBuilderChain;
export type DeleteQueryBuilderChain = QueryBuilderChain;

export type TransactionCallback<T = any> = (trx: Transaction) => Promise<T>;

export type Transaction = {
  select: (columns?: SelectColumn | SelectColumn[]) => QueryBuilderChain;
  from: (table: string, alias?: string) => QueryBuilderChain;
  table: (table: string, alias?: string) => QueryBuilderChain;
  insert: (data?: Record<string, any> | Record<string, any>[]) => QueryBuilderChain;
  update: (data?: Record<string, any>) => QueryBuilderChain;
  delete: () => QueryBuilderChain;
  raw: (sql: string, params?: any[]) => Promise<any[]>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}; 