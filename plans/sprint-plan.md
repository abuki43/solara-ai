# Solar AI — Ultra-Detailed Sprint Plan

**Version:** 2.0  
**Last updated:** 2026-07-25

---

## Locked product rules

| Rule | Detail |
|------|--------|
| 1 user = 1 org | Organization auto-created on signup. No org switcher. |
| Multiple agents | Each org can create many agents (receptionist, after-hours, etc.). |
| Agent setup is separate | **Agents menu** = create/edit agent identity only. Voice, Files, Tools, Calls are separate main menus. |
| Agent selector | Header dropdown sets context for Voice, Knowledge, Files, Tools, Calls. |
| Call logs = **summary** | Calls menu shows short summary per call. Full transcript only on detail click. |
| Files limit | Max **2 MB** per file. Max **5 files** per agent. Allowed: `.txt`, `.md`, `.pdf`. |
| No recordings v1 | Audio playback deferred. Transcript text only. |
| No billing v1 | Stripe deferred to post-Sprint 7. |

---

## Dashboard — final sidebar

```
Solar AI                    [ Agent: Bella Receptionist ▼ ]

├── Agents        ← setup only (name, use case, languages, status)
├── Voice         ← voice picker, greeting, tone
├── Knowledge     ← hours, services, FAQ, pasted text
├── Files         ← upload small docs (2MB max)
├── Tools         ← Telegram, booking
├── Calls         ← call summaries (not full logs inline)
└── Settings      ← business profile, account
```

### Menu scope matrix

| Menu | Needs agent selected? | Editable without call? |
|------|----------------------|------------------------|
| Agents | No | Yes |
| Voice | Yes | Yes |
| Knowledge | Yes | Yes |
| Files | Yes | Yes |
| Tools | Yes | Yes |
| Calls | Yes (filter: all agents optional) | Read-only |
| Settings | No | Yes |

---

## Complete database schema

### `organizations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | text UNIQUE | FK → Better-Auth user.id |
| `name` | text NOT NULL | Business legal/display name |
| `phone` | text | |
| `website` | text | |
| `address` | text | Area/address spoken by agent |
| `timezone` | text DEFAULT `Africa/Addis_Ababa` | For booking slots |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `agents`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `organization_id` | uuid FK | |
| `name` | text NOT NULL | Display name: "Main Receptionist" |
| `slug` | text NOT NULL | URL slug, unique per org: `bella-receptionist` |
| `description` | text | Internal notes |
| `use_case` | enum | `salon` \| `clinic` \| `restaurant` \| `general` |
| `status` | enum | `draft` \| `active` \| `paused` |
| `primary_language` | enum | `en` \| `am` \| `om` |
| `additional_languages` | jsonb | `["am"]` — empty array if monolingual |
| `voice_config` | jsonb | `{ "en": "cartesia-voice-id", "am": "addis-voice-id" }` |
| `greeting` | text | Spoken on call start |
| `tone` | enum | `friendly` \| `professional` \| `casual` |
| `business_name` | text | Spoken name; defaults to org.name |
| `hours` | jsonb | See hours schema below |
| `services` | jsonb | See services schema below |
| `about_text` | text | Pasted "about us" (max 4000 chars) |
| `custom_instructions` | text | Owner overrides (max 2000 chars) |
| `widget_button_label` | text DEFAULT `Start Call` | Embed button text |
| `widget_accent_color` | text DEFAULT `#7cf0ff` | Embed accent hex |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Unique constraint:** `(organization_id, slug)`

#### `hours` JSON shape
```json
{
  "mon": { "open": "09:00", "close": "19:00", "closed": false },
  "tue": { "open": "09:00", "close": "19:00", "closed": false },
  "wed": { "open": "09:00", "close": "19:00", "closed": false },
  "thu": { "open": "09:00", "close": "19:00", "closed": false },
  "fri": { "open": "09:00", "close": "19:00", "closed": false },
  "sat": { "open": "09:00", "close": "19:00", "closed": false },
  "sun": { "open": null, "close": null, "closed": true }
}
```

#### `services` JSON shape
```json
[
  {
    "id": "svc_1",
    "name": "Haircut",
    "price": 200,
    "currency": "ETB",
    "durationMinutes": 30,
    "bookable": true
  }
]
```

