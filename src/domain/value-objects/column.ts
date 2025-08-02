/**
 * Column value object representing a database column
 */
export class Column {
  constructor(
    private readonly _name: string,
    private readonly _table?: string,
    private readonly _alias?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Column name cannot be empty');
    }
    
    // Validate column name format (basic validation)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._name)) {
      throw new Error(`Invalid column name: ${this._name}`);
    }
  }

  get name(): string {
    return this._name;
  }

  get table(): string | undefined {
    return this._table;
  }

  get alias(): string | undefined {
    return this._alias;
  }

  /**
   * Get the fully qualified column name
   */
  get qualifiedName(): string {
    return this._table ? `${this._table}.${this._name}` : this._name;
  }

  /**
   * Get the display name (alias if available, otherwise qualified name)
   */
  get displayName(): string {
    return this._alias || this.qualifiedName;
  }

  /**
   * Create a new column with an alias
   */
  as(alias: string): Column {
    return new Column(this._name, this._table, alias);
  }

  /**
   * Create a new column with table prefix
   */
  fromTable(table: string): Column {
    return new Column(this._name, table, this._alias);
  }

  equals(other: Column): boolean {
    return (
      this._name === other._name &&
      this._table === other._table &&
      this._alias === other._alias
    );
  }

  toString(): string {
    return this.qualifiedName;
  }
} 