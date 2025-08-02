import { Column } from './column';

/**
 * Table value object representing a database table
 */
export class Table {
  constructor(
    private readonly _name: string,
    private readonly _schema?: string,
    private readonly _alias?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Table name cannot be empty');
    }
    
    // Validate table name format (basic validation)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._name)) {
      throw new Error(`Invalid table name: ${this._name}`);
    }

    if (this._schema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this._schema)) {
      throw new Error(`Invalid schema name: ${this._schema}`);
    }
  }

  get name(): string {
    return this._name;
  }

  get schema(): string | undefined {
    return this._schema;
  }

  get alias(): string | undefined {
    return this._alias;
  }

  /**
   * Get the fully qualified table name
   */
  get qualifiedName(): string {
    return this._schema ? `${this._schema}.${this._name}` : this._name;
  }

  /**
   * Get the display name (alias if available, otherwise qualified name)
   */
  get displayName(): string {
    return this._alias || this.qualifiedName;
  }

  /**
   * Create a new table with an alias
   */
  as(alias: string): Table {
    return new Table(this._name, this._schema, alias);
  }

  /**
   * Create a column for this table
   */
  column(name: string): Column {
    return new Column(name, this.displayName);
  }

  equals(other: Table): boolean {
    return (
      this._name === other._name &&
      this._schema === other._schema &&
      this._alias === other._alias
    );
  }

  toString(): string {
    return this.qualifiedName;
  }
} 