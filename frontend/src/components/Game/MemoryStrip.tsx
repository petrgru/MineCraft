/** Top strip for memory levels: the whole colour order flashes at once.
 * No text — the player cannot read yet. */

import { cs } from "@/locales/cs"

export const MEMORY_HEX = ["#ff5964", "#3d9bff", "#ffd32a", "#4cd137"]

export function MemoryStrip({ sequence }: { sequence: number[] }) {
  return (
    <div
      data-seq={sequence.join(",")}
      role="img"
      aria-label={cs.aria.demo}
      className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-3 rounded-3xl bg-white/90 px-5 py-4 shadow-2xl"
    >
      {sequence.map((colour, i) => (
        <div
          key={i}
          className="size-14 rounded-2xl border-4 border-slate-200"
          style={{ backgroundColor: MEMORY_HEX[colour] }}
        />
      ))}
    </div>
  )
}
