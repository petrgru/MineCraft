/** Room 3: Castle Courtyard — pull 3 golden levers, open the gate, click the chest. */

import { useFrame, useThree } from "@react-three/fiber"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { glowClone } from "../materials"
import { useParticles } from "../particles"
import type { RoomProps } from "../types"
import { ClickHitbox, type Vec3, VoxelField } from "../voxels"

const CHEST_POINTS = 50
const GATE_ANGLE = 1.75
const GATE_OPEN_AT = GATE_ANGLE - 0.3

const LEVERS3: Vec3[] = [
  [-4, -0.5, 2],
  [0, -0.5, 1],
  [4, -0.5, 2],
]
// extra lever for the XL castle level; far enough from the camera at (0,3,6.5)
// so its hitbox stays inside the viewport
const LEVER_EXTRA: Vec3[] = [[-2, -0.5, 0]]
const CHEST_SPOT: Vec3 = [0, -0.5, -10]
const CONFETTI = [0xff5964, 0x3d9bff, 0xffd32a, 0x4cd137, 0x54f2ee, 0xc77dff]

type Gate = "closed" | "opening" | "open"

import { Lever } from "./Lever"

export default function Room3Castle({
  callbacks,
  materials,
  count = 3,
}: RoomProps): ReactNode {
  const leverSpots = useMemo<Vec3[]>(
    () =>
      count <= LEVERS3.length
        ? LEVERS3.slice(0, count)
        : [...LEVERS3, ...LEVER_EXTRA.slice(0, count - LEVERS3.length)],
    [count],
  )
  const [pulled, setPulled] = useState<boolean[]>(() =>
    Array.from({ length: count }, () => false),
  )
  const [gate, setGate] = useState<Gate>("closed")
  const { camera } = useThree()
  const { spawn, layer } = useParticles()
  const leftPivot = useRef<THREE.Group>(null)
  const rightPivot = useRef<THREE.Group>(null)
  const gatePassed = useRef(false)
  const chestDone = useRef(false)
  const chestTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Stand inside the courtyard, below the wall top (y 5.5) and behind the
    // front wall (z 7.5), so the whole yard, gate and chest are in view.
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = 60
    perspective.updateProjectionMatrix()
    camera.position.set(0, 3, 6.5)
    camera.lookAt(0, 1.5, -6)
    return () => window.clearTimeout(chestTimer.current)
  }, [camera])

  const floor = useMemo(() => {
    const cells: Vec3[] = []
    for (let x = -7; x <= 7; x++) {
      for (let z = -7; z <= 7; z++) cells.push([x, -1, z])
    }
    for (let x = -2; x <= 2; x++) {
      for (let z = -11; z <= -9; z++) cells.push([x, -1, z]) // treasure alcove
    }
    return cells
  }, [])

  const walls = useMemo(() => {
    const cells: Vec3[] = []
    for (let y = 0; y <= 5; y++) {
      for (let i = -8; i <= 8; i++) {
        cells.push([-8, y, i], [8, y, i], [i, y, 8])
        const inGateGap = i >= -1 && i <= 1 && y <= 1
        if (!inGateGap) cells.push([i, y, -8])
      }
    }
    return cells
  }, [])

  const goldGlow = useMemo(
    () => glowClone(materials.gold, 0xff9d00, 0.35),
    [materials],
  )
  useEffect(
    () => () => {
      goldGlow.dispose()
    },
    [goldGlow],
  )

  const pullLever = (index: number) => {
    if (pulled[index]) return
    const next = pulled.map((p, i) => (i === index ? true : p))
    setPulled(next)
    callbacks.playSound("pop")
    if (next.every(Boolean))
      setGate((current) => (current === "closed" ? "opening" : current))
  }

  useFrame((_, delta) => {
    const target = gate === "closed" ? 0 : GATE_ANGLE
    if (leftPivot.current) {
      leftPivot.current.rotation.y = THREE.MathUtils.damp(
        leftPivot.current.rotation.y,
        -target,
        3,
        delta,
      )
    }
    if (rightPivot.current) {
      rightPivot.current.rotation.y = THREE.MathUtils.damp(
        rightPivot.current.rotation.y,
        target,
        3,
        delta,
      )
      if (
        gate === "opening" &&
        !gatePassed.current &&
        rightPivot.current.rotation.y > GATE_OPEN_AT
      ) {
        gatePassed.current = true
        setGate("open")
      }
    }
  })

  const openChest = () => {
    if (chestDone.current) return
    chestDone.current = true
    CONFETTI.forEach((color, i) => {
      spawn(
        [
          CHEST_SPOT[0] + (i - 2.5) * 0.7,
          CHEST_SPOT[1] + 1.4 + (i % 2) * 0.6,
          CHEST_SPOT[2] + 0.6,
        ],
        color,
      )
    })
    callbacks.addPoints(CHEST_POINTS)
    callbacks.playSound("win")
    chestTimer.current = window.setTimeout(() => callbacks.completeRoom(), 1300)
  }

  return (
    <>
      <color attach="background" args={["#9fd0ff"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 14, 8]} intensity={1.8} />
      <VoxelField positions={floor} material={materials.stone} />
      <VoxelField positions={walls} material={materials.stone} />
      {leverSpots.map((spot, index) => (
        <Lever
          key={index}
          position={spot}
          pulled={pulled[index]}
          material={goldGlow}
          onPull={() => pullLever(index)}
        />
      ))}
      <group position={[-1.5, 0.65, -8]} ref={leftPivot}>
        <mesh material={materials.wood} position={[0.75, 0, 0]}>
          <boxGeometry args={[1.5, 2.3, 0.3]} />
        </mesh>
      </group>
      <group position={[1.5, 0.65, -8]} ref={rightPivot}>
        <mesh material={materials.wood} position={[-0.75, 0, 0]}>
          <boxGeometry args={[1.5, 2.3, 0.3]} />
        </mesh>
      </group>
      <group position={CHEST_SPOT}>
        <mesh material={materials.wood} position={[0, 0.5, 0]}>
          <boxGeometry args={[1.8, 1, 1.3]} />
        </mesh>
        <mesh material={goldGlow} position={[0, 1.2, 0]}>
          <boxGeometry args={[1.8, 0.4, 1.3]} />
        </mesh>
        {gate === "open" && !chestDone.current && (
          <ClickHitbox position={[0, 0.8, 0]} size={2.8} onClick={openChest} />
        )}
      </group>
      {layer}
    </>
  )
}
