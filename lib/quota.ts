import { prisma } from "./db";

/**
 * Counts pipeline runs (applications created) so far this calendar month for a
 * user and compares against their quota. Simple and good enough for an MVP —
 * see the system design doc's `usage_events` table for a more precise,
 * cost-based version to grow into later.
 */
export async function checkQuota(
  userId: string
): Promise<{ allowed: boolean; used: number; quota: number }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await prisma.application.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  });

  return { allowed: used < user.monthlyRunQuota, used, quota: user.monthlyRunQuota };
}
