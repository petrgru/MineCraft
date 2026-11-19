/** Kid-friendly level timer: shrinking liquid, colour only, no digits. */

import { cs } from "@/locales/cs"

export function Thermometer({ fraction }: { fraction: number }) {
  const f = Math.min(1, Math.max(0, fraction))
  const color = `hsl(${Math.round(120 * f)}, 90%, 45%)`
  const liquidH = 96 * f
  return (
    <svg
      width="46"
      height="132"
      viewBox="0 0 46 132"
      role="img"
      aria-label={cs.aria.thermometer}
      className={f < 0.2 ? "animate-pulse" : ""}
    >
      <rect
        x="17"
        y="6"
        width="12"
        height="100"
        rx="6"
        fill="white"
        stroke="#94a3b8"
        strokeWidth="3"
      />
      <circle
        cx="23"
        cy="112"
        r="16"
        fill="white"
        stroke="#94a3b8"
        strokeWidth="3"
      />
      <rect
        x="20"
        y={104 - liquidH}
        width="6"
        height={Math.max(6, liquidH)}
        rx="3"
        fill={color}
      />
      <circle cx="23" cy="112" r="10" fill={color} />
    </svg>
  )
}
