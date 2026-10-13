import {
  TYPE_ICONS,
  TYPE_NAMES,
  type RawTrashPoint,
  type TrashLabel,
  type TrashPoint,
} from "./types"

export function parseInput(input: string): TrashPoint[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
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
    const typeValue: number | TrashLabel = !isNaN(Number(rawType))
      ? Number(rawType)
      : (rawType as TrashLabel)
    const type = resolveType(typeValue)
    if (!type) {
      throw new Error(`Unknown trash type "${rawType}".`)
    }
    return [type, Math.floor(count)] as [TrashLabel, number]
  })

  const seedSource = JSON.stringify(
    normalizedEntries.map(([type, count]) => `${type}:${count}`).sort((a, b) => a.localeCompare(b)),
  )

  const points: TrashPoint[] = []
  let globalIndex = 0

  normalizedEntries
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        const pointRng = createDeterministicRng(`${seedSource}:${globalIndex}`)
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

function resolveType(type: RawTrashPoint["type"]): TrashLabel | undefined {
  if (typeof type === "number") return TYPE_NAMES[type]
  if (typeof type === "string" && type in TYPE_ICONS) return type as TrashLabel
  return undefined
}

type RNG = () => number

function createDeterministicRng(seedSource: string): RNG {
  return mulberry32(hashString(seedSource))
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
