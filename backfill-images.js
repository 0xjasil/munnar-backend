import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfillImages() {
  console.log("Starting backfill for images...");
  const events = await prisma.event.findMany();
  
  // Find a donor event that has images
  const donorEvent = events.find(e => e.bannerImage && e.bannerImage.startsWith('data:'));
  
  let fallbackBanner = "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80";
  let fallbackGallery = [
    "https://images.unsplash.com/photo-1530549387726-06015d5ce6fd?w=800&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80"
  ];
  let fallbackBrochure = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  let fallbackSponsors = [
    "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
  ];

  if (donorEvent) {
    console.log("Found a donor event with images to clone from: " + donorEvent.title);
    if (donorEvent.bannerImage) fallbackBanner = donorEvent.bannerImage;
    if (donorEvent.galleryImages && donorEvent.galleryImages.length > 0) fallbackGallery = donorEvent.galleryImages;
    if (donorEvent.brochure) fallbackBrochure = donorEvent.brochure;
    if (donorEvent.sponsorLogos && donorEvent.sponsorLogos.length > 0) fallbackSponsors = donorEvent.sponsorLogos;
  } else {
    console.log("No existing event with base64 images found. Using online placeholders.");
  }

  let count = 0;
  for (const e of events) {
    const updateData = {};
    
    if (!e.bannerImage) updateData.bannerImage = fallbackBanner;
    if (!e.galleryImages || e.galleryImages.length === 0) updateData.galleryImages = fallbackGallery;
    if (!e.brochure) updateData.brochure = fallbackBrochure;
    if (!e.sponsorLogos || e.sponsorLogos.length === 0) updateData.sponsorLogos = fallbackSponsors;

    if (Object.keys(updateData).length > 0) {
      await prisma.event.update({
        where: { id: e.id },
        data: updateData
      });
      count++;
    }
  }

  console.log(`Successfully backfilled images for ${count} events.`);
}

backfillImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
