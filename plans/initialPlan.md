AI Voice Receptionist — Hackathon() Plan
One-liner
An AI phone receptionist for medium local businesses (salons, clinics, restaurants, etc.) that answers calls automatically, handles FAQs, books appointments, hands off to a human when it can't help, and speaks local languages — embeddable directly on the business's own website.
Core value proposition
Small businesses miss calls during peak hours or after hours. This gives them a 24/7 front desk that can answer questions and book appointments without hiring extra staff.
Feature scope
Must-have (build tonight)
Business auth — simple login for a business owner (JWT-based is enough).
Inbound call handling (demo via web widget) — big "Call" button on a demo page, WebRTC mic access, streams to the voice agent.
FAQ handling — business profile (hours, services, prices, common questions) that the agent draws answers from.
Booking — agent checks availability and books a real appointment slot for one seeded service.
Human handoff — when the AI can't resolve something: log the request, notify staff via Telegram with a transcript summary, tell the caller "someone will follow up shortly."
STT/TTS/LLM - build the pipeline
Local language support — Amharic (and Afan Oromo if time allows) via Addis AI's.
Embeddable widget — the same call widget as an iframe snippet, so it can be dropped onto any business's landing page.
Stretch (only if core is done early)
Calendar sync (Google Calendar/Calendly) instead of internal booking store.
Call transcript + call log view in the dashboard.
SMS/email booking confirmation.
if we have more time
Real PSTN/Ethio Telecom phone number integration ... find way to integrate to real phone
Tech stack
Layer	Choice	Notes
Voice pipeline (STT → LLM → TTS orchestration, turn-taking)	**Pipecat(Python-based) or simialr one **	; runs as its own service handling the live voice session
Local language STT/TTS/LLM	Addis AI	Amharic + Afan Oromo, OpenAI-compatible API, pay-as-you-go
Demo call interface	Web page with WebRTC, embeddable as an iframe	Doubles as both the demo mechanism and a real product feature
Business dashboard + API	Next.js (frontend) + Node.js or fastapi or other (backend)	Auth, business profile, bookings, call logs
Handoff notifications	Telegram Bot API	Sends staff a message with the caller's request/transcript
Data storage	Simple DB (Postgres/Mongo  whichever we want)	Business profile, FAQs, bookings, call logs
Demo flow
Judge opens the demo landing page for a seeded business (e.g. a salon).
Taps the "Call" button — WebRTC call starts, AI answers in the business's voice.
Judge asks an FAQ ("what time do you close?") — AI answers from the business profile.
Judge books an appointment — AI checks availability and confirms a slot.
Judge asks something out of scope — AI logs it, tells the caller someone will follow up, and a Telegram message lands on the "staff" phone showing the handoff in real time.
What makes this different from existing tools
Most AI voice agent products are English-first and priced/targeted at larger markets. This is scoped specifically for Ethiopian businesses: local language support, Telegram-native handoff (matches how many local businesses already operate)