"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, Pause, RotateCcw, Upload } from "lucide-react"
// NOTE: For standalone use, uncomment these and comment the @/ imports:
// import { Button } from "./dependencies/button"
// import { cn } from "./dependencies/utils"
// For Next.js app use, use these:
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

const DEFAULT_INPUT = JSON.stringify(
  [
    { id: "rov-base", x: 5, y: 5, type: "rov" },
    { id: "plastic-01", x: 40, y: 60, type: "trash_plastic" },
    { id: "paper-01", x: 75, y: 35, type: "trash_paper" },
    { id: "metal-01", x: 52, y: 80, type: "trash_metal" },
    { id: "fabric-01", x: 20, y: 30, type: "trash_fabric" },
    { id: "fish-01", x: 65, y: 65, type: "animal_fish" },
    { id: "crab-01", x: 18, y: 78, type: "animal_crab" },
    { id: "wood-01", x: 85, y: 15, type: "trash_wood" },
    { id: "gear-01", x: 32, y: 90, type: "trash_fishing_gear" },
  ],
  null,
  2,
)

const DURATION_MS = 10000
const CANVAS_ASPECT = 16 / 9

const DEFAULT_COUNT_SAMPLE = JSON.stringify(
  {
    trash_plastic: 3,
    trash_metal: 2,
    trash_paper: 1,
    trash_fabric: 1,
    trash_wood: 1,
    trash_fishing_gear: 1,
    trash_etc: 1,
  },
  null,
  2,
)

