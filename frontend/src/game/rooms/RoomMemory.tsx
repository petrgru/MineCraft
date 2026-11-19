/** Room 7/11: Colour Echo — the top strip flashes the whole colour order for
 * one second, then the kid taps the pads in that very order from memory.
 */

import { useFrame, useThree } from "@react-three/fiber"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as THREE from "three"
import { glowClone, type MaterialKey } from "../materials"
import { useParticles } from "../particles"
import type { RoomProps } from "../types"
import { ClickHitbox, type Vec3, VoxelField } from "../voxels"

const POINTS_PER_STEP = 20
const SHOW_MS = 1000
const PAD_X = [-4.5, -1.5, 1.5, 4.5]
const PAD_Z = -4

const COLOURS: { key: MaterialKey; emissive: number; burst: number }[] = [
  { key: "wool_red", emissive: 0xaa1020, burst: 0xff5964 },
  { key: "wool_blue", emissive: 0x1030aa, burst: 0x3d9bff },
  { key: "wool_yellow", emissive: 0xaa7a00, burst: 0xffd32a },
  { key: "grass", emissive: 0x1e7a10, burst: 0x4cd137 },
]

type Phase = "show" | "input" | "won"

function Pad({
  colour,
  position,
  material,
  solved,
  wrongAt,
  pulseAt,
  onTap,
}: {
  colour: number
  position: Vec3
  material: THREE.Material
  solved: boolean
  wrongAt: React.MutableRefObject<number>
  pulseAt: React.MutableRefObject<number>
  onTap: (colour: number) => void
}): ReactNode {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!group.current) return
    const time = state.clock.elapsedTime
    const since = performance.now() - wrongAt.current
    const shake =
      since < 600 ? Math.sin(since * 0.05) * 0.2 * Math.exp(-since / 250) : 0
    const sincePulse = performance.now() - pulseAt.current
    const pulse = sincePulse < 700 ? 0.25 * Math.exp(-sincePulse / 220) : 0
    group.current.rotation.z = shake
    group.current.position.y =
      position[1] + (solved ? 0.25 + Math.sin(time * 4) * 0.08 : 0)
    group.current.scale.setScalar((solved ? 1.15 : 1) + pulse)
  })
  return (
    <>
      <group ref={group} position={position}>
        <mesh material={material}>
          <boxGeometry args={[1.8, 0.8, 1.8]} />
        </mesh>
      </group>
      <ClickHitbox
        position={[position[0], position[1] + 0.4, position[2]]}
        size={2.6}
        onClick={() => onTap(colour)}
      />
    </>
  )
}

export default function RoomMemory({
  callbacks,
  materials,
  count = 3,
  onOverlay,
  onPause,
}: RoomProps): ReactNode {
  const [phase, setPhase] = useState<Phase>("show")
  const [progress, setProgress] = useState(0)
  const wrongAt = useRef(0)
  const pulseAt = useRef(0)
  const wonTimer = useRef<number | undefined>(undefined)
  const { camera } = useThree()
  const { spawn, layer } = useParticles()

  const sequence = useMemo(
    () =>
      Array.from({ length: count }, () =>
        Math.floor(Math.random() * COLOURS.length),
      ),
    [count],
  )

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = 55
    perspective.updateProjectionMatrix()
    camera.position.set(0, 3, 7)
    camera.lookAt(0, 0.8, -4)
    return () => window.clearTimeout(wonTimer.current)
  }, [camera])

  // drive the DOM demo strip + freeze the countdown while demonstrating
  useEffect(() => {
    if (phase === "show") {
      onOverlay?.({ sequence })
      onPause?.(true)
    } else {
      onOverlay?.(null)
      onPause?.(false)
    }
  }, [phase, sequence, onOverlay, onPause])
  useEffect(
    () => () => {
      onOverlay?.(null)
      onPause?.(false)
    },
    [onOverlay, onPause],
  )

  // the whole order flashes for one second, then a pop says "your turn"
  useEffect(() => {
    if (phase !== "show") return
    const timer = window.setTimeout(() => {
      pulseAt.current = performance.now()
      callbacks.playSound("pop")
      setPhase("input")
    }, SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [phase, callbacks])

  const tap = useCallback(
    (colour: number) => {
      if (phase !== "input") return
      if (colour !== sequence[progress]) {
        wrongAt.current = performance.now()
        setProgress(0)
        setPhase("show")
        return
      }
      spawn([PAD_X[colour], 1, PAD_Z], COLOURS[colour].burst)
      callbacks.addPoints(POINTS_PER_STEP)
      callbacks.playSound("pop")
      const next = progress + 1
      setProgress(next)
      if (next === sequence.length) {
        setPhase("won")
        wonTimer.current = window.setTimeout(
          () => callbacks.completeRoom(),
          700,
        )
      }
    },
    [phase, progress, sequence, spawn, callbacks],
  )

  const floor = useMemo(() => {
    const cells: Vec3[] = []
    for (let x = -7; x <= 7; x++) {
      for (let z = -7; z <= 5; z++) cells.push([x, -1, z])
    }
    return cells
  }, [])

  const mats = useMemo(
    () => COLOURS.map((c) => glowClone(materials[c.key], c.emissive, 0.45)),
    [materials],
  )
  const greyMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0x9aa4b2 }),
    [],
  )
  useEffect(
    () => () => {
      for (const m of mats) m.dispose()
    },
    [mats],
  )
  useEffect(
    () => () => {
      greyMat.dispose()
    },
    [greyMat],
  )

  return (
    <>
      <color attach="background" args={["#ffeaf4"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 10, 8]} intensity={1.4} />
      <VoxelField positions={floor} material={materials.grass} />
      {COLOURS.map((_, colour) => (
        <Pad
          key={colour}
          colour={colour}
          position={[PAD_X[colour], 0.5, PAD_Z]}
          material={phase === "show" ? greyMat : mats[colour]}
          solved={
            phase === "input" && sequence.slice(0, progress).includes(colour)
          }
          wrongAt={wrongAt}
          pulseAt={pulseAt}
          onTap={tap}
        />
      ))}
      {layer}
    </>
  )
}
