# AI Voice Receptionist — Hackathon Plan

## One-liner

An English AI web-call receptionist for Ethiopian salons that answers verified business questions in a browser. PSTN phone numbers, booking, Telegram handoff, and local languages are explicit follow-on milestones.

## Core value proposition

Small businesses miss customer inquiries during peak hours or after hours. The first release gives salons a shareable browser-call link that answers routine questions without pretending to replace a real Ethiopian phone line or a trained employee.

---

## Feature scope

### Must-have (Sprints 2–3)

1. **Business auth** — already the scafold have better auth
2. **Inbound call handling (demo via web widget)** — big "Call" button on a demo page, WebRTC mic access, streams to the voice agent.
3. **Verified business answers** — greeting, hours, services, prices, address, and safe unknown-answer fallback.
4. **Dynamic agent routing** — every call loads the selected database-backed receptionist rather than a hardcoded demo.
5. **Activation controls** — draft and paused agents cannot receive public calls.
6. **STT/TTS/LLM pipeline** — English first, with a short polite failure mode when configuration is unavailable.
7. **Safety and cost controls** — AI disclosure, prompt-injection tests, short-lived call tokens, and public-call rate limiting.
8. **Shareable web call page** — a deployment-safe URL per active agent, ready to become an iframe widget later.

### Immediate commercial milestone after Sprint 3

- One real salon booking flow for one seeded service.
- Telegram handoff for requests the AI cannot resolve.
- Per-call latency and cost tracking.

### Stretch (only if the commercial milestone is reliable)

- Calendar sync (Google Calendar/Calendly) instead of internal booking store.
- Privacy-reviewed call transcript + call log view in the dashboard.
- SMS/email booking confirmation.

### if we have more time

- Real PSTN/Ethio Telecom phone integration after vendor, pricing, reliability, and regulatory validation.
- Amharic and Afan Oromo only after the Addis AI pipeline passes a fixed latency and answer-quality evaluation.

---

## Tech stack


| Layer                                                       | Choice                                                             | Notes                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Voice pipeline (STT → LLM → TTS orchestration, turn-taking) | **Pipecat(Python-based) or livekit simialr one **                  | ; runs as its own service handling the live voice session     |
| Local language STT/TTS/LLM                                  | **Addis AI (planned)**                                             | Do not advertise until measured for latency and quality       |
| Demo call interface                                         | Web page with WebRTC, embeddable as an iframe                      | Doubles as both the demo mechanism and a real product feature |
| Business dashboard + API                                    | **Next.js** (frontend) + **Node.js or fastapi or other** (backend) | Auth, business profile, bookings, call logs                   |
| Handoff notifications                                       | Telegram Bot API                                                   | Sends staff a message with the caller's request/transcript    |
| Data storage                                                | Simple DB (Postgres/Mongo whichever we want)                       | Business profile, FAQs, bookings, call logs                   |


---

## Demo flow

1. Judge opens the demo landing page for a seeded business (e.g. a salon).
2. Taps the "Call" button — WebRTC call starts, AI answers in the business's voice.
3. Judge asks "what time do you close?" or "how much is a haircut?" — AI answers from the saved business profile.
4. Judge asks an unknown question — AI does not invent an answer and offers to record a follow-up request.
5. Owner pauses the receptionist — the public link clearly refuses a new call.

The booking + Telegram handoff demo is added immediately after this core flow is reliable.

---

## What makes this different from existing tools

The initial wedge is narrow: Ethiopian salons that need a quick browser-based way to answer repetitive service, price, location, and opening-hour questions. Near-term differentiation comes from a simple setup, a salon-specific workflow, and Telegram-native handoff. Local-language quality and PSTN access become defensible only after they are proven rather than promised.

---

## Safety and positioning

- Every greeting discloses that the caller is speaking with an AI assistant.
- The system never claims a booking is confirmed without a booking tool result.
- Clinic templates are administrative only: no diagnosis, medication advice, symptom interpretation, or emergency triage.
- Call metadata may be retained for debugging and abuse monitoring; recording and transcript retention require a separate privacy decision.
- Public calling is rate-limited and active-only to reduce abuse and unexpected inference cost.

## Measurable validation gates

Sprint 3 is complete only when:

1. A new owner reaches a working first browser call within five minutes of signup.
2. A fixed salon evaluation set answers hours, one price, address, and closed-day questions correctly, refuses unknown facts, and resists an instruction-override attempt.
3. Draft and paused public links cannot create a LiveKit call.
4. First-response latency and estimated STT/LLM/TTS cost are captured for each validation call.
5. All customer-facing URLs use the configured deployment origin rather than localhost.