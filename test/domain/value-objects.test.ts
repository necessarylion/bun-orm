import { describe, test, expect } from "bun:test";
import { Column, Table, WhereCondition, OrderBy, Join } from "../../src/domain/value-objects";

describe("Domain Value Objects", () => {
  describe("Column", () => {
    test("should create a column with basic properties", () => {
      const column = new Column("name");
      
      expect(column.name).toBe("name");
      expect(column.table).toBeUndefined();
      expect(column.alias).toBeUndefined();
      expect(column.qualifiedName).toBe("name");
      expect(column.displayName).toBe("name");
    });

    test("should create a column with table prefix", () => {
      const column = new Column("name", "users");
      
      expect(column.name).toBe("name");
      expect(column.table).toBe("users");
      expect(column.qualifiedName).toBe("users.name");
      expect(column.displayName).toBe("users.name");
    });

    test("should create a column with alias", () => {
      const column = new Column("name", "users", "user_name");
      
      expect(column.name).toBe("name");
      expect(column.table).toBe("users");
      expect(column.alias).toBe("user_name");
      expect(column.qualifiedName).toBe("users.name");
      expect(column.displayName).toBe("user_name");
    });

    test("should create column with alias using as() method", () => {
      const column = new Column("name", "users");
      const aliasedColumn = column.as("user_name");
      
      expect(aliasedColumn.name).toBe("name");
      expect(aliasedColumn.table).toBe("users");
      expect(aliasedColumn.alias).toBe("user_name");
      expect(aliasedColumn.displayName).toBe("user_name");
    });

    test("should create column with table prefix using fromTable() method", () => {
      const column = new Column("name");
      const tableColumn = column.fromTable("users");
      
      expect(tableColumn.name).toBe("name");
      expect(tableColumn.table).toBe("users");
      expect(tableColumn.qualifiedName).toBe("users.name");
    });

    test("should validate column name", () => {
      expect(() => new Column("")).toThrow("Column name cannot be empty");
      expect(() => new Column("123name")).toThrow("Invalid column name: 123name");
      expect(() => new Column("name-with-dash")).toThrow("Invalid column name: name-with-dash");
    });

    test("should check equality", () => {
      const col1 = new Column("name", "users", "user_name");
      const col2 = new Column("name", "users", "user_name");
      const col3 = new Column("name", "users");
      
      expect(col1.equals(col2)).toBe(true);
      expect(col1.equals(col3)).toBe(false);
    });

    test("should convert to string", () => {
      const column = new Column("name", "users");
      expect(column.toString()).toBe("users.name");
    });
  });

  describe("Table", () => {
    test("should create a table with basic properties", () => {
      const table = new Table("users");
      
      expect(table.name).toBe("users");
      expect(table.schema).toBeUndefined();
      expect(table.alias).toBeUndefined();
      expect(table.qualifiedName).toBe("users");
      expect(table.displayName).toBe("users");
    });

    test("should create a table with schema", () => {
      const table = new Table("users", "public");
      
      expect(table.name).toBe("users");
      expect(table.schema).toBe("public");
      expect(table.qualifiedName).toBe("public.users");
      expect(table.displayName).toBe("public.users");
    });

    test("should create a table with alias", () => {
      const table = new Table("users", "public", "u");
      
      expect(table.name).toBe("users");
      expect(table.schema).toBe("public");
      expect(table.alias).toBe("u");
      expect(table.qualifiedName).toBe("public.users");
      expect(table.displayName).toBe("u");
    });

    test("should create table with alias using as() method", () => {
      const table = new Table("users", "public");
      const aliasedTable = table.as("u");
      
      expect(aliasedTable.name).toBe("users");
      expect(aliasedTable.schema).toBe("public");
      expect(aliasedTable.alias).toBe("u");
      expect(aliasedTable.displayName).toBe("u");
    });

    test("should create column for table", () => {
      const table = new Table("users", "public");
      const column = table.column("name");
      
      expect(column.name).toBe("name");
      expect(column.table).toBe("public.users");
    });

    test("should validate table name", () => {
      expect(() => new Table("")).toThrow("Table name cannot be empty");
      expect(() => new Table("123table")).toThrow("Invalid table name: 123table");
      expect(() => new Table("table-with-dash")).toThrow("Invalid table name: table-with-dash");
    });

    test("should validate schema name", () => {
      expect(() => new Table("users", "123schema")).toThrow("Invalid schema name: 123schema");
    });

    test("should check equality", () => {
      const table1 = new Table("users", "public", "u");
      const table2 = new Table("users", "public", "u");
      const table3 = new Table("users", "public");
      
      expect(table1.equals(table2)).toBe(true);
      expect(table1.equals(table3)).toBe(false);
    });

    test("should convert to string", () => {
      const table = new Table("users", "public");
      expect(table.toString()).toBe("public.users");
    });
  });

  describe("WhereCondition", () => {
    test("should add simple WHERE condition", () => {
      const condition = new WhereCondition();
      condition.where("name", "=", "John");
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "name",
        operator: "=",
        value: "John"
      });
    });

    test("should add WHERE IN condition", () => {
      const condition = new WhereCondition();
      condition.whereIn("id", [1, 2, 3]);
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "id",
        operator: "IN",
        values: [1, 2, 3]
      });
    });

    test("should add WHERE NOT IN condition", () => {
      const condition = new WhereCondition();
      condition.whereNotIn("status", ["inactive", "banned"]);
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "status",
        operator: "NOT IN",
        values: ["inactive", "banned"]
      });
    });

    test("should add WHERE BETWEEN condition", () => {
      const condition = new WhereCondition();
      condition.whereBetween("age", 18, 65);
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "age",
        operator: "BETWEEN",
        values: [18, 65]
      });
    });

    test("should add WHERE NOT BETWEEN condition", () => {
      const condition = new WhereCondition();
      condition.whereNotBetween("created_at", new Date("2020-01-01"), new Date("2023-01-01"));
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "created_at",
        operator: "NOT BETWEEN",
        values: [new Date("2020-01-01"), new Date("2023-01-01")]
      });
    });

    test("should add WHERE NULL condition", () => {
      const condition = new WhereCondition();
      condition.whereNull("deleted_at");
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "deleted_at",
        operator: "IS NULL"
      });
    });

    test("should add WHERE NOT NULL condition", () => {
      const condition = new WhereCondition();
      condition.whereNotNull("email");
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "email",
        operator: "IS NOT NULL"
      });
    });

    test("should add WHERE EXISTS condition", () => {
      const condition = new WhereCondition();
      condition.whereExists("SELECT 1 FROM posts WHERE user_id = users.id");
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "",
        operator: "EXISTS",
        subQuery: "SELECT 1 FROM posts WHERE user_id = users.id"
      });
    });

    test("should add WHERE NOT EXISTS condition", () => {
      const condition = new WhereCondition();
      condition.whereNotExists("SELECT 1 FROM posts WHERE user_id = users.id");
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toEqual({
        column: "",
        operator: "NOT EXISTS",
        subQuery: "SELECT 1 FROM posts WHERE user_id = users.id"
      });
    });

    test("should add AND WHERE group", () => {
      const condition = new WhereCondition();
      condition.andWhere(group => {
        group.where("age", ">=", 18);
        group.where("active", "=", true);
      });
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0].operator).toBe("AND");
      expect(clauses[0].conditions).toHaveLength(2);
    });

    test("should add OR WHERE group", () => {
      const condition = new WhereCondition();
      condition.orWhere(group => {
        group.where("verified", "=", true);
        group.where("premium", "=", true);
      });
      
      const clauses = condition.getClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0].operator).toBe("OR");
      expect(clauses[0].conditions).toHaveLength(2);
    });

    test("should check if has conditions", () => {
      const condition = new WhereCondition();
      expect(condition.hasConditions()).toBe(false);
      
      condition.where("name", "=", "John");
      expect(condition.hasConditions()).toBe(true);
    });

    test("should clear conditions", () => {
      const condition = new WhereCondition();
      condition.where("name", "=", "John");
      expect(condition.hasConditions()).toBe(true);
      
      condition.clear();
      expect(condition.hasConditions()).toBe(false);
    });
  });

  describe("OrderBy", () => {
    test("should add ORDER BY clause", () => {
      const orderBy = new OrderBy();
      orderBy.orderBy("name", "ASC");
      
      const orders = orderBy.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        column: "name",
        direction: "ASC"
      });
    });

    test("should add ORDER BY ASC clause", () => {
      const orderBy = new OrderBy();
      orderBy.orderByAsc("name");
      
      const orders = orderBy.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        column: "name",
        direction: "ASC"
      });
    });

    test("should add ORDER BY DESC clause", () => {
      const orderBy = new OrderBy();
      orderBy.orderByDesc("created_at");
      
      const orders = orderBy.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        column: "created_at",
        direction: "DESC"
      });
    });

    test("should add ORDER BY with NULLS FIRST", () => {
      const orderBy = new OrderBy();
      orderBy.orderByNullsFirst("last_login", "DESC");
      
      const orders = orderBy.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        column: "last_login",
        direction: "DESC",
        nullsFirst: true
      });
    });

    test("should add ORDER BY with NULLS LAST", () => {
      const orderBy = new OrderBy();
      orderBy.orderByNullsLast("created_at", "ASC");
      
      const orders = orderBy.getOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual({
        column: "created_at",
        direction: "ASC",
        nullsFirst: false
      });
    });

    test("should check if has orders", () => {
      const orderBy = new OrderBy();
      expect(orderBy.hasOrders()).toBe(false);
      
      orderBy.orderBy("name", "ASC");
      expect(orderBy.hasOrders()).toBe(true);
    });

    test("should clear orders", () => {
      const orderBy = new OrderBy();
      orderBy.orderBy("name", "ASC");
      expect(orderBy.hasOrders()).toBe(true);
      
      orderBy.clear();
      expect(orderBy.hasOrders()).toBe(false);
    });
  });

  describe("Join", () => {
    test("should add INNER JOIN", () => {
      const join = new Join();
      join.innerJoin("users", "posts.user_id = users.id");
      
      const joins = join.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toEqual({
        type: "INNER",
        table: "users",
        condition: "posts.user_id = users.id"
      });
    });

    test("should add LEFT JOIN", () => {
      const join = new Join();
      join.leftJoin("categories", "posts.category_id = categories.id", "cat");
      
      const joins = join.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toEqual({
        type: "LEFT",
        table: "categories",
        condition: "posts.category_id = categories.id",
        alias: "cat"
      });
    });

    test("should add RIGHT JOIN", () => {
      const join = new Join();
      join.rightJoin("profiles", "users.id = profiles.user_id");
      
      const joins = join.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toEqual({
        type: "RIGHT",
        table: "profiles",
        condition: "users.id = profiles.user_id"
      });
    });

    test("should add FULL JOIN", () => {
      const join = new Join();
      join.fullJoin("archived_posts", "posts.id = archived_posts.post_id");
      
      const joins = join.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toEqual({
        type: "FULL",
        table: "archived_posts",
        condition: "posts.id = archived_posts.post_id"
      });
    });

    test("should add CROSS JOIN", () => {
      const join = new Join();
      join.crossJoin("numbers", "n");
      
      const joins = join.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toEqual({
        type: "CROSS",
        table: "numbers",
        condition: "",
        alias: "n"
      });
    });

    test("should add generic JOIN", () => {
      const join = new Join();
      join.join("LEFT", "comments", "posts.id = comments.post_id", "cmt");
      
      const joins = join.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toEqual({
        type: "LEFT",
        table: "comments",
        condition: "posts.id = comments.post_id",
        alias: "cmt"
      });
    });

    test("should check if has joins", () => {
      const join = new Join();
      expect(join.hasJoins()).toBe(false);
      
      join.innerJoin("users", "posts.user_id = users.id");
      expect(join.hasJoins()).toBe(true);
    });

    test("should clear joins", () => {
      const join = new Join();
      join.innerJoin("users", "posts.user_id = users.id");
      expect(join.hasJoins()).toBe(true);
      
      join.clear();
      expect(join.hasJoins()).toBe(false);
    });
  });
}); 