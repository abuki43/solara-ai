import { db } from "@solar-ai/db";
import { organizations } from "@solar-ai/db/schema/organization";
import { eq } from "drizzle-orm";

export async function ensureOrganization(userId: string) {
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const [created] = await db
    .insert(organizations)
    .values({
      id,
      userId,
      name: "My Business",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create organization");
  }

  return created;
}
