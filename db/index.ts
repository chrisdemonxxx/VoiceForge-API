import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Lazy database initialization - only connects when actually used
let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set - database features will be unavailable");
    console.warn("[Database] Voice library, campaigns, and call history will not persist");
    return null;
  }

  if (!_sql) {
    // Parse DATABASE_URL and ensure SSL is enabled for Render PostgreSQL
    const connectionString = process.env.DATABASE_URL;
    
    // postgres-js automatically handles SSL for connection strings
    // Render PostgreSQL requires SSL, so we ensure it's enabled
    _sql = postgres(connectionString, {
      ssl: 'require',
      max: 10, // Connection pool size
    });
    
    _db = drizzle(_sql, { schema });
    console.log("[Database] Connected to PostgreSQL database");
  }

  return { sql: _sql, db: _db };
}

export const getDatabase = () => {
  const result = initializeDatabase();
  if (!result) {
    throw new Error("Database not available - DATABASE_URL not configured");
  }
  return result;
};

// Export lazy accessors
// For compatibility, export pool as an alias to sql
export const pool = new Proxy({} as ReturnType<typeof postgres>, {
  get(target, prop) {
    return getDatabase().sql[prop as keyof ReturnType<typeof postgres>];
  }
});

// Export sql directly for postgres-js usage
export const sql = new Proxy({} as ReturnType<typeof postgres>, {
  get(target, prop) {
    return getDatabase().sql[prop as keyof ReturnType<typeof postgres>];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = getDatabase();
    if (!database.db) {
      throw new Error("Database not initialized");
    }
    return database.db[prop as keyof ReturnType<typeof drizzle>];
  }
});
