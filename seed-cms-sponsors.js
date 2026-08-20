import prisma from "./src/config/db.js";

async function seedCMS() {
  console.log("Seeding CMS initial sponsors with tiers...");

  const sponsors = [
    { name: "Tata Tea", logoUrl: "/src/assets/sponsors/tata-tea.png", tier: "Title", displayOrder: 1, active: true },
    { name: "Kerala Tourism", logoUrl: "/src/assets/sponsors/kerala-tourism.png", tier: "Presenting", displayOrder: 2, active: true },
    { name: "Taj Hotels", logoUrl: "/src/assets/sponsors/taj-hotels.png", tier: "Presenting", displayOrder: 3, active: true },
    { name: "ASICS", logoUrl: "/src/assets/sponsors/asics.svg", tier: "Performance", displayOrder: 4, active: true },
    { name: "Suunto", logoUrl: "/src/assets/sponsors/suunto.svg", tier: "Performance", displayOrder: 5, active: true },
    { name: "Decathlon", logoUrl: "/src/assets/sponsors/decathlon.png", tier: "Performance", displayOrder: 6, active: true },
    { name: "Hidesign", logoUrl: "/src/assets/sponsors/hidesign.svg", tier: "Lifestyle", displayOrder: 7, active: true },
    { name: "Fastrack", logoUrl: "/src/assets/sponsors/fastrack.png", tier: "Lifestyle", displayOrder: 8, active: true },
  ];

  for (const s of sponsors) {
    const existing = await prisma.sponsor.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.sponsor.create({ data: s });
      console.log(`Created sponsor: ${s.name} (${s.tier})`);
    } else {
      await prisma.sponsor.update({ where: { id: existing.id }, data: { tier: s.tier } });
      console.log(`Updated sponsor tier: ${s.name} -> ${s.tier}`);
    }
  }

  console.log("CMS Sponsors seed & update complete!");
  process.exit(0);
}

seedCMS().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