export default function VisualizerPage() {
  const [inputValue, setInputValue] = useState<string>(DEFAULT_INPUT)
  const [trashPoints, setTrashPoints] = useState<TrashPoint[]>(() => parseInput(DEFAULT_INPUT))
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 960, height: 960 / CANVAS_ASPECT })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Resize observer to keep canvas crisp
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

  // Sync canvas dimensions with device pixel ratio
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

  // Redraw canvas whenever animation or plan updates
  useEffect(() => {
    if (!plan || !canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    drawScene(ctx, containerSize, plan, distanceTravelled)
  }, [plan, containerSize, distanceTravelled])

  const handleApply = useCallback(() => {
    try {
      const parsed = parseInput(inputValue)
      setTrashPoints(parsed)
      setElapsed(0)
      setIsPlaying(false)
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to parse input")
    }
  }, [inputValue])

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

  const handleUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setInputValue(reader.result)
        }
      }
      reader.readAsText(file)
    },
    [setInputValue],
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-semibold text-slate-200">
            Intelligent Trash Route Simulation
          </p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Adaptive Trash Collection Visualizer</h1>
          <p className="text-lg text-slate-200/80">
            Feed in trash detections from your AI pipeline and watch a collector plan and execute a smooth, efficient pickup
            mission. Each item is rendered with contextual icons, and the movement automatically adapts to finish in about ten
            seconds, no matter the scenario.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            <div className="relative overflow-hidden rounded-3xl">
              <div ref={containerRef} className="relative w-full">
                <div style={{ paddingTop: `${100 / CANVAS_ASPECT}%` }} />
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
                {!plan && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm font-medium text-slate-200">Add at least one trash point to begin the simulation.</p>
                  </div>
                )}
              </div>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-full bg-slate-950/60 px-5 py-2 text-sm text-slate-100 shadow-lg backdrop-blur">
                <span className="font-semibold text-white">
                  {plan ? `${collectedCount} / ${plan.targets.length} collected` : "Idle"}
                </span>
                <div className="h-3 w-40 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-[width]"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="tabular-nums text-slate-200">{(progress * 10).toFixed(1)}s / 10.0s</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 px-6 py-5 sm:flex-row">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePlayPause}
                  disabled={!plan || !plan.targets.length}
                  className="flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2 text-base font-semibold text-slate-950 shadow-lg hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> {elapsed > 0 ? "Resume" : "Play"}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="ghost"
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-200/80">
                <span>
                  Total path:{" "}
                  <strong className="text-white">
                    {plan ? `${Math.round(plan.smoothPath.totalLength)} px` : "--"}
                  </strong>
                </span>
                <span>
                  Speed:{" "}
                  <strong className="text-white">
                    {plan && plan.smoothPath.totalLength
                      ? `${Math.round((plan.smoothPath.totalLength / (DURATION_MS / 1000)) * 10) / 10} px/s`
                      : "--"}
                  </strong>
                </span>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Detections Input</h2>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
                  <Upload className="h-4 w-4" />
                  Import JSON
                  <input type="file" accept="application/json" className="hidden" onChange={handleUpload} />
                </label>
              </div>
              <p className="mt-1 text-sm text-slate-200/70">
                Provide detections as an array of objects with <code className="rounded bg-black/40 px-1">x</code>,{" "}
                <code className="rounded bg-black/40 px-1">y</code>, and <code className="rounded bg-black/40 px-1">type</code>, or
                supply a dictionary of <code className="rounded bg-black/40 px-1">type: count</code> pairs for deterministic
                placement.
              </p>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="mt-4 h-48 w-full resize-none rounded-2xl border border-white/15 bg-slate-950/40 p-3 font-mono text-sm text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
              {error && <p className="mt-3 text-sm font-medium text-rose-300">{error}</p>}
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={handleApply} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
                  Apply Data
                </Button>
                <Button
                  onClick={() => {
                    setInputValue(DEFAULT_INPUT)
                    setError(null)
                  }}
                  variant="ghost"
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Reset Sample
                </Button>
                <Button
                  onClick={() => {
                    setInputValue(DEFAULT_COUNT_SAMPLE)
                    setError(null)
                  }}
                  variant="ghost"
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Use Counts Sample
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Legend</h3>
              {plan ? (
                <ul className="mt-4 space-y-2">
                  {plan.uniqueTypes.map((type) => (
                    <li
                      key={type}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100",
                        type === "rov" && "border-cyan-400/60 bg-cyan-400/10 text-white",
                      )}
                    >
                      <span className="flex items-center gap-3 font-medium">
                        <span className="text-xl">{TYPE_ICONS[type]}</span>
                        {humanizeLabel(type)}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs text-slate-200">
                        {
                          plan.normalizedPoints.filter((point) => point.type === type && (type !== "rov" || point.id === plan.base.id))
                            .length
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-200/70">Provide data to see categorized detections.</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <h3 className="text-lg font-semibold text-white">How the route is built</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200/80">
                <li>• The collector starts at the ROV (or the centroid if none is provided).</li>
                <li>• A nearest-neighbor + 2-opt refinement finds an efficient pickup order.</li>
                <li>• We smooth the path with Catmull–Rom splines for natural motion.</li>
                <li>• Animation speed adjusts so the full mission completes in 10 seconds.</li>
                <li>• Count-based inputs generate reproducible layouts via a deterministic random seed.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function parseInput(input: string): TrashPoint[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    throw new Error("Invalid JSON format. Ensure the input is valid JSON.")
  }

  if (Array.isArray(parsed)) {
    return parseArrayInput(parsed)
  }

  if (parsed && typeof parsed === "object") {
    return parseCountsDictionary(parsed as Record<string, number>)
  }

  throw new Error("Input must be either an array of detections or an object mapping types to counts.")
}

function parseArrayInput(arrayInput: unknown[]): TrashPoint[] {
  const result: TrashPoint[] = []
  for (let i = 0; i < arrayInput.length; i++) {
    const item = arrayInput[i] as Partial<RawTrashPoint>
    if (typeof item?.x !== "number" || typeof item?.y !== "number") {
      throw new Error(`Detection at index ${i} is missing numeric x/y coordinates.`)
    }

    if (item.type === undefined) {
      throw new Error(`Detection at index ${i} is missing a type.`)
    }

    const type = resolveType(item.type)
    if (!type) {
      throw new Error(`Detection at index ${i} has an unknown type: ${String(item.type)}`)
    }

    result.push({
      id: item.id ?? `point-${i}`,
      x: item.x,
      y: item.y,
      type,
    })
  }

  return result
}

function parseCountsDictionary(dictionary: Record<string, number>): TrashPoint[] {
  const entries = Object.entries(dictionary)
  if (!entries.length) {
    throw new Error("Counts dictionary is empty. Provide at least one item.")
  }

  const normalizedEntries = entries.map(([rawType, count]) => {
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
      throw new Error(`Invalid count for type "${rawType}". Counts must be positive numbers.`)
    }
    // Convert string to number if it's numeric, otherwise use as string
    const typeValue: number | TrashLabel = !isNaN(Number(rawType)) ? Number(rawType) : rawType as TrashLabel
    const type = resolveType(typeValue)
    if (!type) {
      throw new Error(`Unknown trash type "${rawType}".`)
    }
    return [type, Math.floor(count)] as [TrashLabel, number]
  })

  // Create a comprehensive seed that includes all type:count pairs in a deterministic order
  // This ensures different dictionaries produce different seeds
  const sortedEntries = normalizedEntries
    .map(([type, count]) => `${type}:${count}`)
    .sort((a, b) => a.localeCompare(b))
  const seedSource = JSON.stringify(sortedEntries)
  
  const points: TrashPoint[] = []
  let globalIndex = 0
  
  // Sort entries for deterministic ordering
  normalizedEntries
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        const id = `${type}-${i + 1}`
        
        // Create a unique seed for this specific point by combining:
        // 1. The base dictionary seed
        // 2. The global index of this point
        // This ensures each point gets a unique random position
        const pointSeed = `${seedSource}:${globalIndex}`
        const pointRng = createDeterministicRng(pointSeed)
        
        points.push({
          id,
          type,
          x: randomInRange(pointRng, 10, 90),
          y: randomInRange(pointRng, 10, 90),
        })
        
        globalIndex++
      }
    })

  return points
}

