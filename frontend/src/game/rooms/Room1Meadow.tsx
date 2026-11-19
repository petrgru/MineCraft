/** Room 1: Sunny Meadow — click the glowing wool blocks to bridge the river.
 * Variants: count 6 = wider river (level 4), order = colour sequence (level 7).
 */

import { useFrame, useThree } from "@react-three/fiber"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { glowClone, type MaterialKey } from "../materials"
import { useParticles } from "../particles"
import type { RoomProps } from "../types"
import { ClickHitbox, easeInOut, type Vec3, VoxelField } from "../voxels"

const POINTS_PER_BLOCK = 10
const FLY_TIME = 0.6

const PATTERN: { key: MaterialKey; emissive: number; burst: number }[] = [
  { key: "wool_red", emissive: 0xaa1020, burst: 0xff5964 },
  { key: "wool_blue", emissive: 0x1030aa, burst: 0x3d9bff },
  { key: "wool_yellow", emissive: 0xaa7a00, burst: 0xffd32a },
]

/** Up to 6 blocks bridge a one-cell river, more bridge a two-cell river. */
function bridgeSlots(count: number): Vec3[] {
  return Array.from({ length: count }, (_, i) =>
    count <= 6
      ? ([2 + i, -0.6, 0] as Vec3)
      : ([2 + (i % 4), -0.6, Math.floor(i / 4)] as Vec3),
  )
}

/** Hover spots in rows of four in front of the player. */
function waitSpots(count: number): Vec3[] {
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 4)
    const col = i % 4
    return [-6 + col * 2.5 + row * 1.2, 1.7, -4 - row * 2] as Vec3
  })
}

type Phase = "waiting" | "flying" | "landed"

function WoolBlock({
  index,
  phase,
  glowing,
  wait,
  slot,
  glow,
  dim,
  onStart,
  onArrive,
}: {
  index: number
  phase: Phase
  /** false in order mode until this block is the next in the sequence */
  glowing: boolean
  wait: Vec3
  slot: Vec3
  glow: THREE.Material
  dim: THREE.Material
  onStart: (index: number) => void
  onArrive: (index: number) => void
}): ReactNode {
  const mesh = useRef<THREE.Mesh>(null)
  const progress = useRef(0)
  const arrived = useRef(false)

  useFrame((state, delta) => {
    const block = mesh.current
    if (!block) return
    const time = state.clock.elapsedTime
    if (phase === "waiting") {
      block.position.set(
        wait[0],
        wait[1] + Math.sin(time * 2 + index) * 0.18,
        wait[2],
      )
      block.rotation.y = time * 0.7
      block.scale.setScalar(glowing ? 1.2 + Math.sin(time * 5) * 0.12 : 1)
    } else if (phase === "flying") {
      progress.current = Math.min(1, progress.current + delta / FLY_TIME)
      const e = easeInOut(progress.current)
      block.position.set(
        THREE.MathUtils.lerp(wait[0], slot[0], e),
        THREE.MathUtils.lerp(wait[1], slot[1], e) + Math.sin(e * Math.PI) * 1.8,
        THREE.MathUtils.lerp(wait[2], slot[2], e),
      )
      block.rotation.y = time * 8 * (1 - e)
      block.scale.setScalar(1)
      if (progress.current >= 1 && !arrived.current) {
        arrived.current = true
        onArrive(index)
      }
    } else {
      block.position.set(slot[0], slot[1], slot[2])
      block.rotation.set(0, 0, 0)
      block.scale.setScalar(1)
    }
  })

  return (
    <>
      <mesh ref={mesh} material={glowing ? glow : dim}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      {phase === "waiting" && glowing && (
        <ClickHitbox position={wait} onClick={() => onStart(index)} />
      )}
    </>
  )
}

export default function Room1Meadow({
  callbacks,
  materials,
  count = 4,
  order = false,
}: RoomProps): ReactNode {
  const [phases, setPhases] = useState<Phase[]>(() =>
    Array.from({ length: count }, () => "waiting" as Phase),
  )
  const { camera } = useThree()
  const { spawn, layer } = useParticles()

  const slots = useMemo(() => bridgeSlots(count), [count])
  const waits = useMemo(() => waitSpots(count), [count])

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = 50
    perspective.updateProjectionMatrix()
    camera.position.set(0, 8, 12)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const ground = useMemo(() => {
    const blocked = new Set(slots.map(([x, , z]) => `${x}:${z}`))
    const cells: Vec3[] = []
    for (let x = -9; x <= 9; x++) {
      for (let z = -6; z <= 6; z++) {
        if (blocked.has(`${x}:${z}`)) continue
        cells.push([x, -1, z])
      }
    }
    return cells
  }, [slots])

  const river = useMemo<Vec3[]>(
    () => slots.map(([x, , z]) => [x, -1.2, z] as Vec3),
    [slots],
  )

  const waterMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0x2f9bff }),
    [],
  )
  const mats = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const wool = PATTERN[i % PATTERN.length]
        return {
          glow: glowClone(materials[wool.key], wool.emissive, 0.4),
          dim: materials[wool.key].clone(),
        }
      }),
    [materials, count],
  )
  useEffect(
    () => () => {
      waterMat.dispose()
      mats.forEach((m) => {
        m.glow.dispose()
        m.dim.dispose()
      })
    },
    [waterMat, mats],
  )

  const start = (index: number) => {
    if (order && phases.indexOf("waiting") !== index) return
    setPhases((prev) =>
      prev[index] === "waiting"
        ? prev.map((p, i) => (i === index ? "flying" : p))
        : prev,
    )
  }

  const arrive = (index: number) => {
    setPhases((prev) => prev.map((p, i) => (i === index ? "landed" : p)))
    spawn(slots[index], PATTERN[index % PATTERN.length].burst)
    callbacks.addPoints(POINTS_PER_BLOCK)
    callbacks.playSound("pop")
  }

  useEffect(() => {
    if (!phases.every((phase) => phase === "landed")) return
    const timer = window.setTimeout(() => callbacks.completeRoom(), 700)
    return () => window.clearTimeout(timer)
  }, [phases, callbacks])

  return (
    <>
      <color attach="background" args={["#8fd7ff"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} />
      <VoxelField positions={ground} material={materials.grass} />
      <VoxelField positions={river} material={waterMat} />
      {phases.map((phase, index) => (
        <WoolBlock
          key={index}
          index={index}
          phase={phase}
          glowing={!order || phases.indexOf("waiting") === index}
          wait={waits[index]}
          slot={slots[index]}
          glow={mats[index].glow}
          dim={mats[index].dim}
          onStart={start}
          onArrive={arrive}
        />
      ))}
      {layer}
    </>
  )
}
