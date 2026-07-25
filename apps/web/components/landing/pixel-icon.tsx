"use client"

import { useEffect, useRef } from "react"

type IconType = "voice" | "booking" | "languages" | "dashboard" | "embed"

interface PixelIconProps {
  type: IconType
  size?: number
}

function drawVoice(ctx: CanvasRenderingContext2D, W: number, t: number) {
  const ps = W / 12
  const cx = W / 2
  const cy = W / 2

  const pulse = 0.5 + 0.5 * Math.sin(t * 0.003)

  // Mic body
  const micW = ps * 2
  const micH = ps * 4
  ctx.fillStyle = `rgba(0,0,0,${0.3 + 0.5 * pulse})`
  ctx.fillRect(cx - micW / 2, cy - micH / 2, micW, micH)

  // Mic base
  ctx.fillRect(cx - ps * 0.5, cy + micH / 2, ps, ps * 1.5)

  // Sound waves - left
  for (let i = 1; i <= 3; i++) {
    const opacity = 0.1 + 0.3 * Math.sin(t * 0.002 + i * 0.8)
    ctx.fillStyle = `rgba(0,0,0,${opacity})`
    ctx.fillRect(cx - micW / 2 - i * ps * 1.2, cy - ps * 0.5, ps * 0.6, ps)
    ctx.fillRect(cx + micW / 2 + i * ps * 0.6, cy - ps * 0.5, ps * 0.6, ps)
  }
}

function drawBooking(ctx: CanvasRenderingContext2D, W: number, t: number) {
  const ps = W / 12
  const cx = W / 2
  const cy = W / 2

  // Calendar body
  ctx.fillStyle = "rgba(0,0,0,0.12)"
  ctx.fillRect(cx - ps * 3.5, cy - ps * 3, ps * 7, ps * 6)

  // Calendar header
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(cx - ps * 3.5, cy - ps * 3, ps * 7, ps * 1.5)

  // Date number pulsing
  const pulse = 0.4 + 0.6 * Math.sin(t * 0.002)
  ctx.fillStyle = `rgba(0,0,0,${pulse})`
  const dateW = ps * 2
  const dateH = ps * 2
  ctx.fillRect(cx - dateW / 2, cy - ps * 0.3, dateW, dateH)

  // Checkmark
  ctx.fillStyle = `rgba(0,0,0,${0.3 + 0.5 * Math.sin(t * 0.004)})`
  ctx.fillRect(cx - ps * 0.8, cy + ps * 1.5, ps * 0.5, ps * 0.8)
  ctx.fillRect(cx - ps * 0.3, cy + ps * 1.5, ps * 0.5, ps * 0.8)
}

function drawLanguages(ctx: CanvasRenderingContext2D, W: number, t: number) {
  const ps = W / 12
  const cx = W / 2

  // Three speech bubbles
  const bubbleW = ps * 3
  const bubbleH = ps * 2.5
  const bubbleY = [W * 0.15, W * 0.38, W * 0.61]

  const labels = ["EN", "AM", "OM"]
  bubbleY.forEach((by, i) => {
    const pulse = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.002 + i * 1.5))
    ctx.fillStyle = `rgba(0,0,0,${pulse})`
    ctx.fillRect(cx - bubbleW / 2, by, bubbleW, bubbleH)

    ctx.fillStyle = "rgba(0,0,0,0.5)"
    ctx.font = `bold ${ps * 0.8}px monospace`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(labels[i]!, cx, by + bubbleH / 2 + 1)
  })
}

function drawDashboard(ctx: CanvasRenderingContext2D, W: number, t: number) {
  const ps = W / 12
  const cx = W / 2
  const cy = W / 2

  // Monitor outline
  ctx.fillStyle = "rgba(0,0,0,0.12)"
  ctx.fillRect(cx - ps * 4, cy - ps * 3, ps * 8, ps * 5.5)

  // Screen content - bars
  const barH = [ps * 1.5, ps * 2.5, ps * 2, ps * 3, ps * 1.8]
  barH.forEach((bh, i) => {
    const pulse = 0.2 + 0.6 * Math.sin(t * 0.003 + i * 1.2)
    ctx.fillStyle = `rgba(0,0,0,${pulse})`
    const bx = cx - ps * 3 + i * ps * 1.6
    ctx.fillRect(bx, cy + ps * 1.5 - bh, ps * 0.8, bh)
  })

  // Stand
  ctx.fillStyle = "rgba(0,0,0,0.15)"
  ctx.fillRect(cx - ps * 0.5, cy + ps * 2.5, ps, ps * 1)
}

function drawEmbed(ctx: CanvasRenderingContext2D, W: number, t: number) {
  const ps = W / 12
  const cx = W / 2
  const cy = W / 2

  // Widget box
  ctx.fillStyle = "rgba(0,0,0,0.12)"
  ctx.fillRect(cx - ps * 4, cy - ps * 2.5, ps * 8, ps * 5)

  // Code brackets
  const pulse = 0.3 + 0.7 * Math.sin(t * 0.0025)
  ctx.fillStyle = `rgba(0,0,0,${pulse})`
  ctx.fillRect(cx - ps * 3, cy - ps * 0.5, ps * 0.5, ps * 1)
  ctx.fillRect(cx + ps * 2.5, cy - ps * 0.5, ps * 0.5, ps * 1)
  ctx.fillRect(cx - ps * 2.5, cy - ps * 1.5, ps * 5, ps * 0.5)
  ctx.fillRect(cx - ps * 2.5, cy + ps * 1, ps * 5, ps * 0.5)

  // Button
  const btnPulse = 0.4 + 0.6 * Math.sin(t * 0.003)
  ctx.fillStyle = `rgba(0,0,0,${btnPulse})`
  ctx.fillRect(cx - ps * 1.5, cy - ps * 0.8, ps * 3, ps * 1.6)
}

export function PixelIcon({ type, size = 40 }: PixelIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const draw = (t: number) => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = size * dpr
      canvas.height = size * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, size, size)

      ctx.imageSmoothingEnabled = false

      switch (type) {
        case "voice":      drawVoice(ctx, size, t);      break
        case "booking":    drawBooking(ctx, size, t);    break
        case "languages":  drawLanguages(ctx, size, t);  break
        case "dashboard":  drawDashboard(ctx, size, t);  break
        case "embed":      drawEmbed(ctx, size, t);      break
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [type, size])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        display: "block",
        flexShrink: 0,
      }}
    />
  )
}
