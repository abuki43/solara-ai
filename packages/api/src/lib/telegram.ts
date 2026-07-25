import { createHash } from "node:crypto";

import { db } from "@solar-ai/db";
import {
  agentTools,
  telegramConnections,
  telegramConnectTokens,
} from "@solar-ai/db/schema/telegram";
import { env } from "@solar-ai/env/server";
import { and, eq, gt, isNull } from "drizzle-orm";

type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: TelegramChat;
  };
};

type TelegramResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
};

function requireBotToken(): string {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("Telegram is not configured on the server");
  }
  return env.TELEGRAM_BOT_TOKEN;
}

async function telegramRequest<T>(
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${requireBotToken()}/${method}`,
    {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    },
  );
  const payload = (await response.json()) as TelegramResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} request failed`);
  }

  return payload.result;
}

export function hashTelegramConnectToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getTelegramBot() {
  return telegramRequest<{ id: number; username: string; first_name: string }>("getMe");
}

export async function sendTelegramMessage(chatId: string, text: string) {
  return telegramRequest<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
  });
}

export async function processTelegramUpdate(update: TelegramUpdate): Promise<boolean> {
  const message = update.message;
  const startToken = message?.text?.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]+)$/)?.[1];
  if (!message || !startToken) return false;

  const [connectToken] = await db
    .select()
    .from(telegramConnectTokens)
    .where(
      and(
        eq(telegramConnectTokens.tokenHash, hashTelegramConnectToken(startToken)),
        isNull(telegramConnectTokens.usedAt),
        gt(telegramConnectTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!connectToken) {
    await sendTelegramMessage(
      String(message.chat.id),
      "This Solar AI connection link is invalid or expired. Please create a new link from the Tools page.",
    );
    return false;
  }

  const chatTitle =
    message.chat.title ||
    [message.chat.first_name, message.chat.last_name].filter(Boolean).join(" ") ||
    message.chat.username ||
    "Telegram chat";

  await db
    .insert(telegramConnections)
    .values({
      id: crypto.randomUUID(),
      organizationId: connectToken.organizationId,
      chatId: String(message.chat.id),
      chatType: message.chat.type,
      chatTitle,
      username: message.chat.username ?? null,
      status: "connected",
    })
    .onConflictDoUpdate({
      target: telegramConnections.organizationId,
      set: {
        chatId: String(message.chat.id),
        chatType: message.chat.type,
        chatTitle,
        username: message.chat.username ?? null,
        status: "connected",
        connectedAt: new Date(),
      },
    });

  await db
    .insert(agentTools)
    .values({
      id: crypto.randomUUID(),
      agentId: connectToken.agentId,
      telegramEnabled: true,
    })
    .onConflictDoUpdate({
      target: agentTools.agentId,
      set: { telegramEnabled: true },
    });

  await db
    .update(telegramConnectTokens)
    .set({ usedAt: new Date() })
    .where(eq(telegramConnectTokens.id, connectToken.id));

  await sendTelegramMessage(
    String(message.chat.id),
    `Connected to Solar AI successfully. Customer handoffs for the selected receptionist can now be delivered here.`,
  );
  return true;
}

let developmentUpdateOffset = 0;

export async function syncTelegramUpdatesForDevelopment(): Promise<void> {
  if (env.NODE_ENV !== "development" || !env.TELEGRAM_BOT_TOKEN) return;

  try {
    const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
      offset: developmentUpdateOffset,
      timeout: 0,
      allowed_updates: ["message"],
    });

    for (const update of updates) {
      developmentUpdateOffset = Math.max(developmentUpdateOffset, update.update_id + 1);
      await processTelegramUpdate(update);
    }
  } catch (error) {
    console.warn("Telegram development polling skipped:", error);
  }
}

export type { TelegramUpdate };
