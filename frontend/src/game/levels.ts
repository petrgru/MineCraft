/** The 12-level progression table consumed by VoxelGame and the HUD. */

export type RoomKind =
  | "meadow"
  | "cave"
  | "castle"
  | "cannon"
  | "memory"
  | "space"

export interface LevelConfig {
  kind: RoomKind
  /** clickable task items (blocks / diamonds / levers / balloons / stars) or,
   * for memory rooms, the length of the colour sequence */
  count: number
  /** meadow variant: blocks must be clicked in colour order */
  order?: boolean
  /** cannon variant: number of bowling pins next to the balloons */
  pins?: number
  /** seconds shown by the thermometer; absent = no time pressure */
  timeLimit?: number
}

export const LEVELS: LevelConfig[] = [
  { kind: "meadow", count: 4 },
  { kind: "cave", count: 5 },
  { kind: "castle", count: 3 },
  { kind: "cannon", count: 4, timeLimit: 60 },
  { kind: "meadow", count: 6 },
  { kind: "cave", count: 7, timeLimit: 50 },
  { kind: "memory", count: 3, timeLimit: 60 },
  { kind: "castle", count: 4, timeLimit: 45 },
  { kind: "cannon", count: 5, pins: 4, timeLimit: 60 },
  { kind: "meadow", count: 8, order: true, timeLimit: 45 },
  { kind: "memory", count: 5, timeLimit: 45 },
  { kind: "space", count: 6, timeLimit: 60 },
]

export const TOTAL_LEVELS = LEVELS.length
