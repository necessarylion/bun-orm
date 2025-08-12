import type { QueryBuilder } from './query-builder'

export interface DatabaseQueryBuilder {
  buildSelectQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildInsertQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildUpdateQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildDeleteQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
  buildUpsertQuery(queryBuilder: QueryBuilder<any>): { sql: string; params: any[] }
}
