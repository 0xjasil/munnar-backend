import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfillCategories() {
  console.log("Fetching categories...");
  const categories = await prisma.eventCategory.findMany();
  
  if (categories.length === 0) {
    console.log("No categories found in database.");
    return;
  }
  
  const defaultCategory = categories[0];
  console.log(`Using category: ${defaultCategory.name} (${defaultCategory.id})`);

  console.log("Finding events with null categoryId...");
  const events = await prisma.event.findMany({
    where: {
      categoryId: null
    }
  });

  console.log(`Found ${events.length} events needing categoryId backfill.`);

  let count = 0;
  for (const e of events) {
    await prisma.event.update({
      where: { id: e.id },
      data: { categoryId: defaultCategory.id }
    });
    count++;
  }

  console.log(`Successfully backfilled ${count} events with categoryId.`);
}

backfillCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
