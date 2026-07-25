"use client"

import { useEffect, useRef, useState } from "react"
import { Phone, PhoneCall, Clock, CalendarCheck, CheckCircle2, MessageSquare, AlertCircle, Users, Mic } from "lucide-react"

const ALL_CALLS = [
  { id: 145, caller: "Sara T.", agent: "bella-reception", status: "booked", duration: "2m 14s", time: "Just now" },
  { id: 144, caller: "Abebe K.", agent: "beteseb-front", status: "handoff", duration: "4m 32s", time: "1m ago" },
  { id: 143, caller: "Hiwot D.", agent: "bella-reception", status: "completed", duration: "1m 08s", time: "2m ago" },
  { id: 142, caller: "Yonas M.", agent: "habesha-host", status: "booked", duration: "3m 45s", time: "5m ago" },
  { id: 141, caller: "Meron G.", agent: "sheba-support", status: "completed", duration: "0m 52s", time: "8m ago" },
  { id: 140, caller: "Tigist A.", agent: "bella-reception", status: "handoff", duration: "5m 12s", time: "12m ago" },
  { id: 139, caller: "Dawit H.", agent: "addis-helper", status: "booked", duration: "2m 38s", time: "18m ago" },
]

const ALL_BOOKINGS = [
  { service: "Haircut", caller: "Sara T.", time: "Sat 2:00 PM", pct: 72 },
  { service: "Consultation", caller: "Abebe K.", time: "Mon 10:30 AM", pct: 45 },
  { service: "Table 4pers", caller: "Yonas M.", time: "Fri 7:00 PM", pct: 88 },
  { service: "Manicure", caller: "Dawit H.", time: "Today 4:00 PM", pct: 31 },
  { service: "Follow-up", caller: "Tigist A.", time: "Wed 9:00 AM", pct: 60 },
]

const ALL_CHAT_LINES: { type: "caller" | "agent" | "booking" | "handoff"; text: string; author?: string }[] = [
  { type: "caller", text: "Hi, I'd like to book a haircut" },
  { type: "agent", text: "Of course! I have Saturday 2pm available." },
  { type: "caller", text: "That works. My name is Sara." },
  { type: "booking", text: "✓ Haircut booked for Sat 2:00 PM", author: "system" },
  { type: "caller", text: "Do you do keratin treatments?" },
  { type: "agent", text: "I'm not sure about that. Let me transfer you." },
  { type: "handoff", text: "→ Handoff to staff: pricing inquiry", author: "system" },
  { type: "agent", text: "A team member will follow up shortly." },
]

const COMMITS = [
  { hash: "a3f8c21", msg: "Amharic STT pipeline tuned for Addis AI", time: "Just now" },
  { hash: "b7d2e09", msg: "Telegram handoff: fixed chat ID parsing", time: "4m ago" },
  { hash: "c9a1f34", msg: "Booking slot generator: skip past times", time: "12m ago" },
  { hash: "d4e6b78", msg: "Prompt builder: truncate file texts at 6k", time: "31m ago" },
]

const ACTIVITY_SEED = Array.from({ length: 35 }, () => ({
  level: Math.random() > 0.4 ? Math.floor(Math.random() * 4) + 1 : 0,
}))

