import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hash("password123", 12);

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: { passwordHash },
    create: {
      email: "test@example.com",
      name: "Test User",
      passwordHash,
      timezone: "America/New_York",
      dayStartTime: "07:00",
      dayEndTime: "22:00",
      defaultBreakMins: 15,
    },
  });

  // Create sample blocks
  const blocks = await Promise.all([
    prisma.block.create({
      data: {
        userId: user.id,
        name: "Gym",
        duration: 60,
        category: "health",
        color: "#EF4444",
        description: "Workout session",
        constraints: { timePreference: "morning" },
      },
    }),
    prisma.block.create({
      data: {
        userId: user.id,
        name: "Study",
        duration: 120,
        category: "education",
        color: "#3B82F6",
        description: "Focused study time",
      },
    }),
    prisma.block.create({
      data: {
        userId: user.id,
        name: "Reading",
        duration: 45,
        category: "personal",
        color: "#8B5CF6",
        description: "Read a book",
        constraints: { timePreference: "evening" },
      },
    }),
    prisma.block.create({
      data: {
        userId: user.id,
        name: "Meal Prep",
        duration: 30,
        category: "health",
        color: "#10B981",
        description: "Prepare meals",
      },
    }),
    prisma.block.create({
      data: {
        userId: user.id,
        name: "Deep Work",
        duration: 90,
        category: "work",
        color: "#F59E0B",
        description: "Focused work session",
        constraints: { timePreference: "morning" },
      },
    }),
  ]);

  // Create a template
  const template = await prisma.template.create({
    data: {
      userId: user.id,
      name: "Weekday Routine",
      description: "Standard weekday schedule",
      isDefault: true,
      templateBlocks: {
        create: blocks.map((block, index) => ({
          blockId: block.id,
          order: index,
        })),
      },
    },
  });

  // Create reusable givens (lego pieces)
  const givens = await Promise.all([
    prisma.given.create({
      data: {
        userId: user.id,
        name: "Day Shift",
        startTime: "07:00",
        endTime: "19:00",
        color: "#10B981",
        priority: 5,
      },
    }),
    prisma.given.create({
      data: {
        userId: user.id,
        name: "Night Shift",
        startTime: "19:00",
        endTime: "07:00",
        color: "#6366F1",
        priority: 5,
      },
    }),
  ]);

  console.log(`Created user: ${user.email}`);
  console.log(`Created ${blocks.length} blocks`);
  console.log(`Created template: ${template.name}`);
  console.log(`Created ${givens.length} givens`);
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