### `agent_faqs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `question` | text NOT NULL | Max 500 chars |
| `answer` | text NOT NULL | Max 1000 chars |
| `sort_order` | int DEFAULT 0 | |
| `created_at` | timestamp | |

### `agent_files`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `filename` | text NOT NULL | Original filename |
| `mime_type` | text | `text/plain`, `text/markdown`, `application/pdf` |
| `size_bytes` | int NOT NULL | Enforce ≤ 2_097_152 (2MB) |
| `storage_path` | text | Local path or S3 key |
| `extracted_text` | text | Parsed content for prompt injection |
| `created_at` | timestamp | |

**Constraint:** Max 5 rows per `agent_id` (enforced in API).

### `agent_tools`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `type` | enum | `telegram` \| `booking` |
| `enabled` | boolean DEFAULT false | |
| `config` | jsonb | Type-specific; see below |
| `updated_at` | timestamp | |

**Unique constraint:** `(agent_id, type)`

#### Telegram tool config
```json
{ "chatId": "-1001234567890" }
```
Bot token: env `TELEGRAM_BOT_TOKEN` for MVP.

#### Booking tool config
```json
{
  "slotMinutes": 30,
  "advanceDays": 14,
  "bookableServiceIds": ["svc_1", "svc_2"]
}
```

### `availability_slots`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `organization_id` | uuid FK | |
| `agent_id` | uuid FK | |
| `service_id` | text | References `services[].id` in agent JSON |
| `starts_at` | timestamptz NOT NULL | |
| `ends_at` | timestamptz NOT NULL | |
| `is_booked` | boolean DEFAULT false | |
| `created_at` | timestamp | |

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `call_log_id` | uuid FK nullable | |
| `slot_id` | uuid FK | |
| `caller_name` | text | |
| `caller_phone` | text nullable | |
| `service_name` | text | Denormalized for display |
| `status` | enum | `confirmed` \| `cancelled` |
| `created_at` | timestamp | |

### `call_logs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `room_name` | text | LiveKit room |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz nullable | |
| `duration_sec` | int nullable | |
| `language` | enum | `en` \| `am` \| `om` |
| `outcome` | enum | `completed` \| `booked` \| `handoff` \| `abandoned` \| `failed` |
| `summary` | text NOT NULL | **Short summary** max 300 chars for Calls list |
| `transcript` | jsonb nullable | Full transcript; only loaded on detail view |
| `tools_used` | jsonb | `["booking", "handoff"]` |
| `metadata` | jsonb | `{ callerName, bookingId, handoffId }` |
| `created_at` | timestamp | |

#### `transcript` JSON shape (detail view only)
```json
[
  { "role": "agent", "text": "Hello, welcome to Bella Salon...", "at": "2026-07-25T10:00:01Z" },
  { "role": "caller", "text": "What are your hours?", "at": "2026-07-25T10:00:08Z" },
  { "role": "agent", "text": "We are open Monday to Saturday...", "at": "2026-07-25T10:00:12Z" }
]
```

#### `summary` generation rules (Sprint 7)
Generated at call end by LLM or template:
- Max 300 characters
- Format: `"Caller asked about hours. Agent answered. No booking."`
- Or: `"Booked Haircut for Saturday 2pm. Caller: Sarah."`
- Or: `"Handoff: pricing for custom service. Staff notified via Telegram."`

### `handoff_requests`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `call_log_id` | uuid FK | |
| `agent_id` | uuid FK | |
| `reason` | text | Why handoff triggered |
| `summary` | text | Same as call summary snippet |
| `telegram_message_id` | text nullable | |
| `telegram_sent_at` | timestamptz nullable | |
| `created_at` | timestamp | |

---

## Agents menu — setup only (separated from other menus)

**Purpose:** Create and manage agent identity. Does NOT edit voice, files, or tools.

### Agents list page (`/agents`)

**UI elements:**
- Page title: "Your agents"
- Primary button: "+ Create agent"
- Agent cards grid (1 col mobile, 2 col desktop), each card shows:
  - Agent name
  - Status badge: Draft (gray) / Active (green) / Paused (yellow)
  - Primary language flag/label
  - Use case label (Salon, Clinic, etc.)
  - Public URL: `yoursite.com/call/{slug}` (copy button)
  - Actions: Edit setup | Test call | Pause/Activate
- Empty state: illustration + "Create your first receptionist"

