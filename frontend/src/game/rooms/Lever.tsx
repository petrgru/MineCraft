/** A big golden lever that swings when the kid clicks it (Room 3). */

import { useFrame } from "@react-three/fiber"
import { type ReactNode, useRef } from "react"
import * as THREE from "three"
import { ClickHitbox, type Vec3 } from "../voxels"

export function Lever({
  position,
  pulled,
  material,
  onPull,
}: {
  position: Vec3
  pulled: boolean
  material: THREE.Material
  onPull: () => void
}): ReactNode {
  const pivot = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (!pivot.current) return
    const target = pulled ? -0.9 : 0.35
    pivot.current.rotation.z = THREE.MathUtils.damp(
      pivot.current.rotation.z,
      target,
      8,
      delta,
    )
  })
  return (
    <group position={position}>
      <mesh material={material} position={[0, 0.35, 0]}>
        <boxGeometry args={[0.5, 0.7, 0.5]} />
      </mesh>
      <group ref={pivot} position={[0, 0.7, 0]} rotation={[0, 0, 0.35]}>
        <mesh material={material} position={[0, 0.5, 0]}>
          <boxGeometry args={[0.24, 1, 0.24]} />
        </mesh>
      </group>
      {!pulled && <ClickHitbox position={[0, 0.9, 0]} onClick={onPull} />}
    </group>
  )
}
