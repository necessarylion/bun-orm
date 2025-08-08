import 'reflect-metadata'

export interface ColumnOptions {
  primary?: boolean
  name?: string
}

const COLUMNS_KEY = Symbol('bun-spark:columns')

export function column(options: ColumnOptions = {}) {
  return (target: any, propertyKey: string) => {
    const columns = Reflect.getMetadata(COLUMNS_KEY, target.constructor) || []

    columns.push({
      propertyKey,
      name: options.name || propertyKey,
      primary: options.primary || false,
      type: Reflect.getMetadata('design:type', target, propertyKey).name,
    })

    Reflect.defineMetadata(COLUMNS_KEY, columns, target.constructor)
  }
}

export function getColumns(model: any) {
  return Reflect.getMetadata(COLUMNS_KEY, model) || []
}
