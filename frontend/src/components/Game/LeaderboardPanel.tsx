/** Victory panel: 🎉, total stars, top-10 rows and a giant play-again button. */

import { useQuery } from "@tanstack/react-query"
import { Star } from "lucide-react"
import type { ReactNode } from "react"

import { GameService } from "@/client"
import { type AvatarKey, cs } from "@/locales/cs"
import { AVATAR_EMOJI } from "./avatarEmojis"

function avatarEmoji(avatar: string): string {
  return AVATAR_EMOJI[avatar as AvatarKey] ?? "🎮"
}

export function LeaderboardPanel({
  totalPoints,
  onPlayAgain,
}: {
  totalPoints: number
  onPlayAgain: () => void
}): ReactNode {
  const { data, isError } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => GameService.readLeaderboard(),
  })
  const scores = data?.data.scores ?? []

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-sky-100/95 p-6">
      <span className="text-8xl">🎉</span>
      <div className="flex items-center gap-2 rounded-full bg-white px-6 py-2 shadow-lg">
        <Star className="size-9 fill-yellow-400 text-yellow-500" />
        <span
          className="text-4xl font-black tabular-nums text-slate-800"
          role="img"
          aria-label={cs.aria.score}
        >
          {totalPoints}
        </span>
      </div>
      {!isError && scores.length > 0 && (
        <ol className="w-full max-w-xl space-y-2">
          {scores.map((score, position) => (
            <li
              key={score.id}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 shadow-lg"
            >
              <span className="text-4xl">{avatarEmoji(score.avatar)}</span>
              <span className="flex-1 truncate text-2xl font-bold text-slate-700">
                {score.player_name}
              </span>
              {position < 3 && (
                <Star className="size-8 shrink-0 fill-yellow-400 text-yellow-500" />
              )}
              <span className="text-3xl font-black tabular-nums text-slate-800">
                {score.points}
              </span>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={onPlayAgain}
        aria-label={cs.aria.playAgain}
        className="mt-2 flex size-28 cursor-pointer items-center justify-center rounded-full bg-green-500 text-6xl shadow-2xl transition-transform hover:scale-105"
      >
        🔄
      </button>
    </div>
  )
}
