/** Room 4/9: Balloon Range — drag the mouse like a slingshot (sideways =
 * direction, down = power), release to launch and pop every balloon.
 */

import { useFrame, useThree } from "@react-three/fiber"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { useParticles } from "../particles"
import type { RoomProps } from "../types"
import { type Vec3, VoxelField } from "../voxels"

const G = 12
const SPEED_MIN = 8
const SPEED_MAX = 17
const MAX_DRAG = 180
const AZ_MAX = Math.PI / 4
const ELEV = Math.PI / 4

/** Direct aim: sideways drag = direction, upward drag = power (pull toward
 * where you want to shoot: up = farther, left/right = aim left/right). */
function launchVel(dx: number, dy: number): THREE.Vector3 {
  const az =
    (THREE.MathUtils.clamp(dx, -MAX_DRAG, MAX_DRAG) / MAX_DRAG) * AZ_MAX
  const power = THREE.MathUtils.clamp(-dy, 0, MAX_DRAG) / MAX_DRAG
  const speed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * power
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(ELEV) * speed,
    Math.sin(ELEV) * speed,
    -Math.cos(az) * Math.cos(ELEV) * speed,
  )
}
const MUZZLE: Vec3 = [0, 0.9, 4.4]
const POINTS_BALLOON = 20
const POINTS_PIN = 15

const BALLOONS: Vec3[] = [
  [-4.5, 4, -7],
  [-1.5, 5, -9],
  [1.5, 4.5, -6],
  [4.5, 5.5, -8],
  [0, 6, -10],
]
const BALLOON_HEX = [0xff5964, 0x3d9bff, 0xffd32a, 0x4cd137, 0xc77dff]
const PINS: Vec3[] = [
  [-2.7, 0.15, -0.5],
  [-0.9, 0.15, -0.9],
  [0.9, 0.15, -0.9],
  [2.7, 0.15, -0.5],
]

