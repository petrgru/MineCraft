/**
 * Level manager: one 3D canvas, 8 levels in 4 room types, smooth fade
 * between them, the countdown thermometer and the picture-only fail overlay.
 */

import { Canvas } from "@react-three/fiber"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { FailOverlay } from "@/components/Game/FailOverlay"
import { MemoryStrip } from "@/components/Game/MemoryStrip"
import { playSound } from "./audio"
import { LEVELS } from "./levels"
import { loadMaterials, type Materials } from "./materials"
import Room1Meadow from "./rooms/Room1Meadow"
import Room2Cave from "./rooms/Room2Cave"
import Room3Castle from "./rooms/Room3Castle"
import Room8Space from "./rooms/Room8Space"
import RoomCannon from "./rooms/RoomCannon"
import RoomMemory from "./rooms/RoomMemory"
import type { MemoryOverlayState } from "./types"
import { useCountdown } from "./useTimer"

export interface VoxelGameProps {
  avatarEmoji: string
  startLevel: number
  initialPoints: number
  onPointsChange?: (total: number) => void
  onLevelChange?: (level: number) => void
  onTimeChange?: (fraction: number | null) => void
  /** a level was beaten: persist (nextLevel, total) */
  onLevelCompleted?: (nextLevel: number, total: number) => void
  /** the thermometer ran out: persist (level, rolledBackTotal) */
  onLevelFailed?: (level: number, rolledBackTotal: number) => void
  onFinished: (total: number) => void
  /** the sprout button on the fail overlay: caller clears the saved progress */
  onNewGame: () => void
}

const FADE_MS = 450

