// Main test runner - imports all test files
import "./domain/value-objects.test";
import "./domain/entities.test";
import "./infrastructure/connection.test";
import "./infrastructure/repositories.test";
import "./application/query-builder.test";
import "./application/insert-query-builder.test";
import "./application/update-query-builder.test";
import "./application/delete-query-builder.test";

// This file serves as the main entry point for all tests
// Bun will automatically discover and run all test files
console.log("🧪 Running Bun ORM tests..."); 