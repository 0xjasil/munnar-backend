import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.user.updateMany({
    where: { gender: null },
    data: { gender: 'Male' } // Default fallback for test data
  });
  console.log("Backfill complete");
}
main().catch(console.error).finally(() => prisma.$disconnect());
