export type TrashLabel =
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

export type RawTrashPoint = {
  id?: string
  x: number
  y: number
  type: number | TrashLabel
}

export type TrashPoint = {
  id: string
  x: number
  y: number
  type: TrashLabel
}

export type NormalizedTrashPoint = TrashPoint & {
  normX: number
  normY: number
  icon: string
}

export type Vec2 = {
  x: number
  y: number
}

export type SmoothPath = {
  points: Vec2[]
  cumulative: number[]
  totalLength: number
  segmentDistances: number[]
}

export type Plan = {
  base: NormalizedTrashPoint
  targets: NormalizedTrashPoint[]
  orderedTargets: NormalizedTrashPoint[]
  smoothPath: SmoothPath
  environment: "underwater" | "land"
  uniqueTypes: TrashLabel[]
  normalizedPoints: NormalizedTrashPoint[]
}

export const TYPE_NAMES: Record<number, TrashLabel> = {
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

export const TYPE_ICONS: Record<TrashLabel, string> = {
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

export const DURATION_MS = 10000

/** Default demo: 50 plastic + 10 metal, positions from a deterministic seed. */
export const DEFAULT_COUNT_SAMPLE = JSON.stringify(
  {
    trash_plastic: 50,
    trash_metal: 10,
  },
  null,
  2,
)

export function humanizeLabel(label: TrashLabel): string {
  if (label === "rov") return "Collector (ROV)"
  return label
    .replace("trash_", "")
    .replace("animal_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("Eel", "Eel (avoid)")
}
