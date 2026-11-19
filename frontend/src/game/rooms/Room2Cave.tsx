/** Room 2: Crystal Cave — click 5 sparkling diamonds in the dark stone walls. */

import { useFrame, useThree } from "@react-three/fiber"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import type * as THREE from "three"
import { glowClone } from "../materials"
import { useParticles } from "../particles"
import type { RoomProps } from "../types"
import { ClickHitbox, type Vec3, VoxelField } from "../voxels"

const POINTS_PER_DIAMOND = 20

const SPOTS5: Vec3[] = [
  [-6, 1, -2],
  [6, 1, -2],
  [0, 1, -6],
  [-3, 2, -6],
  [3, 1, -6],
]
// extra cells used by the XL level, placed on the forward half of the walls
const SPOTS_EXTRA: Vec3[] = [
  [-6, 2, -4],
  [6, 2, -4],
  [-2, 2, -6],
]
const TORCH_SPOTS: Vec3[] = [
  [-6.2, 2, -5],
  [-6.2, 2, 5],
  [6.2, 2, -5],
  [6.2, 2, 5],
]

function Diamond({
  position,
  material,
  onMine,
}: {
  position: Vec3
  material: THREE.Material
  onMine: () => void
}): ReactNode {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!mesh.current) return
    const time = state.clock.elapsedTime
    mesh.current.rotation.y = time * 0.9
    const pulse = 1 + Math.sin(time * 4 + position[0] + position[2]) * 0.12
    mesh.current.scale.setScalar(pulse * 1.25) // extra big for small hands
  })
  return (
    <>
      <mesh
        ref={mesh}
        material={material}
        position={position}
        rotation={[0.6, 0.4, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <ClickHitbox position={position} size={2.6} onClick={onMine} />
    </>
  )
}

export default function Room2Cave({
  callbacks,
  materials,
  count = 5,
}: RoomProps): ReactNode {
  const { camera } = useThree()
  const { spawn, layer } = useParticles()

  const spots = useMemo<Vec3[]>(
    () =>
      count <= SPOTS5.length
        ? SPOTS5.slice(0, count)
        : [...SPOTS5, ...SPOTS_EXTRA.slice(0, count - SPOTS5.length)],
    [count],
  )
  const [missing, setMissing] = useState<boolean[]>(() =>
    Array.from({ length: count }, () => false),
  )

  useEffect(() => {
    // Camera must stand INSIDE the room (air gap at x,z -6..6 / y -0.5..3.5).
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = 60
    perspective.updateProjectionMatrix()
    camera.position.set(0, 2.2, 5.5)
    camera.lookAt(0, 1, -3.5)
  }, [camera])

  const floor = useMemo(() => {
    const cells: Vec3[] = []
    for (let x = -6; x <= 6; x++) {
      for (let z = -6; z <= 6; z++) cells.push([x, -1, z])
    }
    return cells
  }, [])

  const walls = useMemo(() => {
    const cells: Vec3[] = []
    for (let y = 0; y <= 3; y++) {
      for (let i = -7; i <= 7; i++) {
        cells.push([-7, y, i], [7, y, i], [i, y, -7], [i, y, 7])
      }
    }
    for (let x = -7; x <= 7; x++) {
      for (let z = -7; z <= 7; z++) cells.push([x, 4, z])
    }
    return cells
  }, [])

  const diamondMat = useMemo(
    () => glowClone(materials.diamond, 0x19d3c5, 0.7),
    [materials],
  )
  const torchMat = useMemo(
    () => glowClone(materials.gold, 0xff8c1a, 0.9),
    [materials],
  )
  useEffect(
    () => () => {
      diamondMat.dispose()
      torchMat.dispose()
    },
    [diamondMat, torchMat],
  )

  const mine = (index: number) => {
    if (missing[index]) return
    setMissing((prev) => prev.map((m, i) => (i === index ? true : m)))
    spawn(spots[index], 0x54f2ee)
    callbacks.addPoints(POINTS_PER_DIAMOND)
    callbacks.playSound("pop")
  }

  useEffect(() => {
    if (!missing.every(Boolean)) return
    const timer = window.setTimeout(() => callbacks.completeRoom(), 700)
    return () => window.clearTimeout(timer)
  }, [missing, callbacks])

  return (
    <>
      <color attach="background" args={["#0a0c16"]} />
      <fog attach="fog" args={["#0a0c16", 9, 26]} />
      <ambientLight intensity={0.3} color="#8899ff" />
      {TORCH_SPOTS.map((spot, index) => (
        <group key={index}>
          <mesh material={torchMat} position={spot}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          </mesh>
          <pointLight
            position={[spot[0] * 0.85, spot[1] + 0.4, spot[2] * 0.85]}
            color={0xffb45e}
            intensity={30}
            distance={18}
            decay={2}
          />
        </group>
      ))}
      <VoxelField positions={floor} material={materials.stone} />
      <VoxelField positions={walls} material={materials.stone} />
      {spots.map(
        (spot, index) =>
          !missing[index] && (
            <Diamond
              key={index}
              position={spot}
              material={diamondMat}
              onMine={() => mine(index)}
            />
          ),
      )}
      {layer}
    </>
  )
}
