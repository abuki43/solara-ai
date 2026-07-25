import {
  processTelegramUpdate,
  type TelegramUpdate,
} from "@solar-ai/api/lib/telegram";
import { env } from "@solar-ai/env/server";
import { Router } from "express";

export const telegramWebhookRouter: Router = Router();

telegramWebhookRouter.post("/webhook", async (req, res) => {
  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    req.header("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await processTelegramUpdate(req.body as TelegramUpdate);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook failed:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
