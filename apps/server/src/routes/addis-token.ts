import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { agentFaqs } from "@solar-ai/db/schema/faq";
import { organizations } from "@solar-ai/db/schema/organization";
import { env } from "@solar-ai/env/server";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const addisTokenRouter: Router = Router();

const tokenInputSchema = z.object({
  slug: z.string().min(1),
});

addisTokenRouter.post("/realtime-token", async (req, res) => {
  try {
    const input = tokenInputSchema.parse(req.body);

    if (!env.ADDIS_API_KEY || !env.ADDIS_AMHARIC_ENABLED) {
      res.status(503).json({
        error: "Amharic Realtime is not enabled on this server",
      });
      return;
    }

    const [record] = await db
      .select({
        agent: agents,
        organization: organizations,
      })
      .from(agents)
      .innerJoin(organizations, eq(agents.organizationId, organizations.id))
      .where(eq(agents.slug, input.slug))
      .limit(1);

    if (!record) {
      res.status(404).json({ error: "Receptionist not found" });
      return;
    }

    const faqs = await db
      .select()
      .from(agentFaqs)
      .where(eq(agentFaqs.agentId, record.agent.id));

    const servicesList = (record.agent.services || [])
      .map(
        (s) => `- ${s.name}: ${s.price} ${s.currency || "ETB"} (${s.durationMinutes} min)`,
      )
      .join("\n");

    const faqList = faqs
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n\n");

    const systemPrompt = `እርስዎ የ${record.organization.name} ተወዳጅ እና ፕሮፌሽናል ኢትዮጵያዊት አስተናጋጅ (Receptionist) ነዎት።

[ቋንቋ እና ደንብ]
- መልስዎን ሁልጊዜ በአማርኛ ፊደል (ግዕዝ) ብቻ ይመልሱ።
- መልስዎ አጭር፣ ግልጽ እና ትህትና የተሞላበት ይሁን (ከ 1 እስከ 2 አረፍተ ነገር)።

[የድርጅቱ መረጃ]
- የድርጅቱ ስም: ${record.organization.name}
- አድራሻ: ${record.organization.address || "አዲስ አበባ፣ ቦሌ"}
- ስልክ: ${record.organization.phone || "+251911000000"}
- ስለ ድርጅቱ: ${record.agent.aboutText || record.agent.description || "የውበትና የፀጉር አሰራር አገልግሎት።"}

[አገልግሎቶች እና ዋጋ]
${servicesList}

[ተደጋጋሚ ጥያቄዎች]
${faqList}

[ተጨማሪ መመሪያ]
${record.agent.customInstructions || "ደንበኛውን በደስታ ያስተናግዱ።"}

[መሳሪያዎች (Tools)]
- checkAvailability: የነፃ ሰዓት ዝርዝር ለማየት ይጠቀሙ።
- bookAppointment: ደንበኛው ቀጠሮ ለመያዝ ሲፈልግ (ስም፣ ስልክ፣ አገልግሎት፣ ሰዓት) በመውሰድ ቀጠሮ ይያዙ።`;

    const amharicGreeting = `ሰላም! እንኳን ወደ ${record.organization.name} በደህና መጡ። እንዴት ልረዳዎት እችላለሁ?`;

    res.json({
      apiKey: env.ADDIS_API_KEY,
      agentId: record.agent.id,
      organizationId: record.organization.id,
      organizationName: record.organization.name,
      greeting: amharicGreeting,
      systemPrompt,
      internalApiKey: env.INTERNAL_API_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid request" });
      return;
    }
    console.error("Failed to generate Addis Realtime token:", error);
    res.status(500).json({ error: "Failed to issue Realtime token" });
  }
});
