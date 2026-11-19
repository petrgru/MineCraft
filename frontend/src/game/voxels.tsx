/** Shared voxel helpers: instanced cube fields and oversized click hitboxes. */

import { type ThreeEvent, useFrame } from "@react-three/fiber"
import { type ReactNode, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

export type Vec3 = [number, number, number]

/** Smooth 0..1 easing used for flying blocks, gates and levers. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** One InstancedMesh of equal-size cubes for cheap static voxel terrain. */
export function VoxelField({
  positions,
  material,
  size = 1,
}: {
  positions: Vec3[]
  material: THREE.Material
  size?: number
}): ReactNode {
  const mesh = useMemo(() => {
    const geometry = new THREE.BoxGeometry(size, size, size)
    const instanced = new THREE.InstancedMesh(
      geometry,
      material,
      positions.length,
    )
    const matrix = new THREE.Matrix4()
    positions.forEach((p, i) => {
      matrix.setPosition(p[0], p[1], p[2])
      instanced.setMatrixAt(i, matrix)
    })
    instanced.instanceMatrix.needsUpdate = true
    return instanced
  }, [positions, material, size])

  useEffect(() => {
    return () => {
      mesh.geometry.dispose()
    }
  }, [mesh])

  return <primitive object={mesh} />
}

/**
 * Invisible oversized cube that turns any object into a huge mouse target.
 * Uses colorWrite=false (not visible=false) so raycasting always hits it.
 */
export function ClickHitbox({
  position,
  size = 2.4,
  onClick,
}: {
  position: Vec3
  size?: number
  onClick: () => void
}): ReactNode {
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onClick()
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: three.js canvas object, not a DOM element
    <mesh
      position={position}
      onClick={click}
      onPointerOver={() => {
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default"
      }}
    >
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  )
}

/** Tween a numeric property of an object ref over `duration` seconds. */
export function useTween(
  target: { current: number },
  from: number,
  to: number,
  duration: number,
  active: boolean,
  apply: (value: number) => void,
): void {
  const progress = useRef(0)
  useFrame((_, delta) => {
    if (!active) return
    progress.current = Math.min(1, progress.current + delta / duration)
    target.current = THREE.MathUtils.lerp(from, to, easeInOut(progress.current))
    apply(target.current)
  })
}
