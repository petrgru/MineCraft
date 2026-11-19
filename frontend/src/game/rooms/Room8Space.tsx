/** Room 8: Space port — click 6 glowing stars, then press the big launch button. */

import { useFrame, useThree } from "@react-three/fiber"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { glowClone } from "../materials"
import { useParticles } from "../particles"
import type { RoomProps } from "../types"
import { ClickHitbox, easeInOut, type Vec3, VoxelField } from "../voxels"

const POINTS_PER_STAR = 15
const ROCKET_POINTS = 100

const STAR_SPOTS: Vec3[] = [
  [-4, 1.8, 1],
  [-2.5, 2.6, -4],
  [0, 2.2, 3],
  [2.5, 2.8, -3],
  [4, 1.6, 0],
  [0, 1.6, -5],
]
const BUTTON_SPOT: Vec3 = [3, -0.25, 2]
const CONFETTI = [0xff5964, 0x3d9bff, 0xffd32a, 0x4cd137, 0x54f2ee, 0xc77dff]

function Star({
  position,
  material,
  onCollect,
}: {
  position: Vec3
  material: THREE.Material
  onCollect: () => void
}): ReactNode {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.rotation.y = state.clock.elapsedTime
    mesh.current.scale.setScalar(
      1 + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.15,
    )
  })
  return (
    <>
      <mesh ref={mesh} material={material} position={position}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
      </mesh>
      {/* 1.6 instead of the default 2.4: the stars look along crossing rays, */}
      {/* oversized boxes would overlap and "steal" each other's clicks. */}
      <ClickHitbox position={position} size={1.6} onClick={onCollect} />
    </>
  )
}

export default function Room8Space({
  callbacks,
  materials,
  count = 6,
}: RoomProps): ReactNode {
  const spots = useMemo(() => STAR_SPOTS.slice(0, count), [count])
  const [collected, setCollected] = useState<boolean[]>(() =>
    Array.from({ length: count }, () => false),
  )
  const [allStars, setAllStars] = useState(false)
  const [launched, setLaunched] = useState(false)
  const rocket = useRef<THREE.Group>(null)
  const launchT = useRef(0)
  const launching = useRef(false)
  const launchTimer = useRef<number | undefined>(undefined)
  const { camera } = useThree()
  const { spawn, layer } = useParticles()

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = 55
    perspective.updateProjectionMatrix()
    camera.position.set(0, 3.2, 10)
    camera.lookAt(0, 2, -1)
    return () => window.clearTimeout(launchTimer.current)
  }, [camera])

  const floor = useMemo(() => {
    const cells: Vec3[] = []
    for (let x = -7; x <= 7; x++) {
      for (let z = -7; z <= 7; z++) cells.push([x, -1, z])
    }
    return cells
  }, [])

  const starMat = useMemo(
    () => glowClone(materials.gold, 0xffcf33, 1),
    [materials],
  )
  const buttonMat = useMemo(
    () => glowClone(materials.wool_red, 0xff2222, 0.8),
    [materials],
  )
  const noseMat = useMemo(
    () => glowClone(materials.wool_red, 0x7a0000, 0.25),
    [materials],
  )
  const bodyMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0xbfc7d4 }),
    [],
  )
  useEffect(
    () => () => {
      starMat.dispose()
      buttonMat.dispose()
      noseMat.dispose()
      bodyMat.dispose()
    },
    [starMat, buttonMat, noseMat, bodyMat],
  )

  const collect = (index: number) => {
    if (collected[index]) return
    const next = collected.map((c, i) => (i === index ? true : c))
    setCollected(next)
    spawn(spots[index], 0xffd32a)
    callbacks.addPoints(POINTS_PER_STAR)
    callbacks.playSound("pop")
    if (next.every(Boolean)) setAllStars(true)
  }

  const launch = () => {
    if (launching.current) return
    launching.current = true
    setLaunched(true)
    callbacks.addPoints(ROCKET_POINTS)
    callbacks.playSound("win")
    CONFETTI.forEach((color, i) => {
      spawn([(i - 2.5) * 0.5, 0.2, -1.5 + (i % 2) * 0.7], color)
    })
    launchTimer.current = window.setTimeout(
      () => callbacks.completeRoom(),
      1900,
    )
  }

  useFrame((_, delta) => {
    if (!launched || !rocket.current) return
    launchT.current = Math.min(1, launchT.current + delta / 1.7)
    const t = easeInOut(launchT.current)
    rocket.current.position.y = -0.5 + t * 55
    rocket.current.position.x = Math.sin(launchT.current * 12) * 0.15 * (1 - t)
  })

  return (
    <>
      <color attach="background" args={["#04050d"]} />
      <ambientLight intensity={0.35} color="#aabaff" />
      <directionalLight position={[5, 12, 6]} intensity={0.8} />
      <VoxelField positions={floor} material={materials.stone} />
      <group ref={rocket} position={[0, -0.5, -2]}>
        <mesh material={bodyMat} position={[0, 2.2, 0]}>
          <boxGeometry args={[1.6, 3.4, 1.6]} />
        </mesh>
        <mesh material={noseMat} position={[0, 4.4, 0]} rotation={[0, 0.78, 0]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
        </mesh>
        <mesh material={materials.wood} position={[0.95, 0.4, 0]}>
          <boxGeometry args={[0.4, 0.9, 1.2]} />
        </mesh>
        <mesh material={materials.wood} position={[-0.95, 0.4, 0]}>
          <boxGeometry args={[0.4, 0.9, 1.2]} />
        </mesh>
      </group>
      {spots.map(
        (spot, index) =>
          !collected[index] && (
            <Star
              key={index}
              position={spot}
              material={starMat}
              onCollect={() => collect(index)}
            />
          ),
      )}
      {allStars && !launched && (
        <group position={BUTTON_SPOT}>
          <mesh material={buttonMat}>
            <cylinderGeometry args={[0.7, 0.8, 0.5, 16]} />
          </mesh>
          <ClickHitbox position={[0, 0.6, 0]} size={2.4} onClick={launch} />
        </group>
      )}
      {layer}
    </>
  )
}
