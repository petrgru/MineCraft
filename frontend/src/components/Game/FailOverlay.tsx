/** Time ran out: no text, just the animal and two big picture buttons. */

import { cs } from "@/locales/cs"

export function FailOverlay({
  avatarEmoji,
  level,
  onRetry,
  onNewGame,
}: {
  avatarEmoji: string
  level: number
  onRetry: () => void
  onNewGame: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/75">
      <span className="animate-bounce text-8xl">{avatarEmoji}</span>
      <span className="text-7xl font-black text-white">{level}</span>
      <button
        type="button"
        onClick={onRetry}
        aria-label={cs.aria.retry}
        className="flex size-32 cursor-pointer items-center justify-center rounded-full bg-green-500 text-6xl shadow-2xl transition-transform hover:scale-105"
      >
        🔄
      </button>
      <button
        type="button"
        onClick={onNewGame}
        aria-label={cs.aria.newGame}
        className="flex size-16 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-3xl shadow-xl transition-transform hover:scale-105"
      >
        🌱
      </button>
    </div>
  )
}