function MiniBarGraph({ seed }: { seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const barsRef   = useRef<number[]>([])

  useEffect(() => {
    const N = 20
    barsRef.current = Array.from({ length: N }, (_, i) =>
      0.2 + 0.8 * Math.abs(Math.sin((i + seed) * 1.3))
    )

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const draw = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width  = W * devicePixelRatio
      canvas.height = H * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.clearRect(0, 0, W, H)

      barsRef.current = barsRef.current.map((v, i) => {
        const target = 0.15 + 0.85 * Math.abs(Math.sin(Date.now() / 3000 + i * 0.8 + seed))
        return v + (target - v) * 0.012
      })

      const bars = barsRef.current
      const gap  = 2
      const bw   = (W - gap * (N - 1)) / N

      bars.forEach((v, i) => {
        const bh = v * H
        const x  = i * (bw + gap)
        const y  = H - bh
        ctx.beginPath()
        ctx.roundRect(x, y, bw, bh, 2)
        ctx.fillStyle = `rgba(17,17,17,${0.12 + v * 0.65})`
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [seed])

  return <canvas ref={canvasRef} style={{ width: "100%", height: 28, display: "block" }} />
}

function LiveSparkline({ seed }: { seed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const ptsRef    = useRef<number[]>([])

  useEffect(() => {
    const N = 24
    ptsRef.current = Array.from({ length: N }, (_, i) =>
      0.1 + 0.7 * Math.abs(Math.sin(i * 0.6 + (seed ?? 0)))
    )

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const draw = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width  = W * devicePixelRatio
      canvas.height = H * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.clearRect(0, 0, W, H)

      const last   = ptsRef.current[ptsRef.current.length - 1] ?? 0
      const target = 0.1 + 0.85 * (0.5 + 0.5 * Math.sin(Date.now() / 2200 + (seed ?? 0)))
      ptsRef.current = [...ptsRef.current.slice(1), last + (target - last) * 0.04]

      const pts = ptsRef.current
      const step = W / (N - 1)

      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, "rgba(17,17,17,0.10)")
      grad.addColorStop(1, "rgba(17,17,17,0)")
      ctx.beginPath()
      ctx.moveTo(0, H)
      pts.forEach((v, i) => ctx.lineTo(i * step, H - v * H * 0.9))
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      ctx.beginPath()
      pts.forEach((v, i) => {
        const x = i * step, y = H - v * H * 0.9
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = "rgba(17,17,17,0.75)"
      ctx.lineWidth   = 1.5
      ctx.lineJoin    = "round"
      ctx.lineCap     = "round"
      ctx.stroke()

      const ex = W
      const ey = H - (pts[pts.length - 1] ?? 0) * H * 0.9
      ctx.beginPath()
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(17,17,17,0.85)"
      ctx.fill()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [seed])

  return <canvas ref={canvasRef} style={{ width: "100%", height: 28, display: "block" }} />
}

function MiniDotGraph({ seed }: { seed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const ptsRef    = useRef<number[]>([])

  useEffect(() => {
    const N = 18
    ptsRef.current = Array.from({ length: N }, (_, i) =>
      0.1 + 0.8 * Math.abs(Math.sin(i * 0.9 + (seed ?? 2)))
    )

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const draw = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width  = W * devicePixelRatio
      canvas.height = H * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.clearRect(0, 0, W, H)

      const last   = ptsRef.current[ptsRef.current.length - 1] ?? 0
      const target = 0.1 + 0.85 * (0.5 + 0.5 * Math.sin(Date.now() / 2800 + (seed ?? 2) * 1.5))
      ptsRef.current = [...ptsRef.current.slice(1), last + (target - last) * 0.03]

      const pts  = ptsRef.current
      const step = W / (N - 1)

      ctx.beginPath()
      pts.forEach((v, i) => {
        const x = i * step, y = H - v * H * 0.88
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = "rgba(17,17,17,0.15)"
      ctx.lineWidth   = 1
      ctx.setLineDash([3, 3])
      ctx.stroke()
      ctx.setLineDash([])

      pts.forEach((v, i) => {
        const x = i * step, y = H - v * H * 0.88
        ctx.beginPath()
        ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(17,17,17,${0.2 + v * 0.65})`
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [seed])

  return <canvas ref={canvasRef} style={{ width: "100%", height: 28, display: "block" }} />
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    booked:   { bg: "rgba(40,167,69,0.1)",  color: "#28a745", icon: <CheckCircle2 style={{ width: 9, height: 9 }} />, label: "Booked" },
    handoff:  { bg: "rgba(201,169,110,0.12)", color: "#b07d30", icon: <AlertCircle style={{ width: 9, height: 9 }} />, label: "Handoff" },
    completed: { bg: "rgba(130,80,255,0.1)",   color: "#8250df", icon: <Phone style={{ width: 9, height: 9 }} />, label: "Completed" },
  }
  const c = cfg[status] ?? { bg: "#eee", color: "#666", icon: null, label: status }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 8, padding: "2px 7px", borderRadius: 99,
      background: c.bg, color: c.color,
      fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase",
      fontWeight: 600,
    }}>
      {c.icon}{c.label}
    </span>
  )
}

function Bar({ pct, color = "rgba(0,0,0,0.75)" }: { pct: number; color?: string }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 600); return () => clearTimeout(t) }, [pct])
  return (
    <div style={{ height: 2, background: "rgba(0,0,0,0.07)", borderRadius: 99, width: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, transition: "width 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  )
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let s: number | null = null
    const f = (ts: number) => {
      if (!s) s = ts
      const p = Math.min((ts - s) / 1100, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) requestAnimationFrame(f)
    }
    requestAnimationFrame(f)
  }, [to])
  return <>{val}{suffix}</>
}

function LiveDot() {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#28a745", opacity: 0.4, animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }} />
      <span style={{ borderRadius: "50%", width: "100%", height: "100%", background: "#28a745" }} />
    </span>
  )
}

function HeatCell({ level, animDelay }: { level: number; animDelay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), animDelay); return () => clearTimeout(t) }, [animDelay])
  const colors = ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.32)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.8)"]
  return (
    <div style={{
      width: 9, height: 9, borderRadius: 2,
      background: colors[level],
      opacity: visible ? 1 : 0,
      transition: `opacity 0.4s ease`,
    }} />
  )
}

function ChatLine({ item, delay }: { item: typeof ALL_CHAT_LINES[0]; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])

  if (!visible) return null

  if (item.type === "booking") {
    return (
      <div style={{ padding: "3px 10px", background: "rgba(40,167,69,0.08)", borderLeft: "2px solid #28a745", margin: "2px 0", animation: "logIn 0.2s ease forwards", opacity: 0 }}>
        <code style={{ fontSize: 9, fontFamily: "monospace", color: "#28a745" }}>{item.text}</code>
      </div>
    )
  }
  if (item.type === "handoff") {
    return (
      <div style={{ padding: "3px 10px", background: "rgba(201,169,110,0.08)", borderLeft: "2px solid #b07d30", margin: "2px 0", animation: "logIn 0.2s ease forwards", opacity: 0 }}>
        <code style={{ fontSize: 9, fontFamily: "monospace", color: "#b07d30" }}>{item.text}</code>
      </div>
    )
  }

  const isAgent = item.type === "agent"
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", padding: "4px 0", animation: "logIn 0.2s ease forwards", opacity: 0, justifyContent: isAgent ? "flex-start" : "flex-end" }}>
      <div style={{
        padding: "4px 8px", borderRadius: 8,
        background: isAgent ? "rgba(0,0,0,0.04)" : "rgba(37,99,235,0.08)",
        maxWidth: "85%",
      }}>
        <span style={{ fontSize: 9, color: isAgent ? "rgba(0,0,0,0.55)" : "rgba(37,99,235,0.7)", fontFamily: "monospace" }}>{item.text}</span>
      </div>
    </div>
  )
}

export function AgentInterface({ revealDelay = 0 }: { revealDelay?: number }) {
  const [revealed, setRevealed]       = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [callCount, setCallCount]     = useState(1847)
  const [cursor, setCursor]           = useState(true)
  const [callOffset, setCallOffset]   = useState(0)
  const [bookingIdx, setBookingIdx]   = useState(0)
  const [bookingPcts, setBookingPcts] = useState([72, 45, 88, 31, 60])
  const [chatIdx, setChatIdx]         = useState(0)
  const [activity, setActivity]       = useState(ACTIVITY_SEED)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), revealDelay)
    return () => clearTimeout(t)
  }, [revealDelay])

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), revealDelay + 300)
    return () => clearTimeout(t)
  }, [revealDelay])

  useEffect(() => {
    const t = setInterval(() => {
      setCallCount(v => v + Math.floor(Math.random() * 8 + 2))
    }, 1600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setCallOffset(v => (v + 1) % (ALL_CALLS.length - 3)), 4000)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setBookingPcts(p => p.map((v, i) => {
        const delta = Math.random() * 4 - 1
        return Math.max(10, Math.min(99, v + (i === bookingIdx ? Math.abs(delta) + 1 : delta * 0.3)))
      }))
    }, 800)
    return () => clearInterval(t)
  }, [mounted, bookingIdx])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => setBookingIdx(v => (v + 1) % ALL_BOOKINGS.length), 2800)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setChatIdx(p => p >= ALL_CHAT_LINES.length ? 0 : p + 1)
    }, 650)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const t = setInterval(() => {
      setActivity(prev => {
        const next = [...prev]
        const idx = Math.floor(Math.random() * next.length)
        next[idx] = { level: Math.min(4, (next[idx]?.level ?? 0) + 1) }
        return next
      })
    }, 700)
    return () => clearInterval(t)
  }, [mounted])

  useEffect(() => { const t = setInterval(() => setCursor(c => !c), 530); return () => clearInterval(t) }, [])

  const anim = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  })

  const panel: React.CSSProperties = { background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }
  const visibleCalls = ALL_CALLS.slice(callOffset, callOffset + 4)

  return (
    <div className="relative z-10 flex items-center justify-center pointer-events-none select-none px-3 md:px-8 w-full">
      <div style={{
        width: "100%", maxWidth: 900,
        background: "rgba(246,245,242,0.96)",
        border: "1px solid rgba(0,0,0,0.1)",
        backdropFilter: "blur(32px)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 28px 70px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.95) inset",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(72px)",
        transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "9px 14px",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          background: "rgba(255,255,255,0.65)",
          position: "relative",
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#ff5f56","#ffbd2e","#27c93f"].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
            ))}
          </div>
          <span style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            fontSize: 10, letterSpacing: "0.18em", color: "rgba(0,0,0,0.28)", fontFamily: "monospace",
          }}>solar-ai / dashboard — production</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <LiveDot />
            <span style={{ fontSize: 8, color: "rgba(40,167,69,0.8)", letterSpacing: "0.16em", fontFamily: "monospace" }}>ALL AGENTS ACTIVE</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(251,250,247,0.9)" }}>
          {[
            { label: "Calls Today",    val: 142,      icon: <Phone style={{ width: 11, height: 11 }} />,      graph: <MiniBarGraph seed={0} /> },
            { label: "Bookings",       val: 38,       icon: <CalendarCheck style={{ width: 11, height: 11 }} />,  graph: <MiniBarGraph seed={5} /> },
            { label: "Handoffs",       val: 12,       icon: <Users style={{ width: 11, height: 11 }} />,        graph: <MiniDotGraph seed={2} /> },
            { label: "Active Calls",   val: callCount, icon: <Mic style={{ width: 11, height: 11 }} />,          graph: <LiveSparkline seed={7} /> },
          ].map((m, i) => (
            <div key={i} style={{ padding: "9px 12px", height: 82, overflow: "hidden", borderRight: i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none", ...anim(60 + i * 45) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <span style={{ color: "rgba(0,0,0,0.32)" }}>{m.icon}</span>
                <span style={{ fontSize: 7.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.32)", fontFamily: "monospace" }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111", lineHeight: 1, marginBottom: 5, fontFamily: "monospace" }}>
                {mounted ? <Counter to={m.val} /> : "—"}
              </div>
              {mounted && m.graph}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 0.85fr", gap: 8, padding: 8, height: 340, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, height: "100%", overflow: "hidden", ...anim(160) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <PhoneCall style={{ width: 10, height: 10, color: "rgba(0,0,0,0.38)" }} />
                <span style={{ fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", fontFamily: "monospace" }}>Recent Calls</span>
              </div>
              <span style={{ fontSize: 7.5, color: "rgba(0,0,0,0.25)", fontFamily: "monospace" }}>{ALL_CALLS.filter(p => p.status === "booked").length} BOOKINGS</span>
            </div>

            <div style={{ position: "relative", overflow: "hidden", flex: 1 }}>
              {visibleCalls.map((call, i) => (
                <div key={`${call.id}-${callOffset}`} style={{
                  ...panel, padding: "8px 10px", marginBottom: 5,
                  animation: i === 0 ? "prSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 5, marginBottom: 5 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: "#111", lineHeight: 1.3, marginBottom: 2 }}>{call.caller}</div>
                      <div style={{ fontSize: 7.5, fontFamily: "monospace", color: "rgba(0,0,0,0.32)" }}>{call.agent} · {call.duration}</div>
                    </div>
                    <StatusBadge status={call.status} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...panel, padding: "8px 10px", flexShrink: 0, height: 76, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <Clock style={{ width: 9, height: 9, color: "rgba(0,0,0,0.33)" }} />
                <span style={{ fontSize: 7.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.33)", fontFamily: "monospace" }}>Call Activity</span>
              </div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", maxWidth: 210, height: 30, overflow: "hidden" }}>
                {activity.map((a, i) => <HeatCell key={i} level={a.level} animDelay={i * 18 + 300} />)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                <span style={{ fontSize: 7, color: "rgba(0,0,0,0.26)", fontFamily: "monospace" }}>Less</span>
                {[0,1,2,3,4].map(l => (
                  <div key={l} style={{ width: 7, height: 7, borderRadius: 1.5, background: ["rgba(0,0,0,0.05)","rgba(0,0,0,0.15)","rgba(0,0,0,0.32)","rgba(0,0,0,0.55)","rgba(0,0,0,0.8)"][l] }} />
                ))}
                <span style={{ fontSize: 7, color: "rgba(0,0,0,0.26)", fontFamily: "monospace" }}>More</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, height: "100%", overflow: "hidden", ...anim(210) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 2px", flexShrink: 0 }}>
              <MessageSquare style={{ width: 10, height: 10, color: "rgba(0,0,0,0.38)" }} />
              <span style={{ fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", fontFamily: "monospace" }}>Live Transcript — #{(ALL_CALLS[bookingIdx % ALL_CALLS.length]!)?.id}</span>
            </div>
            <div style={{ ...panel, flex: 1, padding: "9px 10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 7, paddingBottom: 7, borderBottom: "1px solid rgba(0,0,0,0.05)", flexShrink: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: "#111", marginBottom: 2 }}>Incoming call — Bella Salon</div>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ fontSize: 7.5, color: "#28a745", fontFamily: "monospace" }}>Caller: Sara T.</span>
                  <span style={{ fontSize: 7.5, color: "rgba(0,0,0,0.28)" }}>+251 91X XXX XXX</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 9, flexShrink: 0 }}>
                {ALL_BOOKINGS.map((b, i) => (
                  <div key={b.service} style={{ opacity: i === bookingIdx ? 1 : 0.55, transition: "opacity 0.4s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 7.5, fontFamily: "monospace", color: i === bookingIdx ? "#111" : "rgba(0,0,0,0.42)", transition: "color 0.4s ease" }}>{b.service}</span>
                      <span style={{ fontSize: 7.5, fontFamily: "monospace", color: (bookingPcts[i] ?? 0) > 70 ? "#28a745" : "#d73a49", transition: "color 0.4s ease", fontWeight: i === bookingIdx ? 700 : 400 }}>{Math.round(bookingPcts[i] ?? 0)}%</span>
                    </div>
                    <Bar pct={bookingPcts[i] ?? 0} color={i === bookingIdx ? "#111" : "rgba(0,0,0,0.3)"} />
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 7, flex: 1, overflow: "hidden" }}>
                {ALL_CHAT_LINES.slice(0, chatIdx).slice(-5).map((item, i) => (
                  <ChatLine key={`${chatIdx}-${i}`} item={item} delay={0} />
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                  <Mic style={{ width: 7, height: 7, color: "rgba(0,0,0,0.18)" }} />
                  <span style={{ display: "inline-block", width: 4, height: 9, background: cursor ? "rgba(0,0,0,0.38)" : "transparent", transition: "background 0.08s" }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, height: "100%", overflow: "hidden", ...anim(260) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 2px", flexShrink: 0 }}>
              <Clock style={{ width: 10, height: 10, color: "rgba(0,0,0,0.38)" }} />
              <span style={{ fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", fontFamily: "monospace" }}>Recent Activity</span>
            </div>
            <div style={{ ...panel, flexShrink: 0, overflow: "hidden" }}>
              {COMMITS.slice(0, 4).map((c, i) => (
                <div key={c.hash} style={{
                  padding: "7px 10px",
                  borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  animation: mounted ? `fadeSlide 0.3s ease ${280 + i * 55}ms both` : "none",
                }}>
                  <div style={{ fontSize: 8.5, fontWeight: 500, color: "#111", lineHeight: 1.35, marginBottom: 2 }}>{c.msg}</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 7.5, fontFamily: "monospace", color: "#2563eb" }}>{c.hash}</span>
                    <span style={{ fontSize: 7.5, color: "rgba(0,0,0,0.28)", fontFamily: "monospace" }}>{c.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 2px 0", flexShrink: 0 }}>
              <Phone style={{ width: 10, height: 10, color: "rgba(0,0,0,0.38)" }} />
              <span style={{ fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.38)", fontFamily: "monospace" }}>Agent Status</span>
            </div>
            <div style={{ ...panel, flexShrink: 0, overflow: "hidden" }}>
              {[
                { name: "bella-reception",  status: "active",  duration: "2m 14s" },
                { name: "beteseb-front",    status: "active",  duration: "4m 32s" },
                { name: "habesha-host",     status: "idle",    duration: "0m 48s" },
                { name: "addis-helper",     status: "active",  duration: "1m 05s" },
              ].map((a, i) => (
                <div key={a.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px",
                  borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.04)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {a.status === "active"
                      ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "statusPulse 2s ease-in-out infinite", flexShrink: 0 }} />
                      : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(0,0,0,0.15)", flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 8.5, fontFamily: "monospace", color: "#111" }}>{a.name}</span>
                  </div>
                  <span style={{ fontSize: 7.5, color: "rgba(0,0,0,0.28)", fontFamily: "monospace" }}>{a.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes logIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes prSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
