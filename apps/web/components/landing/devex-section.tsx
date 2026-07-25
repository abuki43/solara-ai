"use client"

import { useState, useEffect } from "react"

const STEPS: {
  num: string
  title: string
  desc: string
  file: string
  lang: string
  code: CodeLineItem[]
}[] = [
  {
    num: "01",
    title: "Install Widget",
    desc: "One line to embed",
    file: "embed.html",
    lang: "html",
    code: [
      { type: "comment", text: "<!-- Embed Solar AI on any website -->" },
      { type: "plain", text: '<iframe' },
      { type: "prop", key: "  src", val: "'https://solar-ai.app/call/bella-salon'" },
      { type: "prop", key: "  width", val: "'400'" },
      { type: "prop", key: "  height", val: "'600'" },
      { type: "plain", text: '  style="border: none; border-radius: 16px;"' },
      { type: "plain", text: "></iframe>" },
    ],
  },
  {
    num: "02",
    title: "Configure Agent",
    desc: "Set up in dashboard",
    file: "agent-config.ts",
    lang: "typescript",
    code: [
      { type: "comment", text: "// apps/web/app/agents/new" },
      { type: "keyword", text: "const", after: " agent ", keyword2: "=", keyword3: " await ", fn: "createAgent", args: "({" },
      { type: "prop", key: "  name", val: "'Bella Receptionist'" },
      { type: "prop", key: "  useCase", val: "'salon'" },
      { type: "prop", key: "  primaryLanguage", val: "'am'" },
      { type: "plain", text: "})" },
    ],
  },
  {
    num: "03",
    title: "Add Knowledge",
    desc: "Teach your agent",
    file: "knowledge.ts",
    lang: "typescript",
    code: [
      { type: "comment", text: "// Add business context" },
      { type: "keyword", text: "await", after: " ", keyword2: "api", keyword3: ".", fn: "knowledge", args: ".updateHours({" },
      { type: "prop", key: "  mon", val: "{ open: '09:00', close: '19:00' }" },
      { type: "prop", key: "  tue", val: "{ open: '09:00', close: '19:00' }" },
      { type: "prop", key: "  sat", val: "{ open: '09:00', close: '19:00' }" },
      { type: "plain", text: "})" },
    ],
  },
  {
    num: "04",
    title: "Go Live",
    desc: "Activate & share URL",
    file: "terminal",
    lang: "bash",
    code: [
      { type: "comment", text: "# Agent is live at:" },
      { type: "url", text: "  → https://solar-ai.app/call/bella-salon" },
      { type: "gap" },
      { type: "comment", text: "# Embed on your website:" },
      { type: "command", text: '<iframe src="https://solar-ai.app/call/..." />' },
    ],
  },
]

type CodeLineItem =
  | { type: "comment"; text: string }
  | { type: "plain"; text: string }
  | { type: "prop"; key: string; val: string }
  | { type: "keyword"; text: string; after: string; keyword2?: string; keyword3?: string; fn?: string; args?: string; string?: string }
  | { type: "gap" }
  | { type: "url"; text: string }
  | { type: "command"; text: string }
  | { type: "output"; text: string }
  | { type: "success"; text: string }

function CodeLine({ line }: { line: CodeLineItem }) {
  if (line.type === "gap") return <div className="h-3" />
  if (line.type === "comment") return <div className="text-[#9ca3af]">{line.text}</div>
  if (line.type === "output") return <div className="text-[#6b7280]">{line.text}</div>
  if (line.type === "success") return <div className="text-[#16a34a]">{line.text}</div>
  if (line.type === "url") return <div className="text-[#2563eb] underline">{line.text}</div>
  if (line.type === "command") return (
    <div>
      <span className="text-[#16a34a]">$ </span>
      <span className="text-[#111]">{line.text}</span>
    </div>
  )
  if (line.type === "plain") return <div className="text-[#111]">{line.text}</div>
  if (line.type === "prop") return (
    <div>
      <span className="text-[#2563eb]">{line.key}</span>
      <span className="text-[#111]">: </span>
      <span className="text-[#16a34a]">{line.val}</span>
      <span className="text-[#111]">,</span>
    </div>
  )
  if (line.type === "keyword") return (
    <div>
      <span className="text-[#7c3aed]">{line.text}</span>
      <span className="text-[#111]">{line.after}</span>
      <span className="text-[#7c3aed]">{line.keyword2}</span>
      {line.keyword3 && <span className="text-[#7c3aed]">{line.keyword3}</span>}
      {line.fn && <span className="text-[#b45309]">{line.fn}</span>}
      {line.args && <span className="text-[#111]">{line.args}</span>}
      {line.string && <span className="text-[#16a34a]">{line.string}</span>}
    </div>
  )
  return null
}

export function DevExSection() {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(true)

  function selectStep(i: number) {
    if (i === active) return
    setVisible(false)
    setTimeout(() => {
      setActive(i)
      setVisible(true)
    }, 180)
  }

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActive(prev => (prev + 1) % STEPS.length)
        setVisible(true)
      }, 180)
    }, 3200)
    return () => clearInterval(t)
  }, [])

  const step = STEPS[active]!

  return (
    <section id="devex" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.05] border border-black/[0.06] text-[10px] tracking-widest text-black/40 uppercase">
            Developer Experience
          </div>
          <h2 className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
            Embed anywhere.<br />Configure in minutes.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <button
                key={s.num}
                onClick={() => selectStep(i)}
                className="flex-1 text-left rounded-2xl border transition-all duration-200 p-6 group"
                style={{
                  background: active === i ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.7)",
                  borderColor: active === i ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)",
                  boxShadow: active === i
                    ? "0 1px 3px rgba(0,0,0,0.06)"
                    : "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex gap-4 items-start">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-light shrink-0 transition-colors duration-200"
                    style={{
                      background: active === i ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)",
                      color: active === i ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)",
                    }}
                  >
                    {s.num}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-light transition-colors duration-200"
                      style={{ color: active === i ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)" }}
                    >
                      {s.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(0,0,0,0.28)" }}>{s.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div
            className="lg:col-span-2 rounded-2xl border border-black/[0.06] p-8 flex flex-col"
            style={{
              background: "rgba(255,255,255,0.7)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              minHeight: "360px",
            }}
          >
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div
                className="text-[10px] tracking-widest uppercase transition-all duration-200"
                style={{
                  opacity: visible ? 1 : 0,
                  filter: visible ? "blur(0px)" : "blur(4px)",
                  transition: "opacity 200ms ease, filter 200ms ease",
                  color: "rgba(0,0,0,0.3)",
                }}
              >
                {step.file}
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(d => (
                  <div
                    key={d}
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: d === active % 3 ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.08)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-xl p-6 overflow-hidden" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div
                className="font-mono text-[12px] leading-6"
                style={{
                  opacity: visible ? 1 : 0,
                  filter: visible ? "blur(0px)" : "blur(6px)",
                  transform: visible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 220ms cubic-bezier(0.16,1,0.3,1), filter 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                {step.code.map((line, i) => (
                  <CodeLine key={i} line={line} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
