import { prisma } from "@schedule-maker/database";

/**
 * Seeds example blocks, a template, and givens for a newly registered user.
 * Non-blocking — errors are logged but don't break registration.
 */
export async function seedExamplesForUser(userId: string) {
  try {
    const blocks = await Promise.all([
      prisma.block.create({
        data: {
          userId,
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
          userId,
          name: "Study",
          duration: 120,
          category: "education",
          color: "#3B82F6",
          description: "Focused study time",
        },
      }),
      prisma.block.create({
        data: {
          userId,
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
          userId,
          name: "Meal Prep",
          duration: 30,
          category: "health",
          color: "#10B981",
          description: "Prepare meals",
        },
      }),
      prisma.block.create({
        data: {
          userId,
          name: "Deep Work",
          duration: 90,
          category: "work",
          color: "#F59E0B",
          description: "Focused work session",
          constraints: { timePreference: "morning" },
        },
      }),
    ]);

    await prisma.template.create({
      data: {
        userId,
        name: "Weekday Routine",
        description: "Standard weekday schedule — edit or replace with your own",
        isDefault: true,
        templateBlocks: {
          create: blocks.map((block, index) => ({
            blockId: block.id,
            order: index,
          })),
        },
      },
    });

    await Promise.all([
      prisma.given.create({
        data: {
          userId,
          name: "Day Shift",
          startTime: "07:00",
          endTime: "19:00",
          color: "#10B981",
        },
      }),
      prisma.given.create({
        data: {
          userId,
          name: "Night Shift",
          startTime: "19:00",
          endTime: "07:00",
          color: "#6366F1",
        },
      }),
    ]);
  } catch (error) {
    console.error("Failed to seed examples for user:", userId, error);
  }
}
