import type { Transaction } from '../core/transaction'
import type { QueryBuilder } from './query-builder'

export interface DatabaseQueryBuilder {
  close(): void
  hasTable(tableName: string): Promise<boolean>
  dropTable(tableName: string, options?: { cascade: boolean }): Promise<void>
  truncateTable(tableName: string, options?: { cascade: boolean }): Promise<void>
  testConnection(): Promise<boolean>
  runQuery(query: string, params: any[]): Promise<any[]>
  transaction(callback: (trx: Transaction) => Promise<any>): Promise<any>
  commit(): Promise<void>
  rollback(): Promise<void>
  beginTransaction(): Promise<Transaction<any>>
  buildSelectQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildInsertQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildUpdateQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildDeleteQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildUpsertQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
}
