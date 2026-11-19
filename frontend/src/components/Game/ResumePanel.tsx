/** Returning player: big PLAY resumes the saved level, sprout starts fresh. */

import { cs } from "@/locales/cs"

export function ResumePanel({
  avatarEmoji,
  level,
  onContinue,
  onNewGame,
}: {
  avatarEmoji: string
  level: number
  onContinue: () => void
  onNewGame: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-sky-100 p-6">
      <span className="text-9xl">{avatarEmoji}</span>
      <span className="text-8xl font-black text-sky-700">{level}</span>
      <button
        type="button"
        onClick={onContinue}
        aria-label={cs.aria.continueGame}
        className="flex h-32 w-72 cursor-pointer items-center justify-center rounded-full bg-green-500 text-7xl shadow-2xl transition-transform hover:scale-105"
      >
        ▶️
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