**Actions:**
| Action | Behavior |
|--------|----------|
| Create agent | Opens 3-step wizard |
| Edit setup | Opens edit form (same fields as wizard, no voice/files) |
| Test call | Opens modal with LiveKit call UI for this agent |
| Activate | Sets status `active`; validates slug unique + greeting set |
| Pause | Sets status `paused`; public calls show "Agent unavailable" |
| Delete | Confirm dialog; only if no calls in last 24h (or force with confirm) |

### Create agent wizard (`/agents/new`)

**3 steps. Saves as `draft` until user activates.**

#### Step 1 — Identity
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Agent name | text input | 2–60 chars | Yes |
| Description | textarea | max 500 chars | No |
| Use case | radio cards with icons | salon / clinic / restaurant / general | Yes |
| URL slug | text input auto from name | `[a-z0-9-]`, 3–40 chars, unique | Yes |

**Use case templates pre-seed (saved to agent on create, editable later in Knowledge):**

| Use case | Default hours | Default services | Default greeting |
|----------|---------------|------------------|------------------|
| Salon | Mon–Sat 9–7, Sun closed | Haircut 200, Color 500, Manicure 150 | "Hello, thank you for calling {business}. How can I help you today?" |
| Clinic | Mon–Fri 8–6, Sat 9–1 | Consultation 300, Follow-up 150 | "Hello, you've reached {business}. How may I assist you?" |
| Restaurant | Daily 11–10 | Table reservation (free) | "Hello, welcome to {business}. Are you calling to book a table?" |
| General | Mon–Fri 9–5 | General inquiry (free) | "Hello, thank you for calling {business}. How can I help?" |

#### Step 2 — Languages
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Primary language | select | en / am / om | Yes |
| Additional languages | multi-checkbox | Cannot duplicate primary | No |

**Note:** Voice selection happens in **Voice menu**, not here. Wizard only sets language intent.

#### Step 3 — Review & create
- Summary card: name, slug, use case, languages
- Status: saved as **Draft**
- Buttons:
  - "Create agent" → redirect to `/agents` with agent selected
  - "Create & configure voice" → redirect to `/voice`
- No test call in wizard (requires Voice menu greeting first)

**What Agents menu does NOT include:**
- Voice picker (→ Voice menu)
- Hours/services editing (→ Knowledge menu)
- File uploads (→ Files menu)
- Telegram/booking (→ Tools menu)
- Call history (→ Calls menu)

---

## Voice menu (`/voice`)

**Requires:** agent selected in header.

### Sections

#### 1. Languages (read-only summary + link)
- Shows primary + additional languages from agent setup
- Link: "Change languages in Agents → Edit setup"

#### 2. Voice selection
- One voice picker block per configured language
- **English (Sprint 4):** 6 curated Cartesia voices with name + gender tag
  - e.g. "Ashley — warm female", "James — professional male"
- **Amharic/Oromo (Sprint 5):** 8 + 4 curated Addis Voice 2 IDs with Amharic labels
- Each voice row: name, ▶ Preview button (plays 5-sec sample)

#### 3. Greeting
| Field | Type | Max | Required |
|-------|------|-----|----------|
| Greeting message | textarea | 500 chars | Yes |
| Reset to default | button | Regenerates from use case template | — |

#### 4. Tone
| Option | Effect on prompt |
|--------|------------------|
| Friendly | Warm, conversational |
| Professional | Formal, concise |
| Casual | Relaxed, short sentences |

#### 5. Save bar
- Sticky "Save changes" button
- Unsaved changes warning on navigate away

### API
| Endpoint | Method | Body |
|----------|--------|------|
| `voice.get` | tRPC query | `{ agentId }` |
| `voice.update` | tRPC mutation | `{ agentId, voiceConfig, greeting, tone }` |
| `POST /api/voice/preview` | REST | `{ agentId, voiceId, language, text? }` → audio/mpeg |

---

## Knowledge menu (`/knowledge`)

**Requires:** agent selected. Structured business facts only — **no file uploads here**.

### Section 1 — Business info
| Field | Type | Max | Notes |
|-------|------|-----|-------|
| Business name (spoken) | text | 100 | Defaults to org name |
| Phone | text | 20 | Agent can repeat to caller |
| Address / area | text | 200 | "Bole, near Edna Mall" |
| Website | url | — | Agent omits https:// when speaking |

