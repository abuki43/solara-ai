import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { organizations } from "@solar-ai/db/schema/organization";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

export async function loadOwnedAgent(organizationId: string, agentId: string) {
  const [row] = await db
    .select({ agent: agents, organization: organizations })
    .from(agents)
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .where(and(eq(agents.id, agentId), eq(agents.organizationId, organizationId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Receptionist not found" });
  }

  return row;
}
