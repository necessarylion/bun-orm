import { sql } from 'bun';

export class SQLHelper {
  /**
   * Escapes a SQL identifier (table name, column name, etc.)
   * @param {string} identifier - The identifier to escape
   * @returns {string} The escaped identifier
   */
  static escapeIdentifier(identifier: string): string {
    // Simple identifier escaping - in production you might want more robust escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Builds a comma-separated list of escaped column names
   * @param {string[]} columns - Array of column names
   * @returns {string} Comma-separated list of escaped column names
   */
  static buildColumnList(columns: string[]): string {
    return columns.map(col => this.escapeIdentifier(col)).join(', ');
  }

  /**
   * Builds a comma-separated list of parameter placeholders
   * @param {number} count - Number of placeholders to generate
   * @returns {string} Comma-separated list of parameter placeholders ($1, $2, etc.)
   */
  static buildValuePlaceholders(count: number): string {
    return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
  }

  /**
   * Builds a SET clause for UPDATE queries
   * @param {Record<string, any>} data - Object containing column-value pairs
   * @returns {{ sql: string; params: any[] }} SET clause SQL and parameters
   */
  static buildSetClause(data: Record<string, any>): { sql: string; params: any[] } {
    const entries = Object.entries(data);
    const setParts: string[] = [];
    const params: any[] = [];

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i] as [string, any];
      setParts.push(`${this.escapeIdentifier(key)} = $${i + 1}`);
      params.push(value);
    }

    return {
      sql: setParts.join(', '),
      params
    };
  }

  /**
   * Builds WHERE conditions from an array of condition objects
   * @param {Array<{ column: string; operator: string; value?: any }>} conditions - Array of WHERE conditions
   * @returns {{ sql: string; params: any[] }} WHERE clause SQL and parameters
   */
  static buildWhereConditions(conditions: Array<{ column: string; operator: string; value?: any }>): { sql: string; params: any[] } {
    if (conditions.length === 0) {
      return { sql: '', params: [] };
    }

    const whereParts: string[] = [];
    const params: any[] = [];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const { column, operator, value } = condition as { column: string; operator: string; value?: any };
      
      if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
        whereParts.push(`${this.escapeIdentifier(column)} ${operator}`);
      } else if (operator === 'IN' || operator === 'NOT IN') {
        if (Array.isArray(value)) {
          const placeholders = value.map((_, j) => `$${params.length + j + 1}`).join(', ');
          whereParts.push(`${this.escapeIdentifier(column)} ${operator} (${placeholders})`);
          params.push(...value);
        }
      } else {
        whereParts.push(`${this.escapeIdentifier(column)} ${operator} $${params.length + 1}`);
        params.push(value);
      }
    }

    return {
      sql: whereParts.join(' AND '),
      params
    };
  }

  /**
   * Builds JOIN clauses from an array of join conditions
   * @param {Array<{ type: string; table: string; on: string; alias?: string }>} joins - Array of join conditions
   * @returns {string} JOIN clause SQL
   */
  static buildJoinClause(joins: Array<{ type: string; table: string; on: string; alias?: string }>): string {
    return joins.map(join => {
      const tablePart = join.alias 
        ? `${this.escapeIdentifier(join.table)} AS ${this.escapeIdentifier(join.alias)}`
        : this.escapeIdentifier(join.table);
      return `${join.type} JOIN ${tablePart} ON ${join.on}`;
    }).join(' ');
  }

  /**
   * Builds ORDER BY clause from an array of order conditions
   * @param {Array<{ column: string; direction: string }>} orders - Array of order conditions
   * @returns {string} ORDER BY clause SQL
   */
  static buildOrderByClause(orders: Array<{ column: string; direction: string }>): string {
    return orders.map(order => 
      `${this.escapeIdentifier(order.column)} ${order.direction}`
    ).join(', ');
  }

  /**
   * Builds GROUP BY clause from an array of column names
   * @param {string[]} groups - Array of column names to group by
   * @returns {string} GROUP BY clause SQL
   */
  static buildGroupByClause(groups: string[]): string {
    return groups.map(group => this.escapeIdentifier(group)).join(', ');
  }

  /**
   * Sanitizes a table name by removing potentially dangerous characters
   * @param {string} table - Table name to sanitize
   * @returns {string} Sanitized table name
   */
  static sanitizeTableName(table: string): string {
    // Remove any potentially dangerous characters
    return table.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Builds INSERT VALUES clause from an array of data objects
   * @param {Record<string, any>[]} data - Array of data objects to insert
   * @returns {{ columns: string; placeholders: string; params: any[] }} INSERT clause components
   * @throws {Error} When no data is provided
   */
  static buildInsertValues(data: Record<string, any>[]): { columns: string; placeholders: string; params: any[] } {
    if (data.length === 0) {
      throw new Error('No data provided for insert');
    }

    const columns = Object.keys(data[0] || {});
    const placeholders: string[] = [];
    const params: any[] = [];

    for (const row of data) {
      const rowPlaceholders = columns.map((_, i) => `$${params.length + i + 1}`).join(', ');
      placeholders.push(`(${rowPlaceholders})`);
      params.push(...columns.map(col => row[col]));
    }

    return {
      columns: this.buildColumnList(columns),
      placeholders: placeholders.join(', '),
      params
    };
  }
} 