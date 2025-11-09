"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, Pause, RotateCcw, Maximize2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TrashLabel =
  | "rov"
  | "plant"
  | "animal_fish"
  | "animal_starfish"
  | "animal_shells"
  | "animal_crab"
  | "animal_eel"
  | "animal_etc"
  | "trash_etc"
  | "trash_fabric"
  | "trash_fishing_gear"
  | "trash_metal"
  | "trash_paper"
  | "trash_plastic"
  | "trash_rubber"
  | "trash_wood"

type TrashPoint = {
  id: string
  x: number
  y: number
  type: TrashLabel
}

type NormalizedTrashPoint = TrashPoint & {
  normX: number
  normY: number
  icon: string
}

type Vec2 = {
  x: number
  y: number
}

type SmoothPath = {
  points: Vec2[]
  cumulative: number[]
  totalLength: number
  segmentDistances: number[]
}

type Plan = {
  base: NormalizedTrashPoint
  targets: NormalizedTrashPoint[]
  orderedTargets: NormalizedTrashPoint[]
  smoothPath: SmoothPath
  environment: "underwater" | "land"
  uniqueTypes: TrashLabel[]
  normalizedPoints: NormalizedTrashPoint[]
}

const TYPE_ICONS: Record<TrashLabel, string> = {
  rov: "🤖",
  plant: "🌿",
  animal_fish: "🐟",
  animal_starfish: "🪸",
  animal_shells: "🐚",
  animal_crab: "🦀",
  animal_eel: "🐍",
  animal_etc: "🐠",
  trash_etc: "🗑️",
  trash_fabric: "🧣",
  trash_fishing_gear: "🎣",
  trash_metal: "🥫",
  trash_paper: "📄",
  trash_plastic: "🧴",
  trash_rubber: "🧤",
  trash_wood: "🪵",
}

const DURATION_MS = 10000
const CANVAS_ASPECT = 16 / 9

interface TrashCollectionVisualizerProps {
  counts: Record<string, number>
}

export function TrashCollectionVisualizer({ counts }: TrashCollectionVisualizerProps) {
  const [trashPoints, setTrashPoints] = useState<TrashPoint[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 800 / CANVAS_ASPECT })
  const [fullScreen, setFullScreen] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Parse counts into trash points when they change
  useEffect(() => {
    if (Object.keys(counts).length > 0) {
      const points = parseCountsDictionary(counts)
      setTrashPoints(points)
      setElapsed(0)
      setIsPlaying(false)
    }
  }, [counts])

  // Fullscreen escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullScreen) {
        setFullScreen(false)
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [fullScreen])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        const height = width / CANVAS_ASPECT
        setContainerSize({ width, height })
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Sync canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio ?? 1
    canvas.width = containerSize.width * dpr
    canvas.height = containerSize.height * dpr
    canvas.style.width = `${containerSize.width}px`
    canvas.style.height = `${containerSize.height}px`
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }, [containerSize])

  const plan = useMemo<Plan | null>(() => {
    if (!trashPoints.length) return null
    return buildPlan(trashPoints, containerSize)
  }, [trashPoints, containerSize])

  const progress = useMemo(() => {
    if (!plan?.smoothPath.totalLength) return 0
    return Math.min(1, elapsed / DURATION_MS)
  }, [elapsed, plan])

  const distanceTravelled = useMemo(() => {
    if (!plan?.smoothPath.totalLength) return 0
    return plan.smoothPath.totalLength * progress
  }, [plan, progress])

  const collectedCount = useMemo(() => {
    if (!plan) return 0
    const { segmentDistances } = plan.smoothPath
    return segmentDistances.filter((segmentDistance) => segmentDistance <= distanceTravelled + 1e-3).length
  }, [plan, distanceTravelled])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return

    let animationFrame: number
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      let finished = false
      setElapsed((current) => {
        const next = Math.min(DURATION_MS, current + delta)
        if (next >= DURATION_MS) {
          finished = true
        }
        return next
      })
      if (finished) {
        setIsPlaying(false)
      } else {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [isPlaying])

  // Redraw canvas
  useEffect(() => {
    if (!plan || !canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    drawScene(ctx, containerSize, plan, distanceTravelled)
  }, [plan, containerSize, distanceTravelled])

  const handlePlayPause = useCallback(() => {
    if (!plan?.targets.length) return
    if (elapsed >= DURATION_MS) {
      setElapsed(0)
    }
    setIsPlaying((prev) => !prev)
  }, [plan, elapsed])

  const handleRestart = useCallback(() => {
    setElapsed(0)
    setIsPlaying(false)
  }, [])

  if (!plan) {
    return (
      <div className="glass-panel rounded-xl border border-border/30 p-8">
        <p className="text-center text-sm text-muted-foreground">
          Processing video to generate collection route visualization...
        </p>
      </div>
    )
  }

  return (
    <div className={cn("glass-panel rounded-xl border border-primary/20", fullScreen ? "fixed inset-0 z-50 m-0 rounded-none bg-background" : "")}>
      <div className="relative overflow-hidden rounded-t-xl">
        <div ref={containerRef} className="relative w-full">
          <div style={{ paddingTop: `${100 / CANVAS_ASPECT}%` }} />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>
        
        {/* Fullscreen Controls */}
        {fullScreen && (
          <div className="absolute top-4 right-4">
            <Button
              onClick={() => setFullScreen(false)}
              size="sm"
              variant="outline"
              className="gap-2 bg-background/80 backdrop-blur"
            >
              <X className="h-4 w-4" />
              Exit Fullscreen
            </Button>
          </div>
        )}
        
        {/* Progress Overlay */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-full bg-slate-950/60 px-5 py-2 text-sm text-slate-100 shadow-lg backdrop-blur">
          <span className="font-semibold text-white">
            {collectedCount} / {plan.targets.length} collected
          </span>
          <div className="h-3 w-32 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-400 transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-slate-200">{(progress * 10).toFixed(1)}s / 10.0s</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlayPause}
            disabled={!plan.targets.length}
            size="sm"
            className="flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3" /> {elapsed > 0 ? "Resume" : "Play"}
              </>
            )}
          </Button>
          <Button
            onClick={handleRestart}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Restart
          </Button>
          <Button
            onClick={() => setFullScreen(true)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
          >
            <Maximize2 className="h-3 w-3" />
            Fullscreen
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Path: <strong className="text-foreground">{Math.round(plan.smoothPath.totalLength)} px</strong>
          </span>
          <span>
            Speed:{" "}
            <strong className="text-foreground">
              {Math.round((plan.smoothPath.totalLength / (DURATION_MS / 1000)) * 10) / 10} px/s
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}