### Section 2 — Business hours
- 7-row grid (Mon–Sun)
- Each row: Closed toggle | Open time | Close time
- "Copy Monday to all weekdays" button
- Validation: close > open when not closed

### Section 3 — Services & prices
- Table columns: Name | Price (ETB) | Duration (min) | Bookable toggle | Delete
- "+ Add service" button
- Min 1 service required before agent can activate
- Max 20 services

### Section 4 — FAQ
- List of Q/A cards
- Each: question input (500 chars), answer input (1000 chars), delete, drag reorder
- Max 20 FAQ pairs
- Empty state: "Add common questions your customers ask"

### Section 5 — About text (paste)
| Field | Type | Max |
|-------|------|-----|
| About the business | textarea | 4000 chars |
| Helper text | — | "This text is added to your agent's knowledge. For longer docs, use the Files menu." |

### Section 6 — Custom instructions
| Field | Type | Max |
|-------|------|-----|
| Special instructions | textarea | 2000 chars |
| Helper | — | "e.g. Always ask for name before booking. Never discuss competitor prices." |

### Section 7 — Prompt preview (read-only)
- Collapsible panel showing generated system prompt
- Updates live as user edits (debounced 500ms)
- Not editable here — edit fields above

### API
| Endpoint | Body |
|----------|------|
| `knowledge.get` | `{ agentId }` |
| `knowledge.updateBusiness` | `{ agentId, businessName, phone, address, website }` |
| `knowledge.updateHours` | `{ agentId, hours }` |
| `knowledge.updateServices` | `{ agentId, services }` |
| `knowledge.updateAbout` | `{ agentId, aboutText, customInstructions }` |
| `faq.list/create/update/delete/reorder` | standard CRUD |

---

## Files menu (`/files`)

**Requires:** agent selected. Upload-only — separate from Knowledge.

### Rules (strict)
| Rule | Value |
|------|-------|
| Max file size | **2 MB** (2,097,152 bytes) |
| Max files per agent | **5** |
| Allowed types | `.txt`, `.md`, `.pdf` |
| MIME allowed | `text/plain`, `text/markdown`, `application/pdf` |
| Total extracted text budget | 6,000 chars across all files (truncate oldest first in prompt) |

### UI
- Page title: "Files for {agent name}"
- Helper: "Upload small documents about your business. Max 2MB per file, 5 files total."
- Upload dropzone (drag & drop + click)
- File list table:

| Column | Content |
|--------|---------|
| Filename | Original name |
| Size | e.g. "245 KB" |
| Uploaded | Relative date |
| Status | Parsed ✓ / Failed ✗ |
| Actions | View extracted text (modal) · Delete |

- Upload errors shown inline:
  - "File too large. Maximum size is 2MB."
  - "Maximum 5 files reached. Delete one to upload more."
  - "Unsupported file type. Use .txt, .md, or .pdf."

### Processing pipeline
1. Upload → validate size/type/count
2. Store file locally (`uploads/{orgId}/{agentId}/{fileId}`)
3. Extract text:
   - `.txt`/`.md` → read UTF-8
   - `.pdf` → `pdf-parse` library
4. Save `extracted_text` to DB
5. On failure: save row with empty text + error flag

### API
| Endpoint | Notes |
|----------|-------|
| `files.list` | `{ agentId }` |
| `files.upload` | multipart, returns file row |
| `files.delete` | `{ fileId }` — also deletes disk file |
| `files.getExtractedText` | `{ fileId }` — for preview modal |

---

## Tools menu (`/tools`)

**Requires:** agent selected.

### Card 1 — Booking
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Enable booking | toggle | off | |
| Slot duration | select | 30 min | Options: 15, 30, 45, 60 |
| Booking window | select | 14 days | How far ahead callers can book |
| Bookable services | multi-select | all bookable services | From Knowledge services list |

**When enabled:**
- "Generate availability slots" button → creates slots from agent hours
- Shows count: "142 slots available next 14 days"
- Regenerate button (clears unbooked future slots)

**Status indicator:**
- ✅ Configured — enabled + at least 1 bookable service + slots exist
- ⚠️ Incomplete — enabled but missing services or slots
- ○ Disabled

