"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, Pause, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

type RawTrashPoint = {
  id?: string
  x: number
  y: number
  type: number | TrashLabel
}

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

const TYPE_NAMES: Record<number, TrashLabel> = {
  0: "rov",
  1: "plant",
  2: "animal_fish",
  3: "animal_starfish",
  4: "animal_shells",
  5: "animal_crab",
  6: "animal_eel",
  7: "animal_etc",
  8: "trash_etc",
  9: "trash_fabric",
  10: "trash_fishing_gear",
  11: "trash_metal",
  12: "trash_paper",
  13: "trash_plastic",
  14: "trash_rubber",
  15: "trash_wood",
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

const DEFAULT_TRASH_POINTS = [
  { id: "rov-base", x: 5, y: 5, type: "rov" },
  { id: "plastic-01", x: 40, y: 60, type: "trash_plastic" },
  { id: "paper-01", x: 75, y: 35, type: "trash_paper" },
  { id: "metal-01", x: 52, y: 80, type: "trash_metal" },
  { id: "fabric-01", x: 20, y: 30, type: "trash_fabric" },
  { id: "fish-01", x: 65, y: 65, type: "animal_fish" },
  { id: "crab-01", x: 18, y: 78, type: "animal_crab" },
  { id: "wood-01", x: 85, y: 15, type: "trash_wood" },
  { id: "gear-01", x: 32, y: 90, type: "trash_fishing_gear" },
] as RawTrashPoint[]

const DURATION_MS = 10000
const CANVAS_ASPECT = 16 / 9

function parseInput(input: RawTrashPoint[]): TrashPoint[] {
  return input.map((item, index) => ({
    id: item.id || `point-${index}`,
    x: item.x,
    y: item.y,
    type: typeof item.type === "number" ? TYPE_NAMES[item.type] : item.type,
  }))
}

function buildPlan(trashPoints: TrashPoint[], containerSize: { width: number; height: number }): Plan | null {
  if (!trashPoints.length) return null

  const normalized = trashPoints.map((p) => ({
    ...p,
    normX: (p.x / 100) * containerSize.width,
    normY: (p.y / 100) * containerSize.height,
    icon: TYPE_ICONS[p.type],
  }))

  const base = normalized.find((p) => p.type === "rov")
  if (!base) return null

  const targets = normalized.filter((p) => p.type !== "rov" && p.type.startsWith("trash"))
  const orderedTargets = greedySort(base, targets)
  const smoothPath = buildSmoothPath([base, ...orderedTargets, base])
  const uniqueTypes = Array.from(new Set(normalized.map((p) => p.type)))

  return {
    base,
    targets,
    orderedTargets,
    smoothPath,
    environment: "underwater",
    uniqueTypes,
    normalizedPoints: normalized,
  }
}

function greedySort(base: NormalizedTrashPoint, targets: NormalizedTrashPoint[]): NormalizedTrashPoint[] {
  const result: NormalizedTrashPoint[] = []
  const remaining = [...targets]
  let current: Vec2 = base

  while (remaining.length > 0) {
    let bestIndex = 0
    let bestDistance = distance(current, remaining[0])

    for (let i = 1; i < remaining.length; i++) {
      const d = distance(current, remaining[i])
      if (d < bestDistance) {
        bestDistance = d
        bestIndex = i
      }
    }

    const next = remaining.splice(bestIndex, 1)[0]
    result.push(next)
    current = next
  }

  return result
}

function buildSmoothPath(waypoints: NormalizedTrashPoint[]): SmoothPath {
  if (waypoints.length < 2) {
    return {
      points: waypoints,
      cumulative: [0],
      totalLength: 0,
      segmentDistances: [],
    }
  }

  const smoothPoints: Vec2[] = [waypoints[0]]
  const segmentDistances: number[] = []

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i]
    const end = waypoints[i + 1]
    const segmentLength = distance(start, end)
    
    const steps = Math.max(2, Math.floor(segmentLength / 10))
    for (let j = 1; j <= steps; j++) {
      const t = j / steps
      smoothPoints.push({
        x: start.normX + (end.normX - start.normX) * t,
        y: start.normY + (end.normY - start.normY) * t,
      })
    }
    
    segmentDistances.push(smoothPoints.length > 1 ? calculatePathLength(smoothPoints) : 0)
  }

  const cumulative = [0]
  for (let i = 1; i < smoothPoints.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(smoothPoints[i - 1], smoothPoints[i]))
  }

  return {
    points: smoothPoints,
    cumulative,
    totalLength: cumulative[cumulative.length - 1] || 0,
    segmentDistances,
  }
}