// Helper functions

function parseCountsDictionary(dictionary: Record<string, number>): TrashPoint[] {
  const entries = Object.entries(dictionary).filter(([_, count]) => count > 0)
  if (!entries.length) return []

  const seedSource = JSON.stringify(entries.sort())
  const points: TrashPoint[] = []
  let globalIndex = 0

  entries.forEach(([rawType, count]) => {
    const type = rawType as TrashLabel
    if (!TYPE_ICONS[type]) return

    for (let i = 0; i < Math.floor(count); i++) {
      const pointSeed = `${seedSource}:${globalIndex}`
      const pointRng = createDeterministicRng(pointSeed)

      points.push({
        id: `${type}-${i + 1}`,
        type,
        x: randomInRange(pointRng, 10, 90),
        y: randomInRange(pointRng, 10, 90),
      })

      globalIndex++
    }
  })

  return points
}

function createDeterministicRng(seedSource: string) {
  const hash = hashString(seedSource)
  return mulberry32(hash)
}

function hashString(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

function buildPlan(points: TrashPoint[], canvasSize: { width: number; height: number }): Plan {
  const hasRov = points.some((point) => point.type === "rov")
  const augmentedPoints: TrashPoint[] = hasRov
    ? points
    : [
        ...points,
        {
          id: "synthetic-rov",
          type: "rov",
          x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
          y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        },
      ]

  const normalizedPoints = normalizePoints(augmentedPoints, canvasSize.width, canvasSize.height)
  const base = normalizedPoints.find((point) => point.type === "rov")!
  const targets = normalizedPoints.filter((point) => point.id !== base.id)

  const orderedTargets = orderTargets(targets, base)
  const waypoints = [base, ...orderedTargets].map(({ normX, normY }) => ({ x: normX, y: normY }))
  const smoothPath = buildSmoothPath(waypoints)
  const environment = points.some((p) => p.type.startsWith("animal")) ? "underwater" : "land"
  const uniqueTypes = Array.from(new Set(normalizedPoints.map((point) => point.type)))

  return { base, targets, orderedTargets, smoothPath, environment, uniqueTypes, normalizedPoints }
}

function normalizePoints(points: TrashPoint[], width: number, height: number): NormalizedTrashPoint[] {
  if (!points.length) return []

  const minX = Math.min(...points.map((p) => p.x))
  const maxX = Math.max(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const maxY = Math.max(...points.map((p) => p.y))

  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const padding = Math.min(width, height) * 0.1
  const drawableWidth = width - padding * 2
  const drawableHeight = height - padding * 2
  const scale = Math.min(drawableWidth / rangeX, drawableHeight / rangeY)

  const extraX = drawableWidth - rangeX * scale
  const extraY = drawableHeight - rangeY * scale
  const offsetX = padding + extraX / 2
  const offsetY = padding + extraY / 2

  return points.map((point) => ({
    ...point,
    normX: offsetX + (point.x - minX) * scale,
    normY: height - (offsetY + (point.y - minY) * scale),
    icon: TYPE_ICONS[point.type],
  }))
}

function orderTargets(targets: NormalizedTrashPoint[], base: NormalizedTrashPoint): NormalizedTrashPoint[] {
  if (!targets.length) return []

  const route: number[] = []
  const visited = new Set<number>()
  let currentIndex = findNearestTarget(base, targets, visited)

  while (currentIndex !== -1) {
    route.push(currentIndex)
    visited.add(currentIndex)
    currentIndex = findNearestTarget(targets[currentIndex], targets, visited)
  }

  // 2-opt optimization
  if (route.length >= 4) {
    let improved = true
    while (improved) {
      improved = false
      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length - 1; j++) {
          const a = targets[route[i - 1]]
          const b = targets[route[i]]
          const c = targets[route[j]]
          const d = targets[route[j + 1]]
          const currentDistance = distance(a, b) + distance(c, d)
          const swappedDistance = distance(a, c) + distance(b, d)
          if (swappedDistance + 1e-6 < currentDistance) {
            reverseRouteSegment(route, i, j)
            improved = true
          }
        }
      }
    }
  }

  return route.map((index) => targets[index])
}

