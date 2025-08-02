import { sql } from 'bun';

export class SQLHelper {
  static escapeIdentifier(identifier: string): string {
    // Simple identifier escaping - in production you might want more robust escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  static buildColumnList(columns: string[]): string {
    return columns.map(col => this.escapeIdentifier(col)).join(', ');
  }

  static buildValuePlaceholders(count: number): string {
    return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
  }

  static buildSetClause(data: Record<string, any>): { sql: string; params: any[] } {
    const entries = Object.entries(data);
    const setParts: string[] = [];
    const params: any[] = [];

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      setParts.push(`${this.escapeIdentifier(key)} = $${i + 1}`);
      params.push(value);
    }

    return {
      sql: setParts.join(', '),
      params
    };
  }

  static buildWhereConditions(conditions: Array<{ column: string; operator: string; value?: any }>): { sql: string; params: any[] } {
    if (conditions.length === 0) {
      return { sql: '', params: [] };
    }

    const whereParts: string[] = [];
    const params: any[] = [];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const { column, operator, value } = condition;
      
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

  static buildJoinClause(joins: Array<{ type: string; table: string; on: string; alias?: string }>): string {
    return joins.map(join => {
      const tablePart = join.alias 
        ? `${this.escapeIdentifier(join.table)} AS ${this.escapeIdentifier(join.alias)}`
        : this.escapeIdentifier(join.table);
      return `${join.type} JOIN ${tablePart} ON ${join.on}`;
    }).join(' ');
  }

  static buildOrderByClause(orders: Array<{ column: string; direction: string }>): string {
    return orders.map(order => 
      `${this.escapeIdentifier(order.column)} ${order.direction}`
    ).join(', ');
  }

  static buildGroupByClause(groups: string[]): string {
    return groups.map(group => this.escapeIdentifier(group)).join(', ');
  }

  static sanitizeTableName(table: string): string {
    // Remove any potentially dangerous characters
    return table.replace(/[^a-zA-Z0-9_]/g, '');
  }

  static buildInsertValues(data: Record<string, any>[]): { columns: string; placeholders: string; params: any[] } {
    if (data.length === 0) {
      throw new Error('No data provided for insert');
    }

    const columns = Object.keys(data[0]);
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