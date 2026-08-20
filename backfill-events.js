import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting backfill for Event fields...");
  const events = await prisma.event.findMany();
  let count = 0;

  for (const e of events) {
    const updateData = {};
    
    if (!e.startTime) updateData.startTime = "06:00";
    if (!e.endTime) updateData.endTime = "12:00";
    
    if (!e.regOpen) {
      const d = new Date();
      d.setMonth(d.getMonth() - 2);
      updateData.regOpen = d;
    }
    
    if (!e.regClose) {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      updateData.regClose = d;
    }

    if (!e.venue) updateData.venue = "Munnar Town Ground";
    if (!e.address) updateData.address = "Munnar, Kerala, India";
    if (!e.mapLink) updateData.mapLink = "https://maps.google.com/?q=Munnar";
    if (!e.difficulty) updateData.difficulty = "Moderate";
    if (!e.routeDescription) updateData.routeDescription = "Scenic mountain trail through tea estates.";
    if (!e.ageLimit) updateData.ageLimit = "18+";
    if (!e.terms) updateData.terms = "Standard race regulations apply. No refunds.";
    if (!e.earlyBirdFee) updateData.earlyBirdFee = Math.max(100, Math.floor((e.price || 1000) * 0.8));
    if (!e.metaTitle) updateData.metaTitle = e.title + " | Munnar Marathon";
    if (!e.metaDescription) updateData.metaDescription = e.shortDescription || "Join us for the most scenic marathon in South India.";
    if (!e.keywords) updateData.keywords = "marathon, munnar, running, trail, kerala";

    if (Object.keys(updateData).length > 0) {
      await prisma.event.update({
        where: { id: e.id },
        data: updateData
      });
      count++;
    }
  }

  console.log(`Successfully backfilled ${count} events.`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