function findNearestTarget(origin: NormalizedTrashPoint, targets: NormalizedTrashPoint[], visited: Set<number>): number {
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < targets.length; i++) {
    if (visited.has(i)) continue
    const dist = distance(origin, targets[i])
    if (dist < bestDistance) {
      bestDistance = dist
      bestIndex = i
    }
  }
  return bestIndex
}

function reverseRouteSegment(route: number[], start: number, end: number) {
  while (start < end) {
    ;[route[start], route[end]] = [route[end], route[start]]
    start++
    end--
  }
}

function buildSmoothPath(waypoints: Vec2[]): SmoothPath {
  if (waypoints.length <= 1) {
    const point = waypoints[0] ?? { x: 0, y: 0 }
    return { points: [point], cumulative: [0], totalLength: 0, segmentDistances: [] }
  }

  const points: Vec2[] = [waypoints[0]]
  const cumulative: number[] = [0]
  const segmentDistances: number[] = []
  let totalLength = 0
  const samplesPerSegment = 24

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p0 = waypoints[i === 0 ? 0 : i - 1]
    const p1 = waypoints[i]
    const p2 = waypoints[i + 1]
    const p3 = waypoints[i + 2] ?? waypoints[waypoints.length - 1]

    for (let j = 1; j <= samplesPerSegment; j++) {
      const t = j / samplesPerSegment
      const point = catmullRom(p0, p1, p2, p3, t)
      const prev = points[points.length - 1]
      const segmentLength = Math.hypot(point.x - prev.x, point.y - prev.y)
      totalLength += segmentLength
      points.push(point)
      cumulative.push(totalLength)
    }
    if (i < waypoints.length - 1) {
      segmentDistances.push(totalLength)
    }
  }

  return { points, cumulative, totalLength, segmentDistances }
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      ((2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      ((2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  plan: Plan,
  distanceTravelled: number,
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size.width, size.height)
  drawBackground(ctx, size, plan.environment)
  drawGrid(ctx, size)
  drawPath(ctx, plan, distanceTravelled)
  drawTargets(ctx, plan, distanceTravelled)
  drawCollector(ctx, plan, distanceTravelled)
  ctx.restore()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  environment: "underwater" | "land",
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, size.height)
  if (environment === "underwater") {
    gradient.addColorStop(0, "rgba(7, 30, 64, 0.95)")
    gradient.addColorStop(1, "rgba(6, 59, 102, 0.95)")
  } else {
    gradient.addColorStop(0, "rgba(34, 48, 28, 0.92)")
    gradient.addColorStop(1, "rgba(63, 95, 55, 0.92)")
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size.width, size.height)

  // Ambient particles
  ctx.fillStyle = environment === "underwater" ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.04)"
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97) % size.width) + (i % 3) * 10
    const y = ((i * 53) % size.height) + (i % 5) * 6
    ctx.beginPath()
    ctx.arc(x, y, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, size: { width: number; height: number }) {
  const spacing = 80
  ctx.strokeStyle = "rgba(255,255,255,0.04)"
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = spacing; x < size.width; x += spacing) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size.height)
  }
  for (let y = spacing; y < size.height; y += spacing) {
    ctx.moveTo(0, y)
    ctx.lineTo(size.width, y)
  }
  ctx.stroke()
}