### Card 2 — Telegram handoff
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Enable handoff | toggle | off | |
| Staff chat ID | text | — | e.g. `-1001234567890` |
| Helper link | — | — | "How to get your Telegram chat ID" |

**Buttons:**
- "Send test message" → sends: `"✅ Solar AI test: Telegram handoff is working for {agent name}."`
- Shows last test result + timestamp

**Handoff message format (live call):**
```
🔔 Handoff — Bella Salon
Agent: Main Receptionist
Reason: Custom pricing question
Summary: Caller asked about keratin treatment pricing not in menu.
Call: {call_log_id short}
Time: {timestamp}
```

**Status indicator:**
- ✅ Configured — enabled + chat ID set + test succeeded once
- ⚠️ Not tested — chat ID set but no test yet
- ○ Disabled

### API
| Endpoint | Body |
|----------|------|
| `tools.get` | `{ agentId }` |
| `tools.updateBooking` | `{ agentId, enabled, config }` |
| `tools.updateTelegram` | `{ agentId, enabled, config }` |
| `tools.testTelegram` | `{ agentId }` |
| `tools.generateSlots` | `{ agentId }` |

---

## Calls menu (`/calls`)

**Requires:** agent selected (default). Toggle: "Show all agents".

### Calls list — summary only (not full transcript inline)

**Table columns:**

| Column | Example | Notes |
|--------|---------|-------|
| Date & time | Jul 25, 5:32 PM | Local timezone |
| Duration | 2m 14s | — |
| Language | EN / AM | Badge |
| Outcome | Completed / Booked / Handoff / Abandoned | Color-coded badge |
| Summary | "Caller asked about hours. Agent answered." | **Max 300 chars, truncated in table** |
| Actions | View details | Opens drawer |

**Filters:**
- Date range: Today / 7 days / 30 days
- Outcome: All / Booked / Handoff / Completed / Abandoned
- (When "all agents" toggle): filter by agent name

**No audio playback in v1.**

### Call detail drawer (click "View details")

**Header:**
- Agent name, date, duration, outcome badge, language

**Summary block:**
- Full summary text (300 chars max)

**Transcript block (chat-style):**
- Agent messages: left-aligned, muted background
- Caller messages: right-aligned
- Timestamps per message
- Only loaded on drawer open (not in list query)

**Linked records (if applicable):**
- Booking card: service, time, caller name → link to booking
- Handoff card: reason, Telegram sent ✓/✗, timestamp

### API
| Endpoint | Notes |
|----------|-------|
| `calls.list` | `{ agentId?, from, to, outcome?, page, limit }` — returns rows WITHOUT transcript |
| `calls.getById` | `{ callLogId }` — returns full transcript |
| `POST /api/internal/call-log` | Called by voice-agent on shutdown |

---

## Settings menu (`/settings`)

### Tab 1 — Business profile
| Field | Notes |
|-------|-------|
| Business name | Updates org.name; new agents default to this |
| Phone | |
| Website | |
| Address | |
| Timezone | Select, default Africa/Addis_Ababa |

### Tab 2 — Account
| Field | Notes |
|-------|-------|
| Email | Read-only (from auth) |
| Change password | Better-Auth flow |

---

## Public pages (no auth)

### `/call/[slug]`
- Loads agent by slug (must be `active`)
- Shows business name, agent name, call button
- Language selector if agent has additional languages
- LiveKit call UI (same component as test call)
- States: loading / active / paused / not found

### `/embed/[slug]`
- Minimal iframe UI: call button + status only
- No header, no navigation
- Configurable button label + accent color from agent

---

# Sprint-by-sprint build plan

---

## Sprint 1 — Voice pipeline ✅ COMPLETE

### Delivered features
| Feature | Status |
|---------|--------|
| LiveKit Node voice agent | ✅ |
| STT → LLM → TTS (English, LiveKit Inference) | ✅ |
| Hardcoded Bella Salon prompt | ✅ |
| Token API with agent dispatch | ✅ |
| Next.js test call page | ✅ |
| Turn detection + interruptions | ✅ |

---

## Sprint 2 — Auth, org, dashboard shell, Agents menu (1 week)

### Goal
User can sign up, land in dashboard, create draft agents via setup wizard.

