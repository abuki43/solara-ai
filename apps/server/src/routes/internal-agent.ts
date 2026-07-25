import { buildAgentPrompt } from "@solar-ai/api/lib/agent-prompt";
import { buildFileContext } from "@solar-ai/api/lib/file-context";
import { sendTelegramMessage } from "@solar-ai/api/lib/telegram";
import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { agentFiles } from "@solar-ai/db/schema/agent-file";
import { callSessions } from "@solar-ai/db/schema/call-session";
import { agentFaqs } from "@solar-ai/db/schema/faq";
import { organizations } from "@solar-ai/db/schema/organization";
import {
  agentTools,
  handoffRequests,
  telegramConnections,
} from "@solar-ai/db/schema/telegram";
import { env } from "@solar-ai/env/server";
import { and, asc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { Router } from "express";
import { z } from "zod";

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

  const [[tools], [telegramConnection], faqs, files] = await Promise.all([
    db.select().from(agentTools).where(eq(agentTools.agentId, result.agent.id)).limit(1),
    db
      .select({ id: telegramConnections.id })
      .from(telegramConnections)
      .where(eq(telegramConnections.organizationId, result.organization.id))
      .limit(1),
    db
      .select({
        question: agentFaqs.question,
        answer: agentFaqs.answer,
      })
      .from(agentFaqs)
      .where(eq(agentFaqs.agentId, result.agent.id))
      .orderBy(asc(agentFaqs.sortOrder), asc(agentFaqs.createdAt)),
    db
      .select({
        id: agentFiles.id,
        createdAt: agentFiles.createdAt,
        extractedText: agentFiles.extractedText,
        parseStatus: agentFiles.parseStatus,
      })
      .from(agentFiles)
      .where(eq(agentFiles.agentId, result.agent.id))
      .orderBy(asc(agentFiles.createdAt)),
  ]);
  const telegramEnabled = Boolean(tools?.telegramEnabled && telegramConnection);
  const basePrompt = buildAgentPrompt({
    agent: result.agent,
    organization: result.organization,
    faqs,
    fileContext: buildFileContext(files),
  });
  const enabledTools: string[] = [];
  let prompt = basePrompt;

  if (telegramEnabled) {
    enabledTools.push("telegram_handoff");
    prompt += `

Human follow-up:
- When verified information cannot answer the caller, offer a human follow-up.
- Before requesting a handoff, ask for explicit permission to send their details.
- After permission, collect their name, preferred phone or Telegram contact, and a concise reason.
- Repeat the details for confirmation, then call request_handoff exactly once.
- Never claim the handoff was delivered unless the tool returns success.`;
  }

  if (tools?.bookingEnabled) {
    enabledTools.push("booking");
    const timezone = result.organization.timezone;
    const today = DateTime.now().setZone(timezone);
    const bookableServices = result.agent.services
      .filter(
        (service) =>
          service.bookable &&
          (!tools.bookingServiceIds?.length || tools.bookingServiceIds.includes(service.id)),
      )
      .map((service) => service.name);
    prompt += `

Appointment booking:
- Today's local date is ${today.toFormat("cccc, LLLL d, yyyy")} (${today.toISODate()}) in ${timezone}.
- Bookable services (use these exact names when possible): ${bookableServices.length ? bookableServices.join(", ") : "none configured"}.
- Use check_availability before offering appointment times. Never invent availability.
- For check_availability, pass the service name and a date (YYYY-MM-DD, today, tomorrow, or a weekday name).
- Offer only exact times returned by check_availability.
- If no slots are returned, suggest another day and check again instead of saying availability cannot be checked.
- Before booking, collect and repeat the service, time, caller name, and contact.
- Ask for explicit permission to store those details for the appointment.
- Call book_appointment only after the caller confirms every detail.
- A booking is confirmed only when book_appointment returns success.
- For lookup, cancellation, or rescheduling, require both the confirmation code and exact matching contact.
- Call lookup_booking first. Do not reveal booking details when verification fails.
- Before cancellation or rescheduling, repeat the proposed action and get explicit confirmation.
- For rescheduling, call check_availability and use an exact returned time before reschedule_booking.
- Say an action succeeded only after its database tool returns success; after a conflict, re-check availability and offer alternatives.`;
  }

  res.json({
    agent: result.agent,
    organization: result.organization,
    prompt,
    enabledTools,
  });
});

const handoffInputSchema = z.object({
  roomName: z.string().min(1).max(200),
  callerName: z.string().min(1).max(100),
  callerContact: z.string().min(3).max(150),
  reason: z.string().min(3).max(600),
  consentGiven: z.literal(true),
});

internalAgentRouter.post("/agent/:id/handoff", async (req, res) => {
  if (req.header("X-Internal-Key") !== env.INTERNAL_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = handoffInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Confirmed caller consent, name, contact, and reason are required",
    });
    return;
  }

  const [result] = await db
    .select({
      agent: agents,
      organization: organizations,
      tools: agentTools,
      connection: telegramConnections,
    })
    .from(agents)
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .innerJoin(agentTools, eq(agentTools.agentId, agents.id))
    .innerJoin(
      telegramConnections,
      eq(telegramConnections.organizationId, organizations.id),
    )
    .where(
      and(
        eq(agents.id, req.params.id),
        eq(agentTools.telegramEnabled, true),
        eq(telegramConnections.status, "connected"),
      ),
    )
    .limit(1);

  if (!result) {
    res.status(409).json({ error: "Telegram handoff is not enabled" });
    return;
  }

  const handoffId = crypto.randomUUID();
  await db.insert(handoffRequests).values({
    id: handoffId,
    agentId: result.agent.id,
    roomName: parsed.data.roomName,
    callerName: parsed.data.callerName,
    callerContact: parsed.data.callerContact,
    reason: parsed.data.reason,
    consentAt: new Date(),
    status: "pending",
  });

  const text = [
    "New Solar AI customer handoff",
    `Business: ${result.organization.name}`,
    `Receptionist: ${result.agent.name}`,
    `Caller: ${parsed.data.callerName}`,
    `Contact: ${parsed.data.callerContact}`,
    `Reason: ${parsed.data.reason}`,
    `Received: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    const telegramMessage = await sendTelegramMessage(result.connection.chatId, text);
    await db
      .update(handoffRequests)
      .set({
        status: "sent",
        telegramMessageId: String(telegramMessage.message_id),
        deliveredAt: new Date(),
      })
      .where(eq(handoffRequests.id, handoffId));

    await db
      .update(callSessions)
      .set({ outcome: "handoff" })
      .where(eq(callSessions.roomName, parsed.data.roomName));

    res.json({
      success: true,
      handoffId,
      message:
        "The request was sent to the business. Tell the caller someone will follow up using the contact they provided.",
    });
  } catch (error) {
    const deliveryError = error instanceof Error ? error.message : "Telegram delivery failed";
    await db
      .update(handoffRequests)
      .set({ status: "failed", deliveryError: deliveryError.slice(0, 500) })
      .where(eq(handoffRequests.id, handoffId));
    res.status(502).json({
      error:
        "The handoff could not be delivered. Apologize and ask the caller to contact the business directly.",
    });
  }
});
