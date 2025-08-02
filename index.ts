// Main exports
export { spark, Spark } from './src/core/spark';
export { createConnection, getConnection, DatabaseConnection } from './src/core/connection';

// Query builders
export { QueryBuilder } from './src/query-builders/query-builder';
export { InsertQueryBuilder } from './src/query-builders/insert-query-builder';
export { UpdateQueryBuilder } from './src/query-builders/update-query-builder';
export { DeleteQueryBuilder } from './src/query-builders/delete-query-builder';
export { BaseQueryBuilder } from './src/query-builders/base-query-builder';

// Utilities
export { SQLHelper } from './src/utils/sql-helper';

// Types
export type {
  ConnectionConfig,
  WhereCondition,
  JoinCondition,
  OrderByCondition,
  GroupByCondition,
  SelectColumn,
  QueryResult,
  QueryBuilderChain,
  InsertQueryBuilderChain,
  UpdateQueryBuilderChain,
  DeleteQueryBuilderChain
} from './src/types';