### Feature 2.1 — Authentication
| Item | Spec |
|------|------|
| Sign up page | Email + password + confirm password. Min 8 chars. |
| Login page | Email + password. "Forgot password" link (stub OK). |
| Session | Better-Auth cookie session. |
| Redirect | Unauthenticated → `/login`. Authenticated → `/agents`. |
| Logout | Button in Settings + sidebar footer. |

### Feature 2.2 — Auto organization
| Item | Spec |
|------|------|
| Trigger | On first authenticated tRPC call or signup hook. |
| Creates | `organizations` row with `user_id`, `name` = "My Business". |
| Idempotent | Never creates duplicate org for same user. |

### Feature 2.3 — Dashboard shell
| Item | Spec |
|------|------|
| Layout | Sidebar + header + main content. |
| Sidebar items | Agents, Voice, Knowledge, Files, Tools, Calls, Settings. |
| Header | Logo + agent selector dropdown. |
| Agent selector | Lists all agents by name. Persists to localStorage. Disabled if 0 agents. |
| Protected routes | All `/agents`, `/voice`, etc. require auth. |
| Placeholder pages | Voice, Knowledge, Files, Tools, Calls show "Select an agent" or "Coming soon". |

### Feature 2.4 — Agents list page
| Item | Spec |
|------|------|
| Route | `/agents` |
| List | Cards with name, status, use case, language, slug. |
| Create button | → `/agents/new` |
| Empty state | CTA to create first agent. |
| Actions | Edit, Delete (with confirm). Activate/Pause (Sprint 3). |

### Feature 2.5 — Agent setup wizard
| Item | Spec |
|------|------|
| Route | `/agents/new`, `/agents/[id]/edit` |
| Step 1 | Name, description, use case, slug (auto-generate). |
| Step 2 | Primary language, additional languages. |
| Step 3 | Review + create as Draft. |
| Templates | Seed hours/services/greeting from use case on create. |

### Feature 2.6 — Settings page (basic)
| Item | Spec |
|------|------|
| Route | `/settings` |
| Fields | Business name, phone, website, address, timezone. |
| Account | Email display, logout. |

### Schema (Sprint 2)
- `organizations`
- `agents` (all columns except tools/files/call-related)

### API (Sprint 2)
- `organization.get`, `organization.update`
- `agent.list`, `agent.create`, `agent.get`, `agent.update`, `agent.delete`

### Exit criteria
- [ ] Sign up → auto org → empty agents list
- [ ] Create agent wizard → draft agent in list
- [ ] Edit agent setup fields
- [ ] Settings saves org profile
- [ ] Agent selector shows created agents
- [ ] Voice/Knowledge/Files/Tools/Calls show placeholder

### Still hardcoded
- Test call uses Bella Salon voice agent (Sprint 3 fixes)

---

## Sprint 3 — Dynamic voice config + public call URL (1 week)

### Goal
Voice agent reads agent from DB. Public call page works per slug.

### Feature 3.1 — Prompt builder
| Item | Spec |
|------|------|
| File | `packages/api/src/lib/agent-prompt.ts` |
| Inputs | Agent row + org row + FAQs (empty Sprint 3) + files (empty) |
| Output | Plain-text instructions string |
| Templates | Per use_case base prompt + injected hours/services/greeting |
| Voice rules | Always append (no markdown, 1-3 sentences, spell numbers). |

### Feature 3.2 — Token API upgrade
| Item | Spec |
|------|------|
| Input | `{ agentId }` or `{ agentSlug }`, optional `{ language }` |
| Validates | Agent exists, belongs to org (if auth), status = `active` for public |
| Metadata | `{ agentId, language }` on RoomAgentDispatch |
| Error 404 | Agent not found. 403: paused/draft on public call. |

### Feature 3.3 — Internal agent config API
| Item | Spec |
|------|------|
| Route | `GET /api/internal/agent/:id` |
| Auth | Shared secret header `X-Internal-Key` |
| Returns | Full agent config + org + generated prompt + enabled tools (empty Sprint 3) |
| Used by | `apps/voice-agent` on job start |

### Feature 3.4 — Dynamic voice agent
| Item | Spec |
|------|------|
| On job start | Parse metadata → fetch agent config |
| Build | Dynamic instructions from prompt builder |
| Greeting | Use `agent.greeting` in `generateReply` |
| Fallback | If fetch fails, polite error message + end call |

