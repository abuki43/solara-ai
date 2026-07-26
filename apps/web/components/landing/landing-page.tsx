"use client"

import React, { useRef, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { HERO_REVEAL_MS, IntroAnimation } from "@/components/landing/intro-animation"
import { PixelIcon } from "@/components/landing/pixel-icon"
import { LiveAgentFeed, LiveAgentCounter } from "@/components/landing/live-agent-feed"
import { RevealText } from "@/components/landing/reveal-text"
import { StackingAgentCards } from "@/components/landing/stacking-agent-cards"
import { LandingNav } from "@/components/landing/landing-nav"
import { DevExSection } from "@/components/landing/devex-section"
import { AgentInterface } from "@/components/landing/agent-interface"
import { VoiceDemo } from "@/components/voice/voice-demo"

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function BentoCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.1)
  return (
    <div
      ref={ref}
      className={`group relative rounded-2xl border border-black/[0.07] bg-white overflow-hidden transition-all duration-700 hover:border-black/[0.15] hover:bg-[#fafaf8] ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms, border-color 0.3s ease, background-color 0.3s ease`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0,0,0,0.03), transparent 60%)" }}
      />
      {children}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] tracking-widest text-black/40 bg-black/[0.04]">
      {children}
    </span>
  )
}

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [heroReady, setHeroReady] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const handleIntroDone = useCallback(() => {
    setHeroReady(true)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setVideoReady(true), HERO_REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased">

      <IntroAnimation onDone={handleIntroDone} />

      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/images/solar-hero.jpg"
          aria-hidden="true"
          className="absolute inset-0 z-0 size-full object-cover object-center motion-reduce:hidden"
          style={{
            transform: videoReady ? "scale(1.05)" : "scale(0.88)",
            transition: "transform 2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <source src="/images/solar-hero.mp4" type="video/mp4" />
        </video>
        <Image
          src="/images/solar-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="z-0 object-cover object-center motion-safe:hidden"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-white/20 via-transparent to-white/5" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[72%]"
          style={{
            background:
              "linear-gradient(to top, #F5F4F0 0%, rgba(245,244,240,.96) 18%, rgba(245,244,240,.72) 42%, rgba(245,244,240,.18) 76%, transparent 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[48%]"
          style={{
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            maskImage: "linear-gradient(to top, black 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex min-h-screen flex-col px-6 pb-12 pt-28 md:px-12">
          <div className="mx-auto grid w-full max-w-5xl flex-1 items-end gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-16">
            <div className="pb-2">
              <Tag>AI VOICE RECEPTIONIST</Tag>
              <h1
                className="font-display mt-6 text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
                style={{
                  opacity: heroReady ? 1 : 0,
                  filter: heroReady ? "blur(0px)" : "blur(24px)",
                  transform: heroReady ? "translateY(0px)" : "translateY(32px)",
                  transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0ms, filter 1s cubic-bezier(0.16,1,0.3,1) 0ms, transform 1s cubic-bezier(0.16,1,0.3,1) 0ms",
                }}
              >
                Never miss
                <br />
                a customer
                <br />
                call again.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-black/45"
                style={{
                  opacity: heroReady ? 1 : 0,
                  filter: heroReady ? "blur(0px)" : "blur(16px)",
                  transform: heroReady ? "translateY(0px)" : "translateY(20px)",
                  transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 200ms, filter 0.8s cubic-bezier(0.16,1,0.3,1) 200ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 200ms",
                }}
              >
                Solara AI gives Ethiopian SMBs an AI phone receptionist that answers in local languages,
                knows your business, and works around the clock.
              </p>
              <div className="mt-10 flex flex-wrap gap-3"
                style={{
                  opacity: heroReady ? 1 : 0,
                  filter: heroReady ? "blur(0px)" : "blur(16px)",
                  transform: heroReady ? "translateY(0px)" : "translateY(20px)",
                  transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 300ms, filter 0.8s cubic-bezier(0.16,1,0.3,1) 300ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 300ms",
                }}
              >
                <Link
                  href="/signup"
                  className="rounded-xl bg-[#111] px-8 py-3.5 text-sm tracking-widest text-white transition-colors hover:bg-[#333]"
                >
                  START FREE
                </Link>
                <a
                  href="#demo"
                  className="rounded-xl border border-black/10 px-8 py-3.5 text-sm tracking-widest text-black/60 transition-all hover:border-black/25 hover:bg-black/[0.04] hover:text-black"
                >
                  TRY DEMO
                </a>
              </div>

              <div className="mt-14 flex gap-10">
                {[
                  { value: "24/7", label: "Availability" },
                  { value: "3", label: "Languages" },
                  { value: "<2s", label: "Response" },
                  { value: "99.9%", label: "Uptime" },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      opacity: heroReady ? 1 : 0,
                      filter: heroReady ? "blur(0px)" : "blur(16px)",
                      transform: heroReady ? "translateY(0px)" : "translateY(20px)",
                      transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${450 + i * 80}ms, filter 0.8s cubic-bezier(0.16,1,0.3,1) ${450 + i * 80}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${450 + i * 80}ms`,
                    }}
                  >
                    <div className="font-display text-3xl font-light tracking-tight">{stat.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-black/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div id="demo" className="scroll-mt-28 pb-3 lg:pb-7">
              <VoiceDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM (bento) ─────────────────────────────── */}
      <section id="features" className="py-32 px-6 md:px-12 lg:px-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <PixelIcon type="voice" size={40} />
            <div className="mt-4"><Tag>PLATFORM</Tag></div>
            <RevealText className="mt-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05]">
              {"Built for local\nbusinesses."}
            </RevealText>
          </div>

          <div className="grid grid-cols-12 gap-3" onMouseMove={handleMouse}>
            <BentoCard className="col-span-12 p-8 min-h-[200px] flex flex-col justify-between relative overflow-hidden" delay={0}>
              <Image
                src="/images/solar-arc.png"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 1152px"
                className="object-cover object-[center_72%]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F5F4F0] via-[#F5F4F0]/80 to-transparent" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl border border-black/10 bg-white/60 flex items-center justify-center mb-6" style={{ backdropFilter: "blur(8px)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="m4.93 4.93 2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>
                </div>
                <h3 className="text-xl font-light mb-3">Voice-first reception</h3>
                <p className="text-sm text-black/45 leading-relaxed max-w-sm">
                  Answer calls, book appointments, and handle FAQs in natural conversation — Amharic, Afan Oromo, or English.
                </p>
              </div>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-4 p-8 min-h-[200px]" delay={120}>
              <div className="w-10 h-10 rounded-xl border border-black/10 flex items-center justify-center mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg>
              </div>
              <h3 className="text-lg font-light mb-2">Smart booking</h3>
              <p className="text-sm text-black/45 leading-relaxed">Checks availability and books appointments in real time. No double-booking.</p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-4 p-8 min-h-[200px]" delay={160}>
              <div className="w-10 h-10 rounded-xl border border-black/10 flex items-center justify-center mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="text-lg font-light mb-2">Telegram handoff</h3>
              <p className="text-sm text-black/45 leading-relaxed">When AI can&apos;t help, staff get a transcript and summary on Telegram instantly.</p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-4 p-8 min-h-[200px]" delay={200}>
              <div className="w-10 h-10 rounded-xl border border-black/10 flex items-center justify-center mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3 className="text-lg font-light mb-2">Call summaries</h3>
              <p className="text-sm text-black/45 leading-relaxed">Every conversation logged with short summary. Review what customers asked for.</p>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ── USE CASES (stacking cards) ───────────────────── */}
      <section id="agents" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
            <div>
              <PixelIcon type="languages" size={40} />
              <div className="mt-4"><Tag>USE CASES</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                {"Plug-and-play agents\nready to deploy."}
              </RevealText>
            </div>
            <p className="text-sm text-black/45 leading-relaxed max-w-xs">
              Start with a pre-built agent template or configure your own. Every agent supports English, Amharic, and Afan Oromo.
            </p>
          </div>

          <StackingAgentCards />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="workflow" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06] overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <PixelIcon type="dashboard" size={40} />
            <div className="mt-4"><Tag>WORKFLOW</Tag></div>
            <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
              {"From signup to live\nin four steps."}
            </RevealText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3" onMouseMove={handleMouse}>
            {[
              { n: "01", title: "Sign up",  desc: "Create your account and business profile in under a minute.", delay: 0,   img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/define-5aafAmGBrxZpOqJ3XLHY3n3qzC2I5K.png" },
              { n: "02", title: "Configure", desc: "Set up your agent — use case, languages, hours, and services.", delay: 80,  img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/compose-5RT5VR4f1Y3GoFmovqTKLTG4UXp3g2.png" },
              { n: "03", title: "Test call",    desc: "Call your agent from the dashboard or share the demo link.", delay: 140, img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/test-zm8guZwxJHtwWsJ7XO4B0CF7GzlNK8.png" },
              { n: "04", title: "Go live", desc: "Activate your agent and share the public call URL with customers.", delay: 200, img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/deploy-an8fgHSLzniojkcmRyGGIFQUJF9T5J.png" },
            ].map((step) => (
              <BentoCard key={step.n} className="relative overflow-hidden flex flex-col min-h-[320px]" delay={step.delay}>
                <div className="absolute inset-x-0 top-0 h-56 pointer-events-none">
                  <img
                    src={step.img}
                    alt={step.title}
                    className="w-full h-full object-cover object-top"
                    style={{
                      maskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 80%)",
                      WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 80%)",
                    }}
                  />
                </div>
                <div className="relative z-10 p-7">
                  <span className="font-pixel text-[11px] text-black/20 tracking-widest block">{step.n}</span>
                </div>
                <div className="relative z-10 px-7 pb-7 mt-auto pt-16">
                  <h3 className="text-2xl font-light mb-3">{step.title}</h3>
                  <p className="text-sm text-black/45 leading-relaxed">{step.desc}</p>
                </div>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ─────────────────────────────────── */}
      <section id="integrations" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
            <div>
              <PixelIcon type="embed" size={40} />
              <div className="mt-4"><Tag>INTEGRATIONS</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                {"Embed on any site.\nConnect any tool."}
              </RevealText>
            </div>
            <p className="text-sm text-black/45 leading-relaxed max-w-xs">
              Drop the widget on your website, configure Telegram handoff, and manage everything from one dashboard.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-black/[0.07] flex flex-col md:block md:relative bg-white" onMouseMove={handleMouse}>
            <div className="relative w-full h-[320px] md:h-[480px] shrink-0">
              <Image
                src="/images/solar-integrations.png"
                alt="Iridescent connected shapes representing Solara AI integrations"
                fill
                sizes="(max-width: 768px) 100vw, 1152px"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/15" />
            </div>

            <div className="flex flex-col gap-3 p-4 md:absolute md:bottom-4 md:right-4 md:p-0 md:w-72">
              <div
                className="rounded-xl border border-white/50 p-6"
                style={{
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  background: "rgba(255,255,255,0.60)",
                }}
              >
                <Tag>EMBED</Tag>
                <h3 className="mt-3 text-lg font-light mb-2">Drop-in widget</h3>
                <p className="text-xs text-black/45 leading-relaxed mb-4">Copy one iframe snippet onto any landing page. Works instantly.</p>
                <div className="bg-black/[0.05] rounded-lg border border-black/[0.07] p-3 font-mono text-[11px] text-black/50 leading-relaxed">
                  <span className="text-black/25">{'<iframe'}</span><br />
                  <span className="text-blue-600/70">{"  src"}</span><span className="text-black/35">=</span><span className="text-green-700/70">&quot;.../call/bella-salon&quot;</span><br />
                  <span className="text-black/25">{'></iframe>'}</span>
                </div>
              </div>

              <div
                className="rounded-xl border border-white/50 p-6"
                style={{
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  background: "rgba(255,255,255,0.60)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                  <span className="text-xs text-black/40 tracking-widest">LIVE API</span>
                </div>
                <p className="text-sm text-black/45">REST API for call logs. Telegram notifications on every handoff.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DASHBOARD ──────────────────────────────── */}
      <section className="relative py-32 px-0 overflow-hidden border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="mb-16">
            <PixelIcon type="dashboard" size={40} />
            <div className="mt-4"><Tag>LIVE DASHBOARD</Tag></div>
            <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
              {"See every call\nin real time."}
            </RevealText>
          </div>
        </div>
        <div className="relative">
          <div className="w-full overflow-hidden px-0">
            <div className="max-w-[1060px] mx-auto">
              <AgentInterface />
            </div>
          </div>
        </div>
      </section>

      {/* ── DEVELOPER EXPERIENCE ────────────────────────── */}
      <DevExSection />

      {/* ── MARQUEE CAPABILITIES ────────────────────────── */}
      <section className="py-0 border-t border-black/[0.06] overflow-hidden select-none">
        <div className="flex border-b border-black/[0.06]" style={{ animation: "marqueeLeft 28s linear infinite" }}>
          {[...Array(3)].map((_, rep) => (
            <div key={rep} className="flex shrink-0">
              {["Amharic", "Afan Oromo", "English", "Booking", "Telegram", "FAQ", "Call Logs", "Widget Embed", "Dashboard", "24/7 Support"].map((cap) => (
                <div key={cap} className="flex items-center gap-6 px-10 py-5 border-r border-black/[0.06] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                  <span className="text-sm text-black/45 whitespace-nowrap tracking-wide">{cap}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex" style={{ animation: "marqueeRight 22s linear infinite" }}>
          {[...Array(3)].map((_, rep) => (
            <div key={rep} className="flex shrink-0">
              {["Haircut Booking", "Clinic Hours", "Restaurant Reservations", "Pricing FAQ", "Location Info", "Service Menu", "Staff Transfer", "Voice Call", "SMS Reminder", "Appointment Check"].map((cap) => (
                <div key={cap} className="flex items-center gap-6 px-10 py-5 border-r border-black/[0.06] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/12 shrink-0" />
                  <span className="text-sm text-black/30 whitespace-nowrap tracking-wide">{cap}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE AGENTS ─────────────────────────────────── */}
      <section id="live" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <PixelIcon type="voice" size={40} />
              <div className="mt-4"><Tag>LIVE RIGHT NOW</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05]">
                {"Agents answering\n24 / 7, in 3 languages."}
              </RevealText>
              <p className="mt-6 text-base text-black/40 leading-relaxed max-w-sm">
                At any moment, businesses are handling calls through Solara AI — booking appointments, answering questions, and routing to staff when needed.
              </p>
              <div className="mt-10 flex items-end gap-2">
                <LiveAgentCounter />
                <span className="text-black/30 text-sm mb-1 tracking-wide">calls handled globally</span>
              </div>
            </div>
            <div className="relative">
              <LiveAgentFeed />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 flex flex-col items-center">
            <PixelIcon type="booking" size={40} />
            <div className="mt-4"><Tag>PRICING</Tag></div>
            <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
              {"Pay as your\nbusiness grows."}
            </RevealText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" onMouseMove={handleMouse}>
            {[
              {
                name: "Starter",
                price: "Free",
                sub: "For small businesses",
                features: ["1 agent", "100 calls/mo", "English + Amharic", "Basic booking", "Email support"],
                delay: 0,
              },
              {
                name: "Business",
                price: "$29",
                period: "/mo",
                sub: "For growing teams",
                features: ["3 agents", "1,000 calls/mo", "All 3 languages", "Telegram handoff", "Priority support", "Custom knowledge"],
                highlight: true,
                delay: 80,
              },
              {
                name: "Enterprise",
                price: "Custom",
                sub: "For orgs at scale",
                features: ["Unlimited agents", "Unlimited calls", "All languages", "Dedicated support", "Custom integrations", "SLA guarantees"],
                delay: 140,
              },
            ].map((plan) => (
              <BentoCard
                key={plan.name}
                className={`p-8 flex flex-col ${plan.highlight ? "border-black/20 bg-[#F0EEE8]" : ""}`}
                delay={plan.delay}
              >
                <div className="mb-8">
                  <div className="font-pixel text-[11px] tracking-widest text-black/40 mb-4">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-light">{plan.price}</span>
                    {plan.period && <span className="text-black/40 text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-black/35 tracking-wide">{plan.sub}</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-black/55">
                      <div className="w-1 h-1 rounded-full bg-black/25 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "#" : "/signup"}
                  className={`w-full py-3 rounded-xl text-sm tracking-widest text-center transition-all duration-200 ${
                    plan.highlight
                      ? "bg-[#111] text-white hover:bg-[#333]"
                      : "border border-black/10 text-black/60 hover:border-black/25 hover:text-black hover:bg-black/[0.04]"
                  }`}
                >
                  {plan.name === "Enterprise" ? "CONTACT SALES" : "GET STARTED"}
                </Link>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[620px] items-start overflow-hidden border-t border-black/[0.06] px-6 py-32 md:px-12 lg:px-20">
        <Image
          src="/images/solar-footer.png"
          alt=""
          width={1536}
          height={576}
          sizes="100vw"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full select-none object-cover object-bottom opacity-85"
        />
        {/* Progressive blur and color fade match the sample treatment:
            artwork stays crisp in the middle and dissolves into the page at the bottom. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage: "linear-gradient(to top, transparent 0%, black 55%)",
            WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 55%)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgb(245,244,240) 0%, rgba(245,244,240,0.92) 18%, rgba(245,244,240,0.55) 35%, transparent 55%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05] mb-6">
            Start answering every<br />customer call.
          </h2>
          <p className="text-sm text-black/45 leading-relaxed mb-10">
            Join Ethiopian businesses using Solara AI to handle customer calls in English, Amharic, and Afan Oromo.
          </p>
          {!submitted ? (
            <form
              onSubmit={e => { e.preventDefault(); if (email) setSubmitted(true) }}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-[#111] placeholder:text-black/25 focus:outline-none focus:border-black/25 transition-colors"
              />
              <Link
                href="/signup"
                className="px-8 py-3 bg-[#111] text-white text-sm rounded-xl hover:bg-[#333] transition-colors tracking-widest font-medium text-center"
              >
                GET STARTED
              </Link>
            </form>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-emerald-600/20 bg-emerald-50 text-emerald-700 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {"You're on the list. We'll be in touch."}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="py-10 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <span className="font-pixel text-xs tracking-[0.25em] text-black/50">SOLARA AI</span>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {[
              { label: "Demo",       href: "#demo" },
              { label: "Features",   href: "#features" },
              { label: "Use Cases",  href: "#agents" },
              { label: "Workflow",   href: "#workflow" },
              { label: "Live",       href: "#live" },
              { label: "Pricing",    href: "#pricing" },
            ].map(l => (
              <a key={l.label} href={l.href} className="text-xs text-black/35 hover:text-black/70 transition-colors tracking-widest">{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">Sign in</Link>
            <Link href="/signup" className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">Sign up</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-black/[0.04]">
          <span className="text-xs text-black/20">© 2026 Solara AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