function calculatePathLength(points: Vec2[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i])
  }
  return length
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  containerSize: { width: number; height: number },
  plan: Plan,
  distanceTravelled: number
) {
  const { width, height } = containerSize

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
  bgGradient.addColorStop(0, "rgba(15, 23, 42, 0.95)")
  bgGradient.addColorStop(1, "rgba(30, 41, 59, 0.95)")
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Draw path
  drawPath(ctx, plan)
  
  // Draw targets
  drawTargets(ctx, plan, distanceTravelled)
  
  // Draw base
  drawBase(ctx, plan.base)
  
  // Draw collector
  drawCollector(ctx, plan, distanceTravelled)
}

function drawPath(ctx: CanvasRenderingContext2D, plan: Plan) {
  const { points } = plan.smoothPath
  if (points.length < 2) return

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.strokeStyle = "rgba(59, 130, 246, 0.3)"
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.stroke()
  ctx.setLineDash([])
}

function drawTargets(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  const { segmentDistances } = plan.smoothPath

  plan.orderedTargets.forEach((target, index) => {
    const collected = segmentDistances[index] <= distanceTravelled + 1e-3

    ctx.save()
    if (collected) {
      ctx.globalAlpha = 0.3
    }

    ctx.beginPath()
    ctx.fillStyle = "rgba(239, 68, 68, 0.2)"
    ctx.strokeStyle = "rgba(239, 68, 68, 0.8)"
    ctx.lineWidth = 2
    ctx.arc(target.normX, target.normY, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.font = "20px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(target.icon, target.normX, target.normY)

    ctx.restore()
  })
}

function drawBase(ctx: CanvasRenderingContext2D, base: NormalizedTrashPoint) {
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
    drawCollectorGlyph(ctx, points[0], 0)
    drawCollectorHalo(ctx, points[0])
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

function humanizeLabel(label: TrashLabel): string {
  if (label === "rov") return "Collector (ROV)"
  
  return label
    .replace("trash_", "")
    .replace("animal_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function SwarmPathVisualizer() {
  const [trashPoints, setTrashPoints] = useState<TrashPoint[]>(() => parseInput(DEFAULT_TRASH_POINTS))
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      if (width > 0 && height > 0) {
        setContainerSize({ width, height })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)
    window.addEventListener('resize', updateSize)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || containerSize.width === 0 || containerSize.height === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio ?? 1
    const width = containerSize.width
    const height = containerSize.height
    
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }, [containerSize])

  const plan = useMemo<Plan | null>(() => {
    if (!trashPoints.length || containerSize.width === 0 || containerSize.height === 0) return null
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-8 w-8 text-secondary" />
            <div className="absolute inset-0 blur-lg bg-secondary/30 -z-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Swarm Path Visualizer</h2>
            <p className="text-sm text-muted-foreground">AI-powered trash collection simulation</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            isPlaying
              ? "border-primary/40 text-primary bg-primary/10"
              : "border-muted-foreground/40 text-muted-foreground bg-muted/10"
          }
        >
          {isPlaying ? "Collecting" : "Idle"}
        </Badge>
      </div>

      {/* Main Visualization */}
      <Card className="glass-panel border-border/50">
        <CardContent className="p-0">
          <div className="relative w-full" style={{ aspectRatio: CANVAS_ASPECT.toString() }}>
            <div ref={containerRef} className="absolute inset-0 w-full h-full">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-lg" style={{ display: 'block' }} />
              {!plan && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm font-medium text-muted-foreground">Initializing simulation...</p>
                </div>
              )}
            </div>
            
            {/* Progress Overlay */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-background/60 px-5 py-2 text-sm backdrop-blur">
              <span className="font-semibold">
                {plan ? `${collectedCount} / ${plan.targets.length} collected` : "Idle"}
              </span>
              <div className="h-2 w-32 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="tabular-nums text-muted-foreground">{(progress * 10).toFixed(1)}s / 10.0s</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4 border-t border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePlayPause}
                disabled={!plan || !plan.targets.length}
                size="lg"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> {elapsed > 0 ? "Resume" : "Play"}
                  </>
                )}
              </Button>
              <Button onClick={handleRestart} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>
                Path: <strong className="text-foreground">
                  {plan ? `${Math.round(plan.smoothPath.totalLength)} px` : "--"}
                </strong>
              </span>
              <span>
                Speed: <strong className="text-foreground">
                  {plan && plan.smoothPath.totalLength
                    ? `${Math.round((plan.smoothPath.totalLength / (DURATION_MS / 1000)) * 10) / 10} px/s`
                    : "--"}
                </strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Detection Legend</CardTitle>
        </CardHeader>
        <CardContent>
          {plan ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {plan.uniqueTypes.map((type) => (
                <div
                  key={type}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    "bg-muted/50 border border-border/30",
                    type === "rov" && "ring-2 ring-primary/50 bg-primary/10"
                  )}
                >
                  <span className="text-lg leading-none">{TYPE_ICONS[type]}</span>
                  <span className="font-medium">{humanizeLabel(type)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No detections available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

