import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function createTables() {
  console.log("🛠 Creating Event Tables directly in PostgreSQL...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS "event_categories" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "icon" TEXT,
      "displayOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "event_categories_name_key" ON "event_categories"("name");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "event_categories_slug_key" ON "event_categories"("slug");`,

    `CREATE TABLE IF NOT EXISTS "events" (
      "id" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "subtitle" TEXT,
      "distance" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "location" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL,
      "maxCapacity" INTEGER NOT NULL DEFAULT 500,
      "currentRegistrations" INTEGER NOT NULL DEFAULT 0,
      "description" TEXT,
      "shortDescription" TEXT,
      "bannerImage" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "elevationGain" TEXT,
      "cutoffTime" TEXT,
      "categoryId" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "events_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_key" ON "events"("slug");`,

    `CREATE TABLE IF NOT EXISTS "event_routes" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "distance" TEXT NOT NULL,
      "elevationProfile" TEXT,
      "gpxUrl" TEXT,
      "mapImageUrl" TEXT,
      "checkpoints" TEXT[],
      "displayOrder" INTEGER NOT NULL DEFAULT 0,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "event_routes_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "event_routes_slug_key" ON "event_routes"("slug");`,
  ];

  for (const q of queries) {
    await prisma.$executeRawUnsafe(q);
  }

  console.log("✅ Event Tables created successfully!");
}

createTables()
  .catch((err) => console.error("❌ Table creation error:", err))
  .finally(() => prisma.$disconnect());
