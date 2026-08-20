import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seedEvents() {
  console.log("🌱 Seeding Event Categories, Events, and Event Routes...");

  // 1. Seed Categories
  const categoryData = [
    {
      name: "Ultra Marathon",
      slug: "ultra-marathon",
      description: "Extreme long-distance mountain trails through Munnar tea gardens and high peaks.",
      icon: "Trophy",
      distance: "71.3 km",
      startingPrice: 3499,
      displayOrder: 1,
    },
    {
      name: "Full Marathon",
      slug: "full-marathon",
      description: "42.2km official marathon course across high altitude mountain passes.",
      icon: "Medal",
      distance: "42.195 km",
      startingPrice: 3500,
      displayOrder: 2,
    },
    {
      name: "Half Marathon",
      slug: "half-marathon",
      description: "21.1km challenging road and trail run with scenic tea estate views.",
      icon: "Timer",
      distance: "21.097 km",
      startingPrice: 2200,
      displayOrder: 3,
    },
    {
      name: "Fun Run / Trail Walk",
      slug: "fun-run",
      description: "10km and 5km family-friendly eco walk through spice gardens.",
      icon: "Footprints",
      distance: "5 km",
      startingPrice: 900,
      displayOrder: 4,
    },
  ];

  const categories = {};
  for (const cat of categoryData) {
    const created = await prisma.eventCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
    categories[cat.slug] = created;
  }

  // 2. Seed Events
  const eventsData = [
    {
      title: "Munnar Ultra 71K",
      slug: "munnar-ultra-71k",
      subtitle: "The Flagship Peak Trail",
      distance: "71.3 km",
      date: new Date("2027-11-14T06:00:00Z"),
      location: "High Range Club, Munnar",
      price: 3499,
      maxCapacity: 300,
      description: "Conquer the highest peaks of Munnar in this flagship 71.3 km ultra trail marathon.",
      shortDescription: "Flagship 71.3 km mountain trail through tea estates.",
      status: "OPEN",
      elevationGain: "+2,850 m",
      cutoffTime: "14 Hours",
      categoryId: categories["ultra-marathon"].id,
    },
    {
      title: "Tea Garden Full Marathon 42K",
      slug: "tea-garden-full-marathon-42k",
      subtitle: "Official High Altitude Marathon",
      distance: "42.2 km",
      date: new Date("2027-11-14T06:30:00Z"),
      location: "Munnar Town Ground",
      price: 2499,
      maxCapacity: 600,
      description: "42.2 km certified high altitude marathon passing through historic tea plantations.",
      shortDescription: "High-altitude 42.2 km road and trail marathon.",
      status: "OPEN",
      elevationGain: "+1,420 m",
      cutoffTime: "7 Hours",
      categoryId: categories["full-marathon"].id,
    },
    {
      title: "Mist & Valley Half Marathon 21K",
      slug: "mist-valley-half-marathon-21k",
      subtitle: "Popular Scenic Trail",
      distance: "21.1 km",
      date: new Date("2027-11-14T07:00:00Z"),
      location: "Mattupetty Dam Road, Munnar",
      price: 1799,
      maxCapacity: 1000,
      description: "21.1 km half marathon featuring mist-covered valleys and reservoir vistas.",
      shortDescription: "Scenic 21.1 km run past Mattupetty reservoir.",
      status: "OPEN",
      elevationGain: "+680 m",
      cutoffTime: "4 Hours",
      categoryId: categories["half-marathon"].id,
    },
    {
      title: "Spice Trail Fun Run 10K",
      slug: "spice-trail-fun-run-10k",
      subtitle: "Eco Heritage Run",
      distance: "10 km",
      date: new Date("2027-11-14T07:30:00Z"),
      location: "Old Munnar Town",
      price: 999,
      maxCapacity: 1500,
      description: "10 km eco-run past cardamom and pepper plantations for runners of all fitness levels.",
      shortDescription: "10 km family run through spice plantations.",
      status: "OPEN",
      elevationGain: "+240 m",
      cutoffTime: "2.5 Hours",
      categoryId: categories["fun-run"].id,
    },
    {
      title: "Tea Estate Walk 5K",
      slug: "tea-estate-walk-5k",
      subtitle: "Beginner Friendly",
      distance: "5 km",
      date: new Date("2027-11-14T08:00:00Z"),
      location: "Munnar Town Ground",
      price: 499,
      maxCapacity: 2000,
      description: "A leisurely 5km walk through beautiful tea estates for families and beginners.",
      shortDescription: "5 km walk through scenic tea estates.",
      status: "OPEN",
      elevationGain: "+100 m",
      cutoffTime: "2 Hours",
      categoryId: categories["fun-run"].id,
    },
  ];

  const events = {};
  for (const evt of eventsData) {
    const created = await prisma.event.upsert({
      where: { slug: evt.slug },
      update: evt,
      create: evt,
    });
    events[evt.slug] = created;
  }

  // 3. Seed Event Routes
  const routesData = [
    {
      title: "71K Summit Peak Route",
      slug: "71k-summit-peak-route",
      eventId: events["munnar-ultra-71k"].id,
      distance: "71.3 km",
      elevationProfile: "2850m total ascent, max altitude 2100m MSL",
      checkpoints: ["Start - High Range Club (KM 0)", "Aid Station 1 - Mattupetty (KM 15)", "Checkpoint 2 - Top Station Peak (KM 36)", "Aid Station 3 - Echo Point (KM 55)", "Finish - High Range Club (KM 71.3)"],
      displayOrder: 1,
    },
    {
      title: "42K Tea Plantation Route",
      slug: "42k-tea-plantation-route",
      eventId: events["tea-garden-full-marathon-42k"].id,
      distance: "42.2 km",
      elevationProfile: "1420m total ascent",
      checkpoints: ["Start - Town Ground (KM 0)", "Aid Station 1 - Lockhart (KM 12)", "Checkpoint 2 - Gap Road (KM 25)", "Finish - Town Ground (KM 42.2)"],
      displayOrder: 1,
    },
    {
      title: "21K Reservoir Loop",
      slug: "21k-reservoir-loop",
      eventId: events["mist-valley-half-marathon-21k"].id,
      distance: "21.1 km",
      elevationProfile: "680m total ascent",
      checkpoints: ["Start - Mattupetty Dam (KM 0)", "Checkpoint 1 - Kundala Lake (KM 10.5)", "Finish - Mattupetty Dam (KM 21.1)"],
      displayOrder: 1,
    },
  ];

  for (const r of routesData) {
    await prisma.eventRoute.upsert({
      where: { slug: r.slug },
      update: r,
      create: r,
    });
  }

  console.log("✅ Seeded Categories, Events, and Event Routes successfully!");
}

seedEvents()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
  })
  .finally(() => prisma.$disconnect());
