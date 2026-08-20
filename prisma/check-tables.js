import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkTables() {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`;
  console.log("📊 PostgreSQL Tables in Database:");
  tables.forEach((t) => console.log(`  • ${t.table_name}`));
}

checkTables()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
