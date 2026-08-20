import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_DEFAULTS = {
  "ultra-marathon": { distance: "75 km", startingPrice: 6500 },
  "full-marathon": { distance: "42.195 km", startingPrice: 3500 },
  "half-marathon": { distance: "21.097 km", startingPrice: 2200 },
  "fun-run": { distance: "5 km", startingPrice: 900 },
};

async function backfill() {
  console.log("Backfilling category distance and starting price...");

  for (const [slug, defaults] of Object.entries(CATEGORY_DEFAULTS)) {
    const updated = await prisma.eventCategory.updateMany({
      where: { slug, deletedAt: null },
      data: defaults,
    });
    if (updated.count) {
      console.log(`  ✓ ${slug}: ${defaults.distance}, ₹${defaults.startingPrice}`);
    }
  }

  console.log("Done.");
}

backfill()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
