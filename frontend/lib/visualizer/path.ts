import { TYPE_ICONS } from "./types"
import type {
  NormalizedTrashPoint,
  Plan,
  SmoothPath,
  TrashPoint,
  Vec2,
} from "./types"

export function buildPlan(
  points: TrashPoint[],
  canvasSize: { width: number; height: number },
): Plan {
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

  return {
    base,
    targets,
    orderedTargets,
    smoothPath: buildSmoothPath(waypoints),
    environment: detectEnvironment(augmentedPoints),
    uniqueTypes: Array.from(new Set(normalizedPoints.map((point) => point.type))),
    normalizedPoints,
  }
}

function normalizePoints(
  points: TrashPoint[],
  width: number,
  height: number,
): NormalizedTrashPoint[] {
  if (!points.length || width === 0 || height === 0) return []

  const minX = Math.min(...points.map((p) => p.x))
  const maxX = Math.max(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const maxY = Math.max(...points.map((p) => p.y))
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  const padding = Math.min(width, height) * 0.08
  const drawableWidth = width - padding * 2
  const drawableHeight = height - padding * 2
  const scale = Math.min(drawableWidth / rangeX, drawableHeight / rangeY)
  const offsetX = padding + (drawableWidth - rangeX * scale) / 2
  const offsetY = padding + (drawableHeight - rangeY * scale) / 2

  return points.map((point, index) => ({
    ...point,
    normX: offsetX + (point.x - minX) * scale,
    normY: height - (offsetY + (point.y - minY) * scale),
    icon: TYPE_ICONS[point.type],
    id: point.id ?? `point-${index}`,
  }))
}

function orderTargets(
  targets: NormalizedTrashPoint[],
  base: NormalizedTrashPoint,
): NormalizedTrashPoint[] {
  if (!targets.length) return []

  const route: number[] = []
  const visited = new Set<number>()
  let currentIndex = findNearestTarget(base, targets, visited)

  while (currentIndex !== -1) {
    route.push(currentIndex)
    visited.add(currentIndex)
    currentIndex = findNearestTarget(targets[currentIndex], targets, visited)
  }

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
  origin: Vec2,
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

/** Uniform Catmull–Rom spline sampling into a polyline for animation. */
export function buildSmoothPath(waypoints: Vec2[]): SmoothPath {
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
      totalLength += Math.hypot(point.x - prev.x, point.y - prev.y)
      points.push(point)
      cumulative.push(totalLength)
    }
    segmentDistances.push(totalLength)
  }

  return { points, cumulative, totalLength, segmentDistances }
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

export function interpolateAlongPath(
  points: Vec2[],
  cumulative: number[],
  distanceValue: number,
): Vec2 {
  if (distanceValue <= 0) return points[0]
  const lastIndex = cumulative.length - 1
  if (distanceValue >= cumulative[lastIndex]) return points[lastIndex]

  let low = 0
  let high = cumulative.length - 1
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (cumulative[mid] < distanceValue) low = mid + 1
    else high = mid
  }

  const idx = Math.max(1, low)
  const segmentLength = cumulative[idx] - cumulative[idx - 1] || 1
  const ratio = (distanceValue - cumulative[idx - 1]) / segmentLength
  const prev = points[idx - 1]
  const next = points[idx]
  return {
    x: prev.x + (next.x - prev.x) * ratio,
    y: prev.y + (next.y - prev.y) * ratio,
  }
}

function detectEnvironment(points: TrashPoint[]): "underwater" | "land" {
  const underwater = points.some(
    (point) => point.type.startsWith("animal") || point.type === "trash_fishing_gear",
  )
  return underwater ? "underwater" : "land"
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