### Feature 3.5 — Agents page upgrades
| Item | Spec |
|------|------|
| Activate | Validates: greeting set, ≥1 service, slug unique |
| Pause | Immediate |
| Test call modal | Passes agentId to token API |
| Copy public URL | `http://localhost:3001/call/{slug}` |

### Feature 3.6 — Public call page
| Item | Spec |
|------|------|
| Route | `/call/[slug]` |
| UI | Reuse call component from test-call |
| States | Active / Paused / Not found |
| Auth | None required |

### Exit criteria
- [ ] Agent with custom hours → call answers correctly
- [ ] Draft agent → public URL returns 403/unavailable
- [ ] Test call from dashboard uses selected agent
- [ ] Bella Salon hardcode removed from voice-agent

---

## Sprint 4 — Voice menu + Knowledge menu + Files menu (1 week)

### Goal
Owner configures voice, structured knowledge, and file uploads via separate main menus.

### Feature 4.1 — Voice menu (full)
All items from Voice menu spec above.
- 6 English Cartesia voices
- Preview API route
- Save voice_config, greeting, tone

### Feature 4.2 — Knowledge menu (full)
All items from Knowledge menu spec above.
- Hours grid, services table, FAQ CRUD
- About text + custom instructions
- Live prompt preview panel

### Feature 4.3 — Files menu (full)
All items from Files menu spec above.
- 2MB limit enforced client + server
- 5 file limit
- PDF/text extraction
- Prompt builder includes file text (6000 char budget)

### Feature 4.4 — FAQ schema + API
- `agent_faqs` table
- CRUD + reorder endpoints

### Feature 4.5 — Voice agent updates
- Load voice_config for English TTS selection
- Include FAQs + file text in prompt

### Exit criteria
- [ ] Change greeting in Voice → next call uses it
- [ ] Edit hours in Knowledge → call reflects change
- [ ] Upload 2MB PDF → agent answers from content
- [ ] Upload 3MB file → rejected with clear error
- [ ] 6th file upload → rejected
- [ ] FAQ answer appears in call responses

---

## Sprint 5 — Addis AI: Amharic & Afan Oromo (1–2 weeks)

### Goal
Local language agents work with Addis voices and models.

### Feature 5.1 — Addis AI env + client
| Item | Spec |
|------|------|
| Env | `ADDIS_AI_API_KEY`, `ADDIS_AI_BASE_URL` |
| Package | `addisai` SDK or fetch wrapper |

### Feature 5.2 — Pipeline router
| Language | STT | LLM | TTS |
|----------|-----|-----|-----|
| en | Deepgram Nova-3 | Gemma 4 | Cartesia Sonic-3 |
| am | Addis Scribe | Addis-Aleph-1 | Addis Voice 2 |
| om | Addis Scribe | Addis-Aleph-1 | Addis Voice 2 |

### Feature 5.3 — Voice menu: Addis voices
- 8 Amharic voices with preview
- 4 Afan Oromo voices with preview
- Voice picker shows only voices matching agent languages

### Feature 5.4 — Public call language selector
- Show if agent has additional languages
- Passes `language` to token API
- Agent responds in selected language for full call

### Feature 5.5 — Prompt language rules
- Append: "Respond in Amharic unless caller switches to English."
- Amharic/om greeting templates in use case seeds

### Exit criteria
- [ ] Amharic agent: full call in Amharic
- [ ] Voice preview works for Addis voices
- [ ] Bilingual agent: language selector on call page works
- [ ] English agent unchanged (regression pass)

---

## Sprint 6 — Tools menu: booking + Telegram (1 week)

### Goal
Agent books appointments and sends Telegram handoffs during live calls.

### Feature 6.1 — Tools menu UI
Full spec from Tools menu section above.

### Feature 6.2 — Availability slot generator
| Item | Spec |
|------|------|
| Input | Agent hours + slotMinutes + advanceDays |
| Output | Rows in `availability_slots` |
| Logic | Skip closed days. Skip past times. 30-min default blocks. |
| Regenerate | Deletes future unbooked slots, recreates. |

### Feature 6.3 — LiveKit function tools
```typescript
check_availability({ date: string, service_name: string })
  → { available: boolean, slots: ["14:00", "14:30"] }

book_appointment({ date, time, service_name, caller_name, caller_phone? })
  → { success: boolean, booking_id, confirmation_message }

handoff_to_human({ reason, caller_summary })
  → { success: boolean, message: "Staff will follow up shortly" }
```

