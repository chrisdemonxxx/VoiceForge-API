#!/usr/bin/env node
/**
 * Simple database connection test
 * Usage: node scripts/test-db-simple.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "@neon-database/serverless";
import ws from "ws";

// Load .env.production
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env.production");

let databaseUrl = null;
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        process.env[key.trim()] = value;
        if (key.trim() === "DATABASE_URL") {
          databaseUrl = value;
        }
      }
    }
  });
} catch (error) {
  console.error(`❌ Failed to load .env.production: ${error.message}`);
  process.exit(1);
}

if (!databaseUrl) {
  console.error("❌ DATABASE_URL not found in .env.production");
  process.exit(1);
}

console.log("🔌 Testing database connection...");
const dbName = databaseUrl.split("/").pop() || "unknown";
const dbHost = databaseUrl.split("@")[1]?.split("/")[0] || "unknown";
console.log(`📍 Database: ${dbName} @ ${dbHost}`);

const pool = new Pool({ connectionString: databaseUrl });

try {
  const result = await pool.query(
    "SELECT NOW() as current_time, version() as pg_version"
  );

  console.log("\n✅ Database connection successful!");
  console.log(`⏰ Current time: ${result.rows[0].current_time}`);
  const pgVersion = result.rows[0].pg_version.split(" ").slice(0, 2).join(" ");
  console.log(`📦 PostgreSQL: ${pgVersion}`);

  // Test schema access
  const tablesResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);

  console.log(`\n📊 Found ${tablesResult.rows.length} tables in database:`);
  if (tablesResult.rows.length > 0) {
    tablesResult.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });
  } else {
    console.log("   (No tables found - database may need migrations)");
  }

  await pool.end();
  console.log("\n✅ Database test completed successfully!");
  process.exit(0);
} catch (error) {
  console.error("\n❌ Database connection failed:");
  console.error(`   Error: ${error.message}`);
  if (error.code) {
    console.error(`   Code: ${error.code}`);
  }
  await pool.end();
  process.exit(1);
}


