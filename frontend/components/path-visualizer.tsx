"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  buildPlan,
  DEFAULT_COUNT_SAMPLE,
  drawScene,
  DURATION_MS,
  humanizeLabel,
  parseInput,
  TYPE_ICONS,
  type Plan,
} from "@/lib/visualizer"

const HEADER_OFFSET = 64 // matches header h-16

/**
 * Full-viewport trash collection visualizer.
 * Sizes itself from the window (not CSS flex chains) so the canvas always paints.
 */
export function PathVisualizer({ offsetTop = HEADER_OFFSET }: { offsetTop?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const trashPoints = useMemo(() => parseInput(DEFAULT_COUNT_SAMPLE), [])

  // Explicit pixel size from the viewport — never collapses to 0
  useEffect(() => {
    const measure = () => {
      setSize({
        width: Math.max(320, Math.floor(window.innerWidth)),
        height: Math.max(240, Math.floor(window.innerHeight - offsetTop)),
      })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [offsetTop])

  const plan = useMemo<Plan | null>(() => {
    if (size.width === 0 || size.height === 0) return null
    return buildPlan(trashPoints, size)
  }, [trashPoints, size])

  const progress = plan?.smoothPath.totalLength
    ? Math.min(1, elapsed / DURATION_MS)
    : 0
  const distanceTravelled = plan ? plan.smoothPath.totalLength * progress : 0
  const collectedCount = plan
    ? plan.smoothPath.segmentDistances.filter((d) => d <= distanceTravelled + 1e-3).length
    : 0

  // Sync canvas buffer + paint
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !plan || size.width === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(size.width * dpr)
    canvas.height = Math.floor(size.height * dpr)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawScene(ctx, size, plan, distanceTravelled)
  }, [plan, size, distanceTravelled])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = now - last
      last = now
      setElapsed((prev) => Math.min(DURATION_MS, prev + delta))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])

  useEffect(() => {
    if (elapsed >= DURATION_MS && isPlaying) setIsPlaying(false)
  }, [elapsed, isPlaying])

  const togglePlay = useCallback(() => {
    if (!plan?.targets.length) return
    if (elapsed >= DURATION_MS) setElapsed(0)
    setIsPlaying((p) => !p)
  }, [plan, elapsed])

  const restart = useCallback(() => {
    setElapsed(0)
    setIsPlaying(false)
  }, [])

  const speed =
    plan && plan.smoothPath.totalLength
      ? Math.round((plan.smoothPath.totalLength / (DURATION_MS / 1000)) * 10) / 10
      : null

  return (
    <div
      className="relative overflow-hidden bg-[#061a2e]"
      style={{ width: size.width || "100%", height: size.height || "100%" }}
    >
      <canvas ref={canvasRef} className="block" />

      {/* Title */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-5 pb-12 pt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/90">
          Route simulation
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          Trash Collection Visualizer
        </h1>
      </div>

      {/* Legend */}
      {plan && (
        <aside className="absolute right-4 top-20 z-10 w-52 rounded-2xl border border-white/15 bg-black/70 p-4 shadow-xl backdrop-blur-md">
          <h3 className="mb-3 text-sm font-semibold text-white">Legend</h3>
          <ul className="space-y-1.5">
            {plan.uniqueTypes.map((type) => {
              const count = plan.normalizedPoints.filter(
                (p) => p.type === type && (type !== "rov" || p.id === plan.base.id),
              ).length
              return (
                <li
                  key={type}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-100 ${
                    type === "rov"
                      ? "bg-cyan-400/15 ring-1 ring-cyan-400/40"
                      : "bg-white/5 ring-1 ring-white/10"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{TYPE_ICONS[type]}</span>
                    {humanizeLabel(type)}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5">{count}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Nearest-neighbor + 2-opt · Catmull–Rom · ~10s mission
          </p>
        </aside>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-5 pt-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={togglePlay}
              disabled={!plan?.targets.length}
              className="rounded-full bg-cyan-500 px-5 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> {elapsed > 0 ? "Resume" : "Play"}
                </>
              )}
            </Button>
            <Button
              onClick={restart}
              variant="ghost"
              className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Restart
            </Button>

            <div className="flex items-center gap-3 rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur">
              <span className="font-semibold">
                {plan ? `${collectedCount}/${plan.targets.length}` : "—"}
              </span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/15 sm:w-40">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="tabular-nums text-slate-300">
                {(progress * 10).toFixed(1)}s
              </span>
            </div>
          </div>

          <div className="flex gap-5 text-sm text-slate-300">
            <span>
              Path{" "}
              <strong className="text-white">
                {plan ? `${Math.round(plan.smoothPath.totalLength)} px` : "—"}
              </strong>
            </span>
            <span>
              Speed{" "}
              <strong className="text-white">{speed != null ? `${speed} px/s` : "—"}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
