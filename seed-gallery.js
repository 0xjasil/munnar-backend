import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  await prisma.galleryImage.createMany({
    data: [
      {
        imageUrl: "https://images.unsplash.com/photo-1542202229-7d93c33f5d07?q=80&w=2070&auto=format&fit=crop",
        altText: "Sunrise over tea plantations",
        span: "md:col-span-2 md:row-span-2"
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=2070&auto=format&fit=crop",
        altText: "Runners on misty road",
        span: ""
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?q=80&w=2070&auto=format&fit=crop",
        altText: "Tea rows",
        span: ""
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1504262711132-3295ba26eb68?q=80&w=2070&auto=format&fit=crop",
        altText: "Mountain road",
        span: "md:col-span-2"
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop",
        altText: "Waterfall",
        span: ""
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1444858291040-58f47d473859?q=80&w=2014&auto=format&fit=crop",
        altText: "Sunrise viewpoint",
        span: ""
      }
    ]
  });
  console.log("Seeded dummy gallery images!");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
