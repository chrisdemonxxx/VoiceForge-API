import { db } from "./index";
import { apiKeys } from "../shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Check if we already have the public demo key
  const existing = await db.select().from(apiKeys).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Public demo key for landing page (lower rate limit for public use)
  await db.insert(apiKeys).values({
    name: "Public Landing Page Demo",
    key: "vf_demo_public_key_for_landing_page",
    active: true,
    usage: 0,
    rateLimit: 100, // 100 requests/hour for public demo
  });

  // Sample production key (higher limit)
  await db.insert(apiKeys).values({
    name: "Production API",
    key: "vf_sk_f8a3b9c1e2d4567890abcdef12345678",
    active: true,
    usage: 8234,
    rateLimit: 5000, // 5000 requests/hour for production
  });

  // Sample development key (standard limit)
  await db.insert(apiKeys).values({
    name: "Development",
    key: "vf_sk_a1b2c3d4e5f67890123456789abcdef0",
    active: true,
    usage: 423,
    rateLimit: 1000, // 1000 requests/hour for development
  });

  console.log("✓ Database seeded successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
