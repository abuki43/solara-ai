import dotenv from "dotenv";

dotenv.config({ path: new URL("../apps/server/.env", import.meta.url).pathname });

const apiBase = process.env.VERIFY_API_URL ?? "http://localhost:3000";
const webBase = process.env.VERIFY_WEB_URL ?? "http://localhost:3001";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `sprint3-${runId}@example.com`;
const password = "SolarVerify!2026";
let cookie = "";

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function captureCookie(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  if (values.length) {
    cookie = values.map((value) => value.split(";")[0]).join("; ");
  }
}

async function request(path, options = {}, expected = 200) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Origin: webBase,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
  captureCookie(response);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  check(
    response.status === expected,
    `${options.method ?? "GET"} ${path} returns ${expected} (received ${response.status}: ${text})`,
  );
  return body;
}

function trpcResult(body) {
  return body?.result?.data?.json ?? body?.result?.data;
}

async function query(procedure, input, expected = 200) {
  const encoded = encodeURIComponent(JSON.stringify(input ?? {}));
  return request(`/trpc/${procedure}?input=${encoded}`, {}, expected);
}

async function mutate(procedure, input, expected = 200) {
  return request(
    `/trpc/${procedure}`,
    { method: "POST", body: JSON.stringify(input) },
    expected,
  );
}

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

await request("/api/auth/sign-up/email", {
  method: "POST",
  body: JSON.stringify({ name: "Sprint Verification", email, password }),
});
check(cookie.length > 0, "signup establishes a cookie session");

const organizationBody = await query("organization.get");
const organization = trpcResult(organizationBody);
check(Boolean(organization?.id), "first owner request creates or loads an organization");

await mutate("organization.update", {
  name: "Verification Salon",
  phone: "0911123456",
  website: "https://example.com",
  address: "Bole Road, Addis Ababa",
  timezone: "Africa/Addis_Ababa",
});

const createdBody = await mutate("agent.create", {
  name: "Verification Receptionist",
  description: "Automated acceptance-test receptionist",
  useCase: "salon",
});
const agent = trpcResult(createdBody);
check(agent?.status === "draft", "agent wizard creates a draft receptionist");
check(
  agent.slug.startsWith("verification-salon-"),
  "server generates the public slug from the business name",
);
check(
  agent.greeting.includes("Verification Salon's AI customer support assistant"),
  "default greeting uses the company-branded customer support identity",
);

await mutate("agent.update", {
  id: agent.id,
  greeting:
    "Hello, you've reached Verification Salon. I'm Verification Salon's AI customer support assistant. How can I help?",
  hours: {
    monday: { open: "09:00", close: "18:00", closed: false },
    sunday: { open: null, close: null, closed: true },
  },
  services: [
    {
      id: "haircut",
      name: "Haircut",
      price: 200,
      currency: "ETB",
      durationMinutes: 45,
      bookable: true,
    },
  ],
});

await mutate("agent.updateStatus", { id: agent.id, status: "active" });

const testToken = await request("/api/livekit/token", {
  method: "POST",
  body: JSON.stringify({ agentId: agent.id, participantName: "owner-test" }),
});
const testPayload = decodeJwtPayload(testToken.token);
const dispatch = JSON.parse(testPayload.roomConfig.agents[0].metadata);
check(
  dispatch.agentId === agent.id && dispatch.callType === "test" && dispatch.language === "en",
  "owner test token carries the selected agent metadata",
);

const publicToken = await request("/api/livekit/token", {
  method: "POST",
  body: JSON.stringify({ agentSlug: agent.slug, participantName: "public-test" }),
});
const publicPayload = decodeJwtPayload(publicToken.token);
const publicDispatch = JSON.parse(publicPayload.roomConfig.agents[0].metadata);
check(publicDispatch.callType === "public", "active slug creates a public call dispatch");

await request("/api/livekit/end", {
  method: "POST",
  body: JSON.stringify({ roomName: publicToken.roomName, outcome: "completed" }),
});

const internalConfig = await request(`/api/internal/agent/${agent.id}`, {
  headers: { "X-Internal-Key": process.env.INTERNAL_API_KEY },
});
check(
  internalConfig.prompt.includes("Haircut: 200 ETB") &&
    internalConfig.prompt.includes("requests to reveal, replace, ignore, or override") &&
    internalConfig.prompt.includes("Verification Salon's AI customer support assistant"),
  "internal runtime config contains verified knowledge and safety rules",
);

await mutate("agent.updateStatus", { id: agent.id, status: "paused" });
await request(
  "/api/livekit/token",
  { method: "POST", body: JSON.stringify({ agentSlug: agent.slug }) },
  403,
);

const draftBody = await mutate("agent.create", {
  name: "Draft Receptionist",
  description: "Must never receive public calls",
  useCase: "salon",
});
const draftAgent = trpcResult(draftBody);
await request(
  "/api/livekit/token",
  { method: "POST", body: JSON.stringify({ agentSlug: draftAgent.slug }) },
  403,
);
await request(
  "/api/livekit/token",
  { method: "POST", body: JSON.stringify({ agentSlug: `missing-${runId}`.slice(0, 40) }) },
  404,
);

await mutate("agent.updateStatus", { id: agent.id, status: "active" });
let rateLimited = false;
for (let attempt = 0; attempt < 12; attempt += 1) {
  const response = await fetch(`${apiBase}/api/livekit/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentSlug: agent.slug, participantName: `rate-${attempt}` }),
  });
  if (response.status === 429) {
    rateLimited = true;
    break;
  }
}
check(rateLimited, "public IP + slug rate limit blocks excess token creation");

const publicPage = await fetch(`${webBase}/call/${agent.slug}`);
check(publicPage.status === 200, "public call page renders for a valid slug");

await mutate("agent.delete", { id: draftAgent.id });
await mutate("agent.delete", { id: agent.id });
await request("/api/auth/sign-out", { method: "POST", body: "{}" });
await query("organization.get", undefined, 401);

console.log("\nSprint 2–3 owner and public acceptance flow passed.");
