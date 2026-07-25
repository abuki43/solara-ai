import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";

import { createDb } from "./index";
import { account, user } from "./schema/auth";
import { agents } from "./schema/agent";
import { availabilitySlots } from "./schema/booking";
import { agentFaqs } from "./schema/faq";
import { organizations } from "./schema/organization";
import { agentTools } from "./schema/telegram";

const DEMO_EMAIL = "demo@bellasalon.com";
const DEMO_PASSWORD = "BellaDemo2026!";
const DEMO_ORG_NAME = "Bella Salon";
const DEMO_AGENT_SLUG = "bella-receptionist-en";
const HAIRCUT_SERVICE_ID = "svc_haircut";

const salonHours = {
  monday: { open: "09:00", close: "19:00", closed: false },
  tuesday: { open: "09:00", close: "19:00", closed: false },
  wednesday: { open: "09:00", close: "19:00", closed: false },
  thursday: { open: "09:00", close: "19:00", closed: false },
  friday: { open: "09:00", close: "19:00", closed: false },
  saturday: { open: "09:00", close: "19:00", closed: false },
  sunday: { open: null, close: null, closed: true },
};

const salonServices = [
  {
    id: HAIRCUT_SERVICE_ID,
    name: "Haircut",
    price: 200,
    currency: "ETB",
    durationMinutes: 30,
    bookable: true,
  },
  {
    id: "svc_color",
    name: "Hair Color",
    price: 500,
    currency: "ETB",
    durationMinutes: 90,
    bookable: true,
  },
  {
    id: "svc_manicure",
    name: "Manicure",
    price: 150,
    currency: "ETB",
    durationMinutes: 45,
    bookable: true,
  },
];

async function seed() {
  const db = createDb();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const [existingUser] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL)).limit(1);
  const userId = existingUser?.id ?? crypto.randomUUID();

  if (existingUser) {
    await db
      .update(user)
      .set({ name: "Bella Demo Owner", emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, userId));
  } else {
    await db.insert(user).values({
      id: userId,
      name: "Bella Demo Owner",
      email: DEMO_EMAIL,
      emailVerified: true,
    });
  }

  const [existingAccount] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  if (existingAccount) {
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(account.id, existingAccount.id));
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
  }

  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .limit(1);
  const organizationId = existingOrg?.id ?? crypto.randomUUID();

  if (existingOrg) {
    await db
      .update(organizations)
      .set({
        name: DEMO_ORG_NAME,
        phone: "+251911000000",
        address: "Bole, near Edna Mall, Addis Ababa",
        website: "https://bellasalon.example",
        timezone: "Africa/Addis_Ababa",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  } else {
    await db.insert(organizations).values({
      id: organizationId,
      userId,
      name: DEMO_ORG_NAME,
      phone: "+251911000000",
      address: "Bole, near Edna Mall, Addis Ababa",
      website: "https://bellasalon.example",
      timezone: "Africa/Addis_Ababa",
    });
  }

  const greeting =
    "Hello, thank you for calling Bella Salon. You've reached our customer support. I'm an AI assistant — how can I help you today?";

  const [existingAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.slug, DEMO_AGENT_SLUG))
    .limit(1);
  const agentId = existingAgent?.id ?? crypto.randomUUID();

  if (existingAgent) {
    await db
      .update(agents)
      .set({
        organizationId,
        name: "Bella Receptionist",
        description: "English browser receptionist for Bella Salon",
        useCase: "salon",
        status: "active",
        primaryLanguage: "en",
        additionalLanguages: [],
        voiceConfig: { en: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc" },
        greeting,
        tone: "friendly",
        businessName: DEMO_ORG_NAME,
        hours: salonHours,
        services: salonServices,
        aboutText:
          "Bella Salon is a friendly neighborhood salon in Bole offering haircuts, color, and manicures.",
        customInstructions: "Always confirm the caller's name before booking.",
        widgetButtonLabel: "Call Bella",
        widgetAccentColor: "#7cf0ff",
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));
  } else {
    await db.insert(agents).values({
      id: agentId,
      organizationId,
      name: "Bella Receptionist",
      slug: DEMO_AGENT_SLUG,
      description: "English browser receptionist for Bella Salon",
      useCase: "salon",
      status: "active",
      primaryLanguage: "en",
      additionalLanguages: [],
      voiceConfig: { en: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc" },
      greeting,
      tone: "friendly",
      businessName: DEMO_ORG_NAME,
      hours: salonHours,
      services: salonServices,
      aboutText:
        "Bella Salon is a friendly neighborhood salon in Bole offering haircuts, color, and manicures.",
      customInstructions: "Always confirm the caller's name before booking.",
      widgetButtonLabel: "Call Bella",
      widgetAccentColor: "#7cf0ff",
    });
  }

  await db
    .insert(agentTools)
    .values({
      id: crypto.randomUUID(),
      agentId,
      telegramEnabled: false,
      bookingEnabled: true,
      bookingServiceIds: [HAIRCUT_SERVICE_ID, "svc_color", "svc_manicure"],
      bookingLeadMinutes: 60,
      bookingWindowDays: 14,
      bookingBufferMinutes: 0,
    })
    .onConflictDoUpdate({
      target: agentTools.agentId,
      set: {
        bookingEnabled: true,
        bookingServiceIds: [HAIRCUT_SERVICE_ID, "svc_color", "svc_manicure"],
        updatedAt: new Date(),
      },
    });

  await db.delete(agentFaqs).where(eq(agentFaqs.agentId, agentId));
  await db.insert(agentFaqs).values([
    {
      id: crypto.randomUUID(),
      agentId,
      question: "Do I need an appointment?",
      answer: "Walk-ins are welcome when we have space, but booking ahead is recommended on weekends.",
      sortOrder: 0,
    },
    {
      id: crypto.randomUUID(),
      agentId,
      question: "Where are you located?",
      answer: "We are in Bole, near Edna Mall in Addis Ababa.",
      sortOrder: 1,
    },
    {
      id: crypto.randomUUID(),
      agentId,
      question: "How much is a haircut?",
      answer: "A standard haircut is 200 ETB and takes about 30 minutes.",
      sortOrder: 2,
    },
  ]);

  await db.delete(availabilitySlots).where(eq(availabilitySlots.agentId, agentId));

  const timezone = "Africa/Addis_Ababa";
  const slotRows: Array<{
    id: string;
    agentId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }> = [];

  for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
    const day = DateTime.now().setZone(timezone).plus({ days: dayOffset }).startOf("day");
    if (day.weekday === 7) continue;
    for (let hour = 9; hour < 19; hour += 1) {
      for (const minute of [0, 30]) {
        if (hour === 18 && minute === 30) continue;
        const start = day.set({ hour, minute });
        const end = start.plus({ minutes: 30 });
        slotRows.push({
          id: crypto.randomUUID(),
          agentId,
          serviceId: HAIRCUT_SERVICE_ID,
          startTime: start.toUTC().toJSDate(),
          endTime: end.toUTC().toJSDate(),
          status: "available",
        });
      }
    }
  }

  if (slotRows.length) {
    await db.insert(availabilitySlots).values(slotRows);
  }

  console.log("Demo seed complete.");
  console.log(`  Login: ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Public call: /call/${DEMO_AGENT_SLUG}`);
  console.log(`  Embed demo: /embed-demo.html`);
}

seed().catch((error) => {
  console.error("Demo seed failed:", error);
  process.exit(1);
});
