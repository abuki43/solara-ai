"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

const AGENTS = [
  {
    label: "SALON",
    title: "Bella Salon",
    desc: "Handles appointment bookings, service pricing, and business hours questions. Knows every stylist's specialty and availability.",
    stats: [{ v: "200+", l: "calls/mo" }, { v: "98%", l: "resolution" }],
    img: "/images/agent-salon.png",
  },
  {
    label: "CLINIC",
    title: "Beteseb Clinic",
    desc: "Manages patient inquiries, appointment scheduling, prescription refills, and after-hours triage with care.",
    stats: [{ v: "150+", l: "calls/mo" }, { v: "96%", l: "resolution" }],
    img: "/images/agent-clinic.png",
  },
  {
    label: "RESTAURANT",
    title: "Habesha Bite",
    desc: "Takes reservations, answers menu questions, handles dietary requests, and manages waitlist during peak hours.",
    stats: [{ v: "300+", l: "calls/mo" }, { v: "94%", l: "resolution" }],
    img: "/images/agent-restaurant.png",
  },
  {
    label: "HOSPITALITY",
    title: "Addis Guest House",
    desc: "Answers room and amenity questions, records reservation requests, and guides guests in their preferred language.",
    stats: [{ v: "24/7", l: "coverage" }, { v: "3", l: "languages" }],
    img: "/images/agent-services.png",
  },
  {
    label: "CUSTOM",
    title: "Your Business",
    desc: "Configure hours, services, FAQs, and custom instructions for any business. Start with a template, then make it yours.",
    stats: [{ v: "<10m", l: "setup time" }, { v: "100%", l: "customizable" }],
    img: "/images/agent-custom.png",
  },
]

const STICKY_TOP   = 80
const STICKY_STEP  = 16
const SCALE_STEP   = 0.04
const OFFSET_STEP  = 8

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/[0.04] px-3 py-1 text-[11px] tracking-widest text-black/40">
      {children}
    </span>
  )
}

export function StackingAgentCards() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [depth, setDepth] = useState<number[]>(AGENTS.map(() => 0))

  useEffect(() => {
    let frame = 0

    function onScroll() {
      if (frame) return

      frame = window.requestAnimationFrame(() => {
        const nextDepth = AGENTS.map((_, i) => {
          let count = 0
          for (let j = i + 1; j < AGENTS.length; j++) {
            const el = cardRefs.current[j]
            if (!el) continue
            const rect = el.getBoundingClientRect()
            const stickyTopJ = STICKY_TOP + j * STICKY_STEP
            if (rect.top <= stickyTopJ + 2) count++
          }
          return count
        })
        setDepth(nextDepth)
        frame = 0
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="flex flex-col" style={{ perspective: "1400px", perspectiveOrigin: "50% 0%" }}>
      {AGENTS.map((agent, i) => {
        const d         = depth[i] ?? 0
        const scale     = 1 - d * SCALE_STEP
        const translateY = d * OFFSET_STEP

        return (
          <div
            key={agent.label}
            ref={el => { cardRefs.current[i] = el }}
            className="sticky mb-4"
            style={{ top: `${STICKY_TOP + i * STICKY_STEP}px`, zIndex: 10 + i }}
          >
            <div
              style={{
                transform:      `scale(${scale}) translateY(${translateY}px)`,
                transformOrigin: "top center",
                transition:     "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
                willChange:     "transform",
              }}
            >
              <div className="group relative min-h-[340px] cursor-pointer overflow-hidden rounded-2xl border border-black/[0.07] bg-[#faf9f7] shadow-[0_18px_60px_rgba(49,46,70,0.06)] transition-shadow duration-500 hover:shadow-[0_24px_70px_rgba(49,46,70,0.12)]">
                <div className="relative h-56 w-full overflow-hidden pointer-events-none md:hidden">
                  <Image
                    src={agent.img}
                    alt={`${agent.title} AI receptionist artwork`}
                    fill
                    sizes="100vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      maskImage: "linear-gradient(to bottom, black 0%, black 42%, transparent 92%)",
                      WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 42%, transparent 92%)",
                    }}
                  />
                </div>

                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] overflow-hidden md:block">
                  <Image
                    src={agent.img}
                    alt={`${agent.title} AI receptionist artwork`}
                    fill
                    sizes="(max-width: 1200px) 50vw, 680px"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to right, #faf9f7 0%, rgba(250,249,247,.95) 12%, rgba(250,249,247,.48) 43%, transparent 72%)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f7]/40 via-transparent to-white/10" />
                </div>

                <div className="relative z-10 p-7 md:p-10">
                  <div className="md:max-w-[54%]">
                    <div className="flex items-start justify-between mb-6">
                      <Tag>{agent.label}</Tag>
                      <span className="font-pixel text-[10px] tracking-[0.2em] text-black/20 md:hidden">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-light tracking-tight mb-3">{agent.title}</h3>
                    <p className="text-sm text-black/45 leading-relaxed mb-8">{agent.desc}</p>
                  </div>
                  <div className="flex gap-10 pt-6 border-t border-black/[0.06] md:max-w-[54%]">
                    {agent.stats.map(s => (
                      <div key={s.l}>
                        <div className="font-display text-2xl font-light">{s.v}</div>
                        <div className="text-[10px] uppercase text-black/35 tracking-widest mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <span className="absolute right-8 top-8 hidden font-pixel text-[10px] tracking-[0.2em] text-black/20 md:block">
                    0{i + 1}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
