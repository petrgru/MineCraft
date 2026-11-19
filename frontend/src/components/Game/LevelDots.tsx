/** Eight picture dots showing overall progress; ✓ = finished level. */

import { cn } from "@/lib/utils"
import { cs } from "@/locales/cs"

export function LevelDots({ level }: { level: number }) {
  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label={cs.aria.levels}
    >
      {cs.roomIcons.map((icon, i) => {
        const n = i + 1
        return (
          <span
            key={i}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-base shadow",
              n < level && "bg-green-500 text-white",
              n === level && "scale-125 bg-white ring-4 ring-yellow-400",
              n > level && "bg-slate-400/40 opacity-60 grayscale",
            )}
          >
            {n < level ? "✓" : icon}
          </span>
        )
      })}
    </div>
  )
}
