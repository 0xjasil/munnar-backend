import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Full unchecked access to all system settings, databases, roles, events, and finance.",
    permissions: ["Manage Roles", "Manage Events", "Manage Registrations", "Assign Bibs", "View Reports", "Delete Data", "System Settings"],
  },
  {
    name: "ADMIN",
    label: "Administrator",
    description: "Manage events, registrations, bib numbers, and basic runner support.",
    permissions: ["Manage Events", "Manage Registrations", "Assign Bibs", "View Reports"],
  },
  {
    name: "ORGANIZER",
    label: "Race Organizer",
    description: "Create and edit event schedules, manage course logistics, and view race metrics.",
    permissions: ["Manage Events", "View Registrations", "View Reports"],
  },
  {
    name: "VOLUNTEER",
    label: "Volunteer / Crew",
    description: "Bib pickup scanning, participant check-in, and aid station management.",
    permissions: ["Assign Bibs", "View Registrations"],
  },
  {
    name: "RUNNER",
    label: "Runner / Participant",
    description: "Standard public account. Register for races and view race bib tickets.",
    permissions: ["Register for Race", "View Tickets"],
  },
];

async function main() {
  console.log("🌱 Starting seed with Role table...");

  // 1. Seed Roles into DB
  const createdRoles = {};
  for (const roleDef of DEFAULT_ROLES) {
    const r = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        label: roleDef.label,
        description: roleDef.description,
        permissions: roleDef.permissions,
      },
      create: roleDef,
    });
    createdRoles[roleDef.name] = r;
    console.log(`✅ Role seeded: ${r.name} (${r.id})`);
  }

  // 2. Seed 1st User as SUPER_ADMIN
  const adminPasswordHash = await bcrypt.hash("admin", 10);
  const superAdminRole = createdRoles["SUPER_ADMIN"];

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@munnarmarathon.com" },
    update: {
      passwordHash: adminPasswordHash,
      roleId: superAdminRole.id,
      roleName: "SUPER_ADMIN",
    },
    create: {
      email: "admin@munnarmarathon.com",
      username: "admin",
      passwordHash: adminPasswordHash,
      fullName: "System Admin",
      mobile: "+919876543210",
      roleId: superAdminRole.id,
      roleName: "SUPER_ADMIN",
      emailVerified: true,
    },
  });

  console.log(`👑 1st User created as Admin: id=${adminUser.id}, email=${adminUser.email}, roleName=${adminUser.roleName}`);

  // 3. Seed sample events
  const events = [
    {
      slug: "ultra-run",
      title: "Munnar Ultra 71K",
      subtitle: "The Ultimate Mountain Endurance Challenge",
      distance: "71 KM",
      date: new Date("2027-11-14T05:00:00Z"),
      location: "High Range Club, Munnar",
      price: 4500,
      maxCapacity: 250,
      description: "Conquer 71 kilometers across tea estates, cloud forests, and high altitude crests.",
      status: "OPEN",
    },
    {
      slug: "full-marathon",
      title: "Munnar Full Marathon 42.2K",
      subtitle: "A Classic Boston-Qualifier Route in the Hills",
      distance: "42.2 KM",
      date: new Date("2027-11-14T06:00:00Z"),
      location: "Munnar Town Square",
      price: 3200,
      maxCapacity: 600,
      description: "42.2 kilometers of paved hill roads with 1,200m elevation gain.",
      status: "OPEN",
    },
  ];

  for (const ev of events) {
    await prisma.event.upsert({
      where: { slug: ev.slug },
      update: ev,
      create: ev,
    });
  }

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
