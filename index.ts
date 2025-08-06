// Main exports
export { spark, Spark } from './src/core/spark'
export {
  createConnection,
  getConnection,
  DatabaseConnection,
} from './src/core/connection'
export { Transaction } from './src/core/transaction'

// Query builders
export { QueryBuilder } from './src/query-builders/query-builder'
export { BaseQueryBuilder } from './src/query-builders/base-query-builder'

// Utilities
export { SQLHelper } from './src/utils/sql-helper'

// Types
export type {
  ConnectionConfig,
  WhereCondition,
  JoinCondition,
  OrderByCondition,
  GroupByCondition,
  SelectColumn,
  QueryResult,
  QueryBuilderInterface,
  InsertQueryBuilderInterface,
  UpdateQueryBuilderInterface,
  DeleteQueryBuilderInterface,
  Transaction,
  TransactionCallback,
} from './src/types'
