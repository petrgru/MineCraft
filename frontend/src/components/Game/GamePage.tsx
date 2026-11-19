/**
 * Game page state machine: kid login -> (resume prompt if a level was
 * saved) -> 8 levels with HUD -> score save -> leaderboard. Progress is
 * mirrored to the backend and to localStorage so the kid always returns to
 * the level they last failed.
 */

import { useMutation } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

import { GameService } from "@/client"
import { TOTAL_LEVELS } from "@/game/levels"
import VoxelGame from "@/game/VoxelGame"
import type { AvatarKey } from "@/locales/cs"
import { AVATAR_EMOJI } from "./avatarEmojis"
import { Hud } from "./Hud"
import { KidLogin } from "./KidLogin"
import { LeaderboardPanel } from "./LeaderboardPanel"
import { ResumePanel } from "./ResumePanel"

const STORAGE_KEY = "voxel_progress"

interface Progress {
  current_level: number
  total_points: number
  is_finished: boolean
}

const FRESH: Progress = {
  current_level: 1,
  total_points: 0,
  is_finished: false,
}

async function loadProgress(): Promise<Progress> {
  try {
    const response = await GameService.readProgress()
    return response.data
  } catch {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved) as Progress
    } catch {
      // corrupted mirror: fall through to the fresh state
    }
    return FRESH
  }
}

function persist(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  GameService.saveProgress({ body: progress }).catch(() => {
    // offline: the localStorage mirror above keeps the kid unblocked
  })
}

type Phase = "login" | "resume" | "play" | "done"

export function GamePage(): ReactNode {
  const [phase, setPhase] = useState<Phase>("login")
  const [avatar, setAvatar] = useState<AvatarKey>("lion")
  const [points, setPoints] = useState(0)
  const [level, setLevel] = useState(1)
  const [fraction, setFraction] = useState<number | null>(null)
  const [startLevel, setStartLevel] = useState(1)
  const [startBank, setStartBank] = useState(0)
  const [runId, setRunId] = useState(0)
  const [saved, setSaved] = useState<Progress>(FRESH)
  const [finalPoints, setFinalPoints] = useState(0)

  const saveScore = useMutation({
    mutationFn: (body: { points: number }) =>
      GameService.saveScore({
        body: { ...body, avatar, completed_levels: TOTAL_LEVELS },
      }),
    onSettled: (_data, _error, variables) => {
      persist({
        current_level: TOTAL_LEVELS,
        total_points: variables.points,
        is_finished: true,
      })
      setPhase("done")
    },
  })

  const startRun = (lvl: number, bank: number) => {
    setStartLevel(lvl)
    setStartBank(bank)
    setLevel(lvl)
    setPoints(bank)
    setFraction(null)
    setRunId((id) => id + 1)
    setPhase("play")
  }

  const started = async (picked: AvatarKey) => {
    setAvatar(picked)
    const progress = await loadProgress()
    setSaved(progress)
    if (progress.current_level > 1 && !progress.is_finished) {
      setPhase("resume")
    } else {
      startRun(1, 0)
    }
  }

  const handleLevelCompleted = (nextLevel: number, total: number) => {
    persist({
      current_level: nextLevel,
      total_points: total,
      is_finished: false,
    })
  }

  const handleLevelFailed = (failedLevel: number, total: number) => {
    persist({
      current_level: failedLevel,
      total_points: total,
      is_finished: false,
    })
  }

  const handleFinished = (total: number) => {
    setFinalPoints(total)
    saveScore.mutate({ points: total })
  }

  const newGame = () => {
    persist(FRESH)
    startRun(1, 0)
  }

  if (phase === "login") {
    return <KidLogin onStarted={started} />
  }

  if (phase === "resume") {
    return (
      <ResumePanel
        avatarEmoji={AVATAR_EMOJI[avatar]}
        level={saved.current_level}
        onContinue={() => startRun(saved.current_level, saved.total_points)}
        onNewGame={newGame}
      />
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* key remounts the canvas so every run starts from a clean state */}
      <VoxelGame
        key={runId}
        avatarEmoji={AVATAR_EMOJI[avatar]}
        startLevel={startLevel}
        initialPoints={startBank}
        onPointsChange={setPoints}
        onLevelChange={setLevel}
        onTimeChange={setFraction}
        onLevelCompleted={handleLevelCompleted}
        onLevelFailed={handleLevelFailed}
        onFinished={handleFinished}
        onNewGame={() => persist(FRESH)}
      />
      {phase === "play" && (
        <Hud points={points} level={level} fraction={fraction} />
      )}
      {phase === "done" && (
        <LeaderboardPanel totalPoints={finalPoints} onPlayAgain={newGame} />
      )}
    </div>
  )
}