function drawPath(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  const { points, cumulative } = plan.smoothPath
  if (points.length < 2) return

  ctx.lineWidth = 4
  ctx.lineJoin = "round"

  // Future path
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()

  // Completed path
  ctx.strokeStyle = "rgba(45, 212, 191, 0.8)"
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    if (cumulative[i] <= distanceTravelled) {
      ctx.lineTo(points[i].x, points[i].y)
    } else {
      const prev = points[i - 1]
      const next = points[i]
      const segmentLength = cumulative[i] - cumulative[i - 1]
      const ratio = segmentLength ? (distanceTravelled - cumulative[i - 1]) / segmentLength : 0
      const clampedRatio = Math.max(0, Math.min(1, ratio))
      const interpolatedX = prev.x + (next.x - prev.x) * clampedRatio
      const interpolatedY = prev.y + (next.y - prev.y) * clampedRatio
      ctx.lineTo(interpolatedX, interpolatedY)
      break
    }
  }
  ctx.stroke()
}

function drawTargets(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  plan.orderedTargets.forEach((point, index) => {
    const targetDistance = plan.smoothPath.segmentDistances[index]
    const collected = targetDistance <= distanceTravelled + 1e-3

    ctx.beginPath()
    ctx.fillStyle = collected ? "rgba(34,197,94,0.8)" : "rgba(255,255,255,0.2)"
    ctx.strokeStyle = collected ? "rgba(59,130,246,0.9)" : "rgba(255,255,255,0.35)"
    ctx.lineWidth = 3
    ctx.arc(point.normX, point.normY, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.save()
    ctx.font = "20px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = collected ? "rgba(34,197,94,0.8)" : "rgba(255,255,255,0.5)"
    ctx.shadowBlur = collected ? 12 : 8
    ctx.fillText(point.icon, point.normX, point.normY)
    ctx.restore()
  })

  const base = plan.base
  ctx.beginPath()
  ctx.fillStyle = "rgba(59, 130, 246, 0.3)"
  ctx.strokeStyle = "rgba(59, 130, 246, 0.9)"
  ctx.lineWidth = 3
  ctx.arc(base.normX, base.normY, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.save()
  ctx.font = "24px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.shadowColor = "rgba(59,130,246,0.8)"
  ctx.shadowBlur = 14
  ctx.fillText(base.icon, base.normX, base.normY)
  ctx.restore()
}

function drawCollector(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  const { points, cumulative, totalLength } = plan.smoothPath
  if (!points.length) return

  if (totalLength === 0) {
    const position = points[0]
    drawCollectorGlyph(ctx, position, 0)
    drawCollectorHalo(ctx, position)
    return
  }

  const distance = Math.min(distanceTravelled, totalLength)
  const position = interpolateAlongPath(points, cumulative, distance)
  const directionAhead = interpolateAlongPath(points, cumulative, Math.min(distance + 1, totalLength))
  const angle = Math.atan2(directionAhead.y - position.y, directionAhead.x - position.x)

  drawCollectorGlyph(ctx, position, angle)
  drawCollectorHalo(ctx, position)
}

function drawCollectorGlyph(ctx: CanvasRenderingContext2D, position: Vec2, angle: number) {
  ctx.save()
  ctx.translate(position.x, position.y)
  ctx.rotate(angle)

  const bodyGradient = ctx.createLinearGradient(-20, 0, 20, 0)
  bodyGradient.addColorStop(0, "rgba(34,211,238,0.8)")
  bodyGradient.addColorStop(1, "rgba(14,165,233,0.9)")

  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.moveTo(-18, -10)
  ctx.lineTo(18, 0)
  ctx.lineTo(-18, 10)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = "rgba(12,74,110,0.9)"
  ctx.beginPath()
  ctx.arc(-4, 0, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawCollectorHalo(ctx: CanvasRenderingContext2D, position: Vec2) {
  ctx.beginPath()
  ctx.strokeStyle = "rgba(45, 212, 191, 0.5)"
  ctx.lineWidth = 2
  ctx.arc(position.x, position.y, 20, 0, Math.PI * 2)
  ctx.stroke()
}

function interpolateAlongPath(points: Vec2[], cumulative: number[], distance: number): Vec2 {
  if (distance <= 0) return points[0]
  const lastIndex = cumulative.length - 1
  if (distance >= cumulative[lastIndex]) return points[lastIndex]

  let low = 0
  let high = cumulative.length - 1
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (cumulative[mid] < distance) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  const idx = Math.max(1, low)
  const prevDistance = cumulative[idx - 1]
  const nextDistance = cumulative[idx]
  const segmentLength = nextDistance - prevDistance || 1
  const ratio = (distance - prevDistance) / segmentLength
  const prev = points[idx - 1]
  const next = points[idx]
  return {
    x: prev.x + (next.x - prev.x) * ratio,
    y: prev.y + (next.y - prev.y) * ratio,
  }
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