export default function RoomCannon({
  callbacks,
  materials,
  count = 4,
  pins = 0,
}: RoomProps): ReactNode {
  const [popped, setPopped] = useState<boolean[]>(() =>
    Array.from({ length: count }, () => false),
  )
  const [fallen, setFallen] = useState<boolean[]>(() =>
    Array.from({ length: pins }, () => false),
  )
  const balloons = useMemo(() => BALLOONS.slice(0, count), [count])
  const pinSpots = useMemo(() => PINS.slice(0, pins), [pins])

  const { camera, gl } = useThree()
  const { spawn, layer } = useParticles()
  const ball = useRef({
    pos: new THREE.Vector3(...MUZZLE),
    vel: new THREE.Vector3(),
    flying: false,
  })
  const drag = useRef({ active: false, x: 0, y: 0 })
  const dragStart = useRef({ x: 0, y: 0 })
  const poppedRef = useRef(popped)
  const fallenRef = useRef(fallen)
  const ballMesh = useRef<THREE.Mesh>(null)
  const barrel = useRef<THREE.Group>(null)
  const dots = useRef<THREE.Group>(null)
  const balloonMeshes = useRef<(THREE.Mesh | null)[]>([])
  const pinMeshes = useRef<(THREE.Group | null)[]>([])

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    perspective.fov = 55
    perspective.updateProjectionMatrix()
    camera.position.set(0, 2.5, 9)
    camera.lookAt(0, 2, -2)
  }, [camera])

  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      // no "ball in flight" guard: rapid re-cocks the cannon, so a click is
      // never swallowed and the kid always feels in charge
      ball.current.pos.set(...MUZZLE)
      dragStart.current = { x: e.clientX, y: e.clientY }
      drag.current = { active: true, x: 0, y: 0 }
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return
      drag.current.x = e.clientX - dragStart.current.x
      drag.current.y = e.clientY - dragStart.current.y
    }
    const up = () => {
      if (!drag.current.active) return
      drag.current.active = false
      const v = launchVel(drag.current.x, drag.current.y)
      ball.current.vel.copy(v)
      ball.current.pos.set(...MUZZLE)
      ball.current.flying = true
      callbacks.playSound("pop")
    }
    el.addEventListener("pointerdown", down)
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", down)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
    }
  }, [gl, callbacks])

  const allDone = popped.every(Boolean) && fallen.every(Boolean)
  useEffect(() => {
    if (!allDone) return
    const t = window.setTimeout(() => callbacks.completeRoom(), 700)
    return () => window.clearTimeout(t)
  }, [allDone, callbacks])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    balloons.forEach((spot, i) => {
      const mesh = balloonMeshes.current[i]
      if (mesh) mesh.position.y = spot[1] + Math.sin(t * 1.6 + i * 1.7) * 0.25
    })
    if (barrel.current) {
      const az = drag.current.active
        ? (THREE.MathUtils.clamp(drag.current.x, -MAX_DRAG, MAX_DRAG) /
            MAX_DRAG) *
          AZ_MAX
        : 0
      barrel.current.rotation.y = THREE.MathUtils.damp(
        barrel.current.rotation.y,
        -az,
        10,
        dt,
      )
    }
    if (dots.current) {
      dots.current.visible = drag.current.active
      if (drag.current.active) {
        const v = launchVel(drag.current.x, drag.current.y)
        dots.current.children.forEach((dot, i) => {
          const s = (i + 1) * 0.12
          dot.position.set(
            MUZZLE[0] + v.x * s,
            MUZZLE[1] + v.y * s - 0.5 * G * s * s,
            MUZZLE[2] + v.z * s,
          )
        })
      }
    }
    const b = ball.current
    if (b.flying) {
      b.vel.y -= G * dt
      b.pos.addScaledVector(b.vel, dt)
      balloons.forEach((spot, i) => {
        if (poppedRef.current[i]) return
        const d = Math.hypot(
          b.pos.x - spot[0],
          b.pos.y - (spot[1] + Math.sin(t * 1.6 + i * 1.7) * 0.25),
          b.pos.z - spot[2],
        )
        if (d > 1.4) return
        poppedRef.current = poppedRef.current.map((p, j) =>
          j === i ? true : p,
        )
        setPopped(poppedRef.current)
        spawn(spot, BALLOON_HEX[i])
        callbacks.addPoints(POINTS_BALLOON)
        callbacks.playSound("pop")
      })
      pinSpots.forEach((spot, i) => {
        if (fallenRef.current[i]) return
        const d = Math.hypot(
          b.pos.x - spot[0],
          b.pos.y - spot[1],
          b.pos.z - spot[2],
        )
        if (d > 1.1) return
        fallenRef.current = fallenRef.current.map((p, j) =>
          j === i ? true : p,
        )
        setFallen(fallenRef.current)
        spawn(spot, 0xffffff)
        callbacks.addPoints(POINTS_PIN)
        callbacks.playSound("pop")
      })
      if (
        b.pos.y < -0.6 ||
        Math.abs(b.pos.x) > 25 ||
        b.pos.z < -25 ||
        b.pos.z > 15
      ) {
        b.flying = false
        b.pos.set(...MUZZLE)
      }
    }
    if (ballMesh.current) ballMesh.current.position.copy(b.pos)
    pinMeshes.current.forEach((g, i) => {
      if (g)
        g.rotation.z = THREE.MathUtils.damp(
          g.rotation.z,
          fallenRef.current[i] ? 1.6 : 0,
          6,
          dt,
        )
    })
  })

  const floor = useMemo(() => {
    const cells: Vec3[] = []
    for (let x = -9; x <= 9; x++) {
      for (let z = -11; z <= 7; z++) cells.push([x, -1, z])
    }
    return cells
  }, [])

  return (
    <>
      <color attach="background" args={["#aee7ff"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 12, 8]} intensity={1.5} />
      <VoxelField positions={floor} material={materials.grass} />
      <group position={[0, 0, 4.8]}>
        <mesh material={materials.stone} position={[0, -0.1, 0]}>
          <boxGeometry args={[0.9, 0.8, 0.9]} />
        </mesh>
        <group ref={barrel} position={[0, 0.35, -0.15]}>
          <mesh
            material={materials.wood}
            rotation={[-Math.PI / 4, 0, 0]}
            position={[0, 0.35, -0.25]}
          >
            <cylinderGeometry args={[0.22, 0.3, 1.5, 12]} />
          </mesh>
        </group>
      </group>
      <mesh ref={ballMesh} material={materials.stone} position={MUZZLE}>
        <sphereGeometry args={[0.35, 16, 16]} />
      </mesh>
      <group ref={dots} visible={false}>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshBasicMaterial color={0xffffff} />
          </mesh>
        ))}
      </group>
      {balloons.map(
        (spot, i) =>
          !popped[i] && (
            <mesh
              key={i}
              ref={(m) => {
                balloonMeshes.current[i] = m
              }}
              position={spot}
            >
              <sphereGeometry args={[0.7, 16, 16]} />
              <meshLambertMaterial
                color={BALLOON_HEX[i]}
                emissive={BALLOON_HEX[i]}
                emissiveIntensity={0.3}
              />
            </mesh>
          ),
      )}
      {pinSpots.map((spot, i) => (
        <group
          key={i}
          ref={(g) => {
            pinMeshes.current[i] = g
          }}
          position={spot}
        >
          <mesh material={materials.wool_yellow} position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.22, 0.4, 1.1, 12]} />
          </mesh>
          <mesh material={materials.wool_red} position={[0, 0.95, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
          </mesh>
        </group>
      ))}
      {layer}
    </>
  )
}