### Feature 6.4 — Telegram integration
| Item | Spec |
|------|------|
| Env | `TELEGRAM_BOT_TOKEN` |
| Test message | From Tools menu |
| Live handoff | On tool call during conversation |
| Failure | Agent tells caller "I couldn't reach staff" but still logs handoff |

### Feature 6.5 — Booking flow in agent prompt
- Instructions: always confirm name before booking
- Confirm date/time verbally
- If slot unavailable, offer alternatives via check_availability

### Exit criteria
- [ ] Enable booking → generate slots → book via call
- [ ] Booking row in DB linked to call
- [ ] Telegram test message received
- [ ] Handoff during call → Telegram within 10 seconds
- [ ] Demo script: FAQ + book + handoff all pass

---

## Sprint 7 — Calls menu, embed widget, demo seed (1 week)

### Goal
Call summaries visible in dashboard. Embeddable widget. Judge-ready demo.

### Feature 7.1 — Call logging pipeline
| Item | Spec |
|------|------|
| Trigger | Voice agent shutdown hook |
| POST | `/api/internal/call-log` |
| Payload | agentId, roomName, startedAt, endedAt, language, transcript[], toolsUsed |
| Summary gen | LLM or rule-based → max 300 chars |
| Outcome | Rule: handoff tool used → `handoff`. Booking tool → `booked`. Else `completed`. Duration < 10s → `abandoned`. |

### Feature 7.2 — Calls menu UI
Full spec from Calls menu section.
- Summary-only table
- Detail drawer with full transcript
- Filters + pagination (20 per page)

### Feature 7.3 — Embed widget
| Item | Spec |
|------|------|
| Route | `/embed/[slug]` |
| UI | Button + call UI only, 400×120 default iframe |
| Config | `widget_button_label`, `widget_accent_color` on Agents edit |
| Copy snippet | On Agents list card |

### Feature 7.4 — Demo seed script
| Item | Spec |
|------|------|
| Command | `pnpm db:seed` |
| Creates | Org "Bella Salon", 2 agents (EN + AM), hours, services, FAQ, slots, tools enabled |
| Demo user | `demo@bellasalon.com` / password in README |

### Feature 7.5 — Polish checklist
- [ ] All empty states designed
- [ ] Mobile call UI works
- [ ] Paused agent message on public page
- [ ] Error boundaries on dashboard
- [ ] Loading skeletons on Calls list

### Exit criteria
- [ ] Every call creates summary row in Calls menu
- [ ] Detail drawer shows transcript
- [ ] Embed iframe works on static HTML page
- [ ] Seed script → full demo in 1 command
- [ ] Hackathon 5-step demo script passes

---

## Sprint timeline

| Sprint | Duration | Deliverable |
|--------|----------|-------------|
| 1 ✅ | Done | Voice pipeline |
| 2 | 5–7 days | Auth + Agents setup menu |
| 3 | 5–7 days | Dynamic agent + public call URL |
| 4 | 5–7 days | Voice + Knowledge + Files menus |
| 5 | 7–10 days | Addis AI languages |
| 6 | 5–7 days | Tools (booking + Telegram) |
| 7 | 5–7 days | Calls summaries + embed + demo |

**Total: ~7 weeks**

---

## Hackathon demo script (validate at Sprint 7)

1. Open `/call/bella-receptionist-en`
2. Ask "What time do you close?" → correct hours
3. Ask "How much is a haircut?" → 200 birr
4. Book appointment Saturday 2pm → confirmed verbally
5. Ask obscure question → handoff message + Telegram ping
6. Show Calls menu → summary row + transcript detail
7. Show embed code on business website mock

---

## Deferred (post Sprint 7)

| Feature | Reason |
|---------|--------|
| Audio recordings | Storage, compliance |
| Billing / Stripe | Not needed for demo |
| Google Calendar | OAuth complexity |
| PSTN / phone number | LiveKit SIP research only |
| Team members | 1 user = 1 org sufficient |
| Per-org Telegram bot token | Shared bot OK for MVP |
| Vector RAG / pgvector | File text injection enough for v1 |

---

## Next step

**Start Sprint 2:** `organizations` + `agents` schema → Better-Auth UI → dashboard shell → Agents wizard.
