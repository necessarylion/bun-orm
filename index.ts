// Main ORM exports
export { BunORM, createORM, initializeORM, getORM } from './src/orm';
export type { DatabaseConfig } from './src/infrastructure/connection/database-connection';

// Domain exports
export * from './src/domain';

// Infrastructure exports
export * from './src/infrastructure';

// Application exports
export * from './src/application';

// Re-export commonly used classes for convenience
export { QueryBuilder } from './src/application/services/query-builder';
export { InsertQueryBuilder } from './src/application/services/insert-query-builder';
export { UpdateQueryBuilder } from './src/application/services/update-query-builder';
export { DeleteQueryBuilder } from './src/application/services/delete-query-builder';
export { QueryResult } from './src/domain/entities/query-result';
export { Table, Column } from './src/domain/value-objects';