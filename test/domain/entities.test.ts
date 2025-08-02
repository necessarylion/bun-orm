import { describe, test, expect } from "bun:test";
import { QueryResult } from "../../src/domain/entities/query-result";

describe("Domain Entities", () => {
  describe("QueryResult", () => {
    const mockData = [
      { id: 1, name: "John Doe", email: "john@example.com", age: 25 },
      { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
      { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 35 }
    ];

    test("should create a QueryResult with data", () => {
      const result = new QueryResult(mockData, mockData.length);
      
      expect(result.data).toEqual(mockData);
      expect(result.count).toBe(3);
      expect(result.length).toBe(3);
      expect(result.isEmpty).toBe(false);
      expect(result.hasData).toBe(true);
    });

    test("should create an empty QueryResult", () => {
      const result = new QueryResult([], 0);
      
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.length).toBe(0);
      expect(result.isEmpty).toBe(true);
      expect(result.hasData).toBe(false);
    });

    test("should get first element", () => {
      const result = new QueryResult(mockData, mockData.length);
      
      expect(result.first).toEqual(mockData[0]);
    });

    test("should get last element", () => {
      const result = new QueryResult(mockData, mockData.length);
      
      expect(result.last).toEqual(mockData[2]);
    });

    test("should return undefined for first/last when empty", () => {
      const result = new QueryResult([], 0);
      
      expect(result.first).toBeUndefined();
      expect(result.last).toBeUndefined();
    });

    test("should handle affected rows for INSERT/UPDATE/DELETE", () => {
      const result = new QueryResult([], 0, 5);
      
      expect(result.affectedRows).toBe(5);
    });

    test("should handle last insert ID", () => {
      const result = new QueryResult([], 0, 1, 123);
      
      expect(result.lastInsertId).toBe(123);
    });

    test("should map over data", () => {
      const result = new QueryResult(mockData, mockData.length);
      const names = result.map(user => user.name);
      
      expect(names).toEqual(["John Doe", "Jane Smith", "Bob Johnson"]);
    });

    test("should filter data", () => {
      const result = new QueryResult(mockData, mockData.length);
      const youngUsers = result.filter(user => user.age < 30);
      
      expect(youngUsers).toHaveLength(1);
      expect(youngUsers[0].name).toBe("John Doe");
    });

    test("should find specific element", () => {
      const result = new QueryResult(mockData, mockData.length);
      const jane = result.find(user => user.name === "Jane Smith");
      
      expect(jane).toEqual(mockData[1]);
    });

    test("should return undefined when find fails", () => {
      const result = new QueryResult(mockData, mockData.length);
      const notFound = result.find(user => user.name === "Non Existent");
      
      expect(notFound).toBeUndefined();
    });

    test("should convert to array", () => {
      const result = new QueryResult(mockData, mockData.length);
      const array = result.toArray();
      
      expect(array).toEqual(mockData);
      expect(Array.isArray(array)).toBe(true);
    });

    test("should convert to JSON", () => {
      const result = new QueryResult(mockData, mockData.length, 3, 123);
      const json = result.toJSON();
      
      expect(json).toEqual({
        data: mockData,
        count: 3,
        affectedRows: 3,
        lastInsertId: 123,
        isEmpty: false,
        hasData: true,
        length: 3
      });
    });

    test("should handle empty result JSON", () => {
      const result = new QueryResult([], 0);
      const json = result.toJSON();
      
      expect(json).toEqual({
        data: [],
        count: 0,
        affectedRows: undefined,
        lastInsertId: undefined,
        isEmpty: true,
        hasData: false,
        length: 0
      });
    });

    test("should be immutable", () => {
      const result = new QueryResult(mockData, mockData.length);
      const originalData = result.data;
      
      // Attempting to modify the data should not affect the original
      originalData.push({ id: 4, name: "New User", email: "new@example.com", age: 40 });
      
      expect(result.data).toHaveLength(3); // Should still be 3
      expect(result.length).toBe(3);
    });

    test("should handle different data types", () => {
      const stringData = ["a", "b", "c"];
      const numberData = [1, 2, 3];
      const booleanData = [true, false, true];
      
      const stringResult = new QueryResult(stringData, stringData.length);
      const numberResult = new QueryResult(numberData, numberData.length);
      const booleanResult = new QueryResult(booleanData, booleanData.length);
      
      expect(stringResult.data).toEqual(stringData);
      expect(numberResult.data).toEqual(numberData);
      expect(booleanResult.data).toEqual(booleanData);
    });

    test("should handle complex objects", () => {
      const complexData = [
        { 
          id: 1, 
          user: { name: "John", age: 25 },
          tags: ["developer", "javascript"],
          metadata: { created: new Date(), active: true }
        }
      ];
      
      const result = new QueryResult(complexData, complexData.length);
      
      expect(result.data).toEqual(complexData);
      expect(result.first?.user.name).toBe("John");
      expect(result.first?.tags).toContain("developer");
    });
  });
}); 