function resolveType(type: RawTrashPoint["type"]): TrashLabel | undefined {
  if (typeof type === "number") {
    return TYPE_NAMES[type]
  }
  if (typeof type === "string" && type in TYPE_ICONS) {
    return type as TrashLabel
  }
  return undefined
}

type RNG = () => number

function createDeterministicRng(seedSource: string): RNG {
  const seed = hashString(seedSource)
  return mulberry32(seed)
}

function hashString(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): RNG {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInRange(rng: RNG, min: number, max: number): number {
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
          x: average(points.map((point) => point.x)),
          y: average(points.map((point) => point.y)),
        },
      ]

  const normalizedPoints = normalizePoints(augmentedPoints, canvasSize.width, canvasSize.height)
  const base = normalizedPoints.find((point) => point.type === "rov")!
  const targets = normalizedPoints.filter((point) => point.id !== base.id)

  const orderedTargets = orderTargets(targets, base)
  const waypoints = [base, ...orderedTargets].map(({ normX, normY }) => ({ x: normX, y: normY }))
  const smoothPath = buildSmoothPath(waypoints)
  const environment = detectEnvironment(augmentedPoints)

  const uniqueTypes = Array.from(new Set(normalizedPoints.map((point) => point.type)))

  return {
    base,
    targets,
    orderedTargets,
    smoothPath,
    environment,
    uniqueTypes,
    normalizedPoints,
  }
}

function normalizePoints(points: TrashPoint[], width: number, height: number): NormalizedTrashPoint[] {
  if (!points.length) return []

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))

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

  return points.map((point, index) => ({
    ...point,
    normX: offsetX + (point.x - minX) * scale,
    normY: height - (offsetY + (point.y - minY) * scale),
    icon: TYPE_ICONS[point.type],
    id: point.id ?? `point-${index}`,
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

  // Local 2-opt optimization for nicer routes
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

function findNearestTarget(
  origin: NormalizedTrashPoint,
  targets: NormalizedTrashPoint[],
  visited: Set<number>,
): number {
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

function detectEnvironment(points: TrashPoint[]): "underwater" | "land" {
  const underwater = points.some((point) => point.type.startsWith("animal") || point.type === "trash_fishing_gear")
  return underwater ? "underwater" : "land"
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

function drawBackground(ctx: CanvasRenderingContext2D, size: { width: number; height: number }, environment: "underwater" | "land") {
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
  const { points, cumulative, totalLength } = plan.smoothPath
  if (points.length < 2 || totalLength === 0) return

  ctx.lineWidth = 4
  ctx.lineJoin = "round"

  // Draw future path
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()

  // Draw completed path
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
    ctx.fillStyle = collected ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.15)"
    ctx.strokeStyle = collected ? "rgba(59,130,246,0.9)" : "rgba(255,255,255,0.25)"
    ctx.lineWidth = 3
    ctx.arc(point.normX, point.normY, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.save()
    ctx.font = "20px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = collected ? "rgba(34,197,94,0.8)" : "rgba(0,0,0,0.4)"
    ctx.shadowBlur = collected ? 12 : 8
    ctx.fillText(point.icon, point.normX, point.normY)
    ctx.restore()
  })

  // Draw base ROV
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
  if (distance <= 0) {
    return points[0]
  }
  const lastIndex = cumulative.length - 1
  if (distance >= cumulative[lastIndex]) {
    return points[lastIndex]
  }

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

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function humanizeLabel(label: TrashLabel): string {
  if (label === "rov") {
    return "Collector (ROV)"
  }
  return label
    .replace("trash_", "")
    .replace("animal_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("Eel", "Eel (avoid)")
}

