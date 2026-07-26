import { randomBytes } from "node:crypto";

import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import {
  agentTools,
  telegramConnections,
  telegramConnectTokens,
} from "@solar-ai/db/schema/telegram";
import { env } from "@solar-ai/env/server";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  getTelegramBot,
  hashTelegramConnectToken,
  sendTelegramMessage,
  syncTelegramUpdatesForDevelopment,
} from "../lib/telegram";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

async function requireOwnedAgent(organizationId: string, agentId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.organizationId, organizationId)))
    .limit(1);

  if (!agent) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Receptionist not found" });
  }
  return agent;
}

export const telegramRouter = router({
  getStatus: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireOwnedAgent(ctx.organization.id, input.agentId);
      await syncTelegramUpdatesForDevelopment();

      const [[connection], [tools]] = await Promise.all([
        db
          .select()
          .from(telegramConnections)
          .where(eq(telegramConnections.organizationId, ctx.organization.id))
          .limit(1),
        db.select().from(agentTools).where(eq(agentTools.agentId, input.agentId)).limit(1),
      ]);

      return {
        configured: Boolean(env.TELEGRAM_BOT_TOKEN),
        connected: connection?.status === "connected",
        enabled: tools?.telegramEnabled ?? false,
        connection: connection
          ? {
              chatTitle: connection.chatTitle,
              username: connection.username,
              chatType: connection.chatType,
              connectedAt: connection.connectedAt,
            }
          : null,
      };
    }),

  createConnectLink: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedAgent(ctx.organization.id, input.agentId);

      if (!env.TELEGRAM_BOT_TOKEN) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Telegram is not configured on the server",
        });
      }

      const bot = await getTelegramBot();
      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.insert(telegramConnectTokens).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organization.id,
        agentId: input.agentId,
        tokenHash: hashTelegramConnectToken(token),
        expiresAt,
      });

      return {
        url: `https://t.me/${bot.username}?start=${token}`,
        botUsername: bot.username,
        expiresAt,
      };
    }),

  setEnabled: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedAgent(ctx.organization.id, input.agentId);
      const [connection] = await db
        .select({ id: telegramConnections.id })
        .from(telegramConnections)
        .where(eq(telegramConnections.organizationId, ctx.organization.id))
        .limit(1);

      if (input.enabled && !connection) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connect Telegram before enabling handoffs",
        });
      }

      const [tools] = await db
        .insert(agentTools)
        .values({
          id: crypto.randomUUID(),
          agentId: input.agentId,
          telegramEnabled: input.enabled,
        })
        .onConflictDoUpdate({
          target: agentTools.agentId,
          set: { telegramEnabled: input.enabled },
        })
        .returning();

      return tools;
    }),

  sendTest: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const agent = await requireOwnedAgent(ctx.organization.id, input.agentId);
      const [connection] = await db
        .select()
        .from(telegramConnections)
        .where(eq(telegramConnections.organizationId, ctx.organization.id))
        .limit(1);

      if (!connection) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connect Telegram before sending a test",
        });
      }

      const message = await sendTelegramMessage(
        connection.chatId,
        `Solara AI test successful. Customer handoffs for ${agent.name} can be delivered to this chat.`,
      );
      return { success: true, messageId: message.message_id };
    }),

  disconnect: orgOwnerProcedure.mutation(async ({ ctx }) => {
    const organizationAgents = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.organizationId, ctx.organization.id));

    await db
      .delete(telegramConnections)
      .where(eq(telegramConnections.organizationId, ctx.organization.id));

    if (organizationAgents.length) {
      await db
        .update(agentTools)
        .set({ telegramEnabled: false })
        .where(
          inArray(
            agentTools.agentId,
            organizationAgents.map((agent) => agent.id),
          ),
        );
    }

    return { success: true };
  }),
});
