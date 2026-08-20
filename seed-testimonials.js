import prisma from "./src/config/db.js";

async function seedTestimonials() {
  console.log("Seeding static legacy testimonials into PostgreSQL...");

  const staticTestimonials = [
    {
      name: "Anjali Menon",
      designation: "Sub‑3 marathoner",
      company: "Bengaluru",
      message: "It's the most beautiful course I've ever run. The mist, the silence, the tea hills — running becomes meditation here.",
      displayOrder: 1,
      isPublished: true,
    },
    {
      name: "Rohan D'Souza",
      designation: "Ultra runner",
      company: "Mumbai",
      message: "Every detail felt curated — from the sunrise shakeout to the artisan medal. A true premium experience in the hills.",
      displayOrder: 2,
      isPublished: true,
    },
    {
      name: "Sara Williams",
      designation: "Travel writer",
      company: "London",
      message: "More than a race. A weekend in nature with people who care about the land. I'll be back every year.",
      displayOrder: 3,
      isPublished: true,
    },
  ];

  for (const item of staticTestimonials) {
    const existing = await prisma.testimonial.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.testimonial.create({ data: item });
      console.log(`Migrated testimonial for: ${item.name}`);
    }
  }

  console.log("Testimonials migration seed complete!");
  process.exit(0);
}

seedTestimonials().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
