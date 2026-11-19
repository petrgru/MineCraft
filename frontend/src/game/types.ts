/** Shared contracts between the room manager (VoxelGame) and the rooms. */

import type { Materials } from "./materials"

export type RoomId = 1 | 2 | 3

/** Callbacks every room receives from the room manager. */
export interface RoomCallbacks {
  /** Add points to the running total for the current game session. */
  addPoints: (points: number) => void
  /** Play a sound effect by logical name; missing files fail silently. */
  playSound: (name: "pop" | "win") => void
  /** Room objective finished; the manager fades to the next room. */
  completeRoom: () => void
}

/** Props every room component receives. */
export interface RoomProps {
  callbacks: RoomCallbacks
  materials: Materials
  /** number of clickable task items, see LEVELS in ../levels */
  count?: number
  /** meadow levels where blocks must be clicked in colour order */
  order?: boolean
  /** cannon levels: extra bowling pins next to the balloons */
  pins?: number
  /** memory levels: report the colour-demo strip so VoxelGame can render it
   * as a DOM overlay (rooms live inside the canvas, the strip must not) */
  onOverlay?: (state: MemoryOverlayState | null) => void
  /** memory levels: pause the countdown while the sequence is demonstrated */
  onPause?: (paused: boolean) => void
}

/** What the memory room wants the top demo strip to display. */
export interface MemoryOverlayState {
  /** colour indices (0=red, 1=blue, 2=yellow, 3=green) in the tapped order */
  sequence: number[]
}