export default function VoxelGame({
  avatarEmoji,
  startLevel,
  initialPoints,
  onPointsChange,
  onLevelChange,
  onTimeChange,
  onLevelCompleted,
  onLevelFailed,
  onFinished,
  onNewGame,
}: VoxelGameProps): ReactNode {
  const [materials, setMaterials] = useState<Materials | null>(null)
  const [level, setLevel] = useState(startLevel)
  const [attempt, setAttempt] = useState(0)
  const [dim, setDim] = useState(false)
  const [failed, setFailed] = useState(false)
  const [done, setDone] = useState(false)
  const [roomOverlay, setRoomOverlay] = useState<MemoryOverlayState | null>(
    null,
  )
  const [demoPaused, setDemoPaused] = useState(false)
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(
    null,
  )
  const points = useRef(initialPoints)
  const levelStart = useRef(initialPoints)
  const levelRef = useRef(startLevel)
  const fracRef = useRef(1)
  const timer = useRef<number | undefined>(undefined)
  const onPointsChangeRef = useRef(onPointsChange)
  const onLevelChangeRef = useRef(onLevelChange)
  const onTimeChangeRef = useRef(onTimeChange)
  const onLevelCompletedRef = useRef(onLevelCompleted)
  const onLevelFailedRef = useRef(onLevelFailed)
  const onFinishedRef = useRef(onFinished)
  const onNewGameRef = useRef(onNewGame)

  useEffect(() => {
    onPointsChangeRef.current = onPointsChange
    onLevelChangeRef.current = onLevelChange
    onTimeChangeRef.current = onTimeChange
    onLevelCompletedRef.current = onLevelCompleted
    onLevelFailedRef.current = onLevelFailed
    onFinishedRef.current = onFinished
    onNewGameRef.current = onNewGame
  })

  useEffect(() => {
    let active = true
    loadMaterials().then((loaded) => {
      if (active) setMaterials(loaded)
    })
    return () => {
      active = false
      window.clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    levelRef.current = level
    onLevelChangeRef.current?.(level)
  }, [level])

  const config = LEVELS[level - 1]

  const addPoints = useCallback((value: number) => {
    points.current += value
    onPointsChangeRef.current?.(points.current)
  }, [])

  const expire = useCallback(() => {
    if (done) return
    points.current = levelStart.current
    onPointsChangeRef.current?.(points.current)
    setFailed(true)
    onLevelFailedRef.current?.(levelRef.current, points.current)
  }, [done])

  const remaining = useCountdown(
    config.timeLimit ?? null,
    !dim && !failed && !done && !demoPaused,
    level * 1000 + attempt,
    expire,
  )

  useEffect(() => {
    if (!config.timeLimit) {
      fracRef.current = 1
      onTimeChangeRef.current?.(null)
      return
    }
    const frac = remaining === null ? 1 : remaining / config.timeLimit
    fracRef.current = frac
    onTimeChangeRef.current?.(frac)
  }, [remaining, config.timeLimit])

  const completeRoom = useCallback(() => {
    setDim(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const lvl = levelRef.current
      const cfg = LEVELS[lvl - 1]
      // timed levels pay proportionally to the time still left on the clock
      if (cfg.timeLimit) {
        const earned = points.current - levelStart.current
        const scaled =
          levelStart.current + Math.round((earned * fracRef.current) / 5) * 5
        const cut = scaled - points.current
        if (cut !== 0) {
          points.current = scaled
          onPointsChangeRef.current?.(scaled)
          setDelta({ value: cut, key: Date.now() })
        }
      }
      if (lvl < LEVELS.length) {
        levelStart.current = points.current
        onLevelCompletedRef.current?.(lvl + 1, points.current)
        setLevel((current) => current + 1)
        setDim(false)
        return
      }
      setDone(true)
      setDim(false)
      onFinishedRef.current(points.current)
    }, FADE_MS)
  }, [])

  const callbacks = useMemo(
    () => ({ addPoints, playSound, completeRoom }),
    [addPoints, completeRoom],
  )

  const handleOverlay = useCallback((state: MemoryOverlayState | null) => {
    setRoomOverlay(state)
  }, [])
  const handlePause = useCallback(
    (paused: boolean) => setDemoPaused(paused),
    [],
  )

  useEffect(() => {
    if (!delta) return
    const t = window.setTimeout(() => setDelta(null), 1600)
    return () => window.clearTimeout(t)
  }, [delta])

  const retry = () => {
    setFailed(false)
    setAttempt((a) => a + 1)
  }

  const startFresh = () => {
    onNewGameRef.current()
    points.current = 0
    levelStart.current = 0
    setFailed(false)
    setLevel(1)
    setAttempt((a) => a + 1)
    onPointsChangeRef.current?.(0)
  }

  if (!materials) {
    // No text here on purpose: the player cannot read yet.
    return (
      <div
        aria-busy="true"
        className="h-full w-full animate-pulse bg-sky-200"
      />
    )
  }

  const roomKey = `${level}-${attempt}`
  return (
    <div className="relative h-full w-full">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 8, 13], fov: 50 }}>
        {config.kind === "meadow" && (
          <Room1Meadow
            key={roomKey}
            materials={materials}
            callbacks={callbacks}
            count={config.count}
            order={config.order}
          />
        )}
        {config.kind === "cave" && (
          <Room2Cave
            key={roomKey}
            materials={materials}
            callbacks={callbacks}
            count={config.count}
          />
        )}
        {config.kind === "castle" && (
          <Room3Castle
            key={roomKey}
            materials={materials}
            callbacks={callbacks}
            count={config.count}
          />
        )}
        {config.kind === "cannon" && (
          <RoomCannon
            key={roomKey}
            materials={materials}
            callbacks={callbacks}
            count={config.count}
            pins={config.pins}
          />
        )}
        {config.kind === "memory" && (
          <RoomMemory
            key={roomKey}
            materials={materials}
            callbacks={callbacks}
            count={config.count}
            onOverlay={handleOverlay}
            onPause={handlePause}
          />
        )}
        {config.kind === "space" && (
          <Room8Space
            key={roomKey}
            materials={materials}
            callbacks={callbacks}
            count={config.count}
          />
        )}
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 bg-black transition-opacity"
        style={{
          opacity: dim ? 1 : 0,
          transitionDuration: `${FADE_MS}ms`,
        }}
      />
      {roomOverlay && <MemoryStrip sequence={roomOverlay.sequence} />}
      {delta && (
        <div
          key={delta.key}
          className="absolute left-1/2 top-32 z-10 -translate-x-1/2 animate-bounce rounded-full bg-white/90 px-5 py-1 text-4xl font-black text-red-500 shadow-xl"
        >
          {"−"}
          {Math.abs(delta.value)}
        </div>
      )}
      {failed && (
        <FailOverlay
          avatarEmoji={avatarEmoji}
          level={level}
          onRetry={retry}
          onNewGame={startFresh}
        />
      )}
    </div>
  )
}
