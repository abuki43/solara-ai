import { buildAgentPrompt } from "@solar-ai/api/lib/agent-prompt";
import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { organizations } from "@solar-ai/db/schema/organization";
import { env } from "@solar-ai/env/server";
import { eq } from "drizzle-orm";
import { Router } from "express";

export const internalAgentRouter: Router = Router();

internalAgentRouter.get("/agent/:id", async (req, res) => {
  if (req.header("X-Internal-Key") !== env.INTERNAL_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [result] = await db
    .select({ agent: agents, organization: organizations })
    .from(agents)
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .where(eq(agents.id, req.params.id))
    .limit(1);

  if (!result) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  res.json({
    agent: result.agent,
    organization: result.organization,
    prompt: buildAgentPrompt({
      agent: result.agent,
      organization: result.organization,
    }),
    enabledTools: [],
  });
});
