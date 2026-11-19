/** On-canvas HUD: star score counter, level dots and the thermometer. */

import { Star } from "lucide-react"
import type { ReactNode } from "react"

import { cs } from "@/locales/cs"
import { LevelDots } from "./LevelDots"
import { Thermometer } from "./Thermometer"

export function Hud({
  points,
  level,
  fraction,
}: {
  points: number
  level: number
  fraction: number | null
}): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-0 p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 rounded-full bg-white/85 px-8 py-3 shadow-xl">
          <Star className="size-12 fill-yellow-400 text-yellow-500" />
          <span
            className="text-5xl font-black tabular-nums text-slate-800"
            role="img"
            aria-label={cs.aria.score}
          >
            {points}
          </span>
        </div>
        <LevelDots level={level} />
      </div>
      {fraction !== null && (
        <div className="absolute right-6 top-6">
          <Thermometer fraction={fraction} />
        </div>
      )}
    </div>
  )
}
