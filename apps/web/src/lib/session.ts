import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "@schedule-maker/database";

const DEV_MODE = process.env.NODE_ENV === "development";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();

  if (session?.user?.id) {
    return prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }

  // In dev mode, fall back to the seeded test user
  if (DEV_MODE) {
    return prisma.user.findFirst({
      where: { email: "test@example.com" },
    });
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
