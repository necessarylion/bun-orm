/**
 * QueryResult entity representing the result of a database query
 */
export class QueryResult<T = any> {
  constructor(
    private readonly _data: T[],
    private readonly _count: number,
    private readonly _affectedRows?: number,
    private readonly _lastInsertId?: number | string
  ) {}

  /**
   * Get the data rows
   */
  get data(): T[] {
    return [...this._data];
  }

  /**
   * Get the first row
   */
  get first(): T | undefined {
    return this._data[0];
  }

  /**
   * Get the last row
   */
  get last(): T | undefined {
    return this._data[this._data.length - 1];
  }

  /**
   * Get the count of rows
   */
  get count(): number {
    return this._count;
  }

  /**
   * Get the number of affected rows (for INSERT, UPDATE, DELETE)
   */
  get affectedRows(): number | undefined {
    return this._affectedRows;
  }

  /**
   * Get the last insert ID (for INSERT operations)
   */
  get lastInsertId(): number | string | undefined {
    return this._lastInsertId;
  }

  /**
   * Check if the result is empty
   */
  get isEmpty(): boolean {
    return this._data.length === 0;
  }

  /**
   * Check if the result has data
   */
  get hasData(): boolean {
    return this._data.length > 0;
  }

  /**
   * Get the number of rows in the result
   */
  get length(): number {
    return this._data.length;
  }

  /**
   * Map over the data rows
   */
  map<U>(callback: (item: T, index: number) => U): U[] {
    return this._data.map(callback);
  }

  /**
   * Filter the data rows
   */
  filter(callback: (item: T, index: number) => boolean): T[] {
    return this._data.filter(callback);
  }

  /**
   * Find a specific row
   */
  find(callback: (item: T, index: number) => boolean): T | undefined {
    return this._data.find(callback);
  }

  /**
   * Convert to array
   */
  toArray(): T[] {
    return [...this._data];
  }

  /**
   * Convert to JSON
   */
  toJSON(): any {
    return {
      data: this._data,
      count: this._count,
      affectedRows: this._affectedRows,
      lastInsertId: this._lastInsertId,
      isEmpty: this.isEmpty,
      hasData: this.hasData,
      length: this.length
    };
  }
} 