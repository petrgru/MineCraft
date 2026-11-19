/** Reusable click-burst particle system (diamond sparkles, chest confetti). */

import { useFrame } from "@react-three/fiber"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { Vec3 } from "./voxels"

const BURST_COUNT = 42
const BURST_LIFETIME = 0.9

interface Burst {
  id: number
  position: Vec3
  colorHex: number
}

function BurstPoints({
  burst,
  onDone,
}: {
  burst: Burst
  onDone: (id: number) => void
}): ReactNode {
  const age = useRef(0)
  const done = useRef(false)

  const { geometry, velocities } = useMemo(() => {
    const positions = new Float32Array(BURST_COUNT * 3)
    const velocities = new Float32Array(BURST_COUNT * 3)
    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 3
      velocities[i * 3] = Math.cos(angle) * speed
      velocities[i * 3 + 1] = 2 + Math.random() * 3.5
      velocities[i * 3 + 2] = Math.sin(angle) * speed
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return { geometry, velocities }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry],
  )

  useFrame((_, delta) => {
    age.current += delta
    if (age.current >= BURST_LIFETIME) {
      if (!done.current) {
        done.current = true
        onDone(burst.id)
      }
      return
    }
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute
    const array = attribute.array as Float32Array
    for (let i = 0; i < BURST_COUNT; i++) {
      velocities[i * 3 + 1] -= 9.8 * delta
      array[i * 3] += velocities[i * 3] * delta
      array[i * 3 + 1] += velocities[i * 3 + 1] * delta
      array[i * 3 + 2] += velocities[i * 3 + 2] * delta
    }
    attribute.needsUpdate = true
  })

  return (
    <points position={burst.position} geometry={geometry}>
      <pointsMaterial
        size={0.32}
        color={burst.colorHex}
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Hook form of the particle system: rooms call spawn(position, color) and
 * render `layer` inside their scene graph.
 */
export function useParticles(): {
  spawn: (position: Vec3, colorHex: number) => void
  layer: ReactNode
} {
  const [bursts, setBursts] = useState<Burst[]>([])
  const nextId = useRef(0)

  const spawn = useCallback((position: Vec3, colorHex: number) => {
    nextId.current += 1
    setBursts((prev) => [...prev, { id: nextId.current, position, colorHex }])
  }, [])

  const remove = useCallback((id: number) => {
    setBursts((prev) => prev.filter((burst) => burst.id !== id))
  }, [])

  const layer = bursts.map((burst) => (
    <BurstPoints key={burst.id} burst={burst} onDone={remove} />
  ))
  return { spawn, layer }
}
