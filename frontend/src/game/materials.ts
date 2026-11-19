/**
 * Voxel material loading. Tries PNG textures from /public/textures first and
 * falls back to solid bright colors when a file is missing or fails to load.
 */

import * as THREE from "three"

export type MaterialKey =
  | "grass"
  | "stone"
  | "wool_red"
  | "wool_blue"
  | "wool_yellow"
  | "diamond"
  | "gold"
  | "wood"

export type Materials = Record<MaterialKey, THREE.MeshLambertMaterial>

const TEXTURE_FILES: Partial<Record<MaterialKey, string>> = {
  grass: "grass.png",
  stone: "stone.png",
  wool_red: "wool_red.png",
  wool_blue: "wool_blue.png",
  wool_yellow: "wool_yellow.png",
  diamond: "diamond.png",
  gold: "gold.png",
  // No wood.png in the asset spec; falls back to the bright color below.
}

const FALLBACK_COLORS: Record<MaterialKey, number> = {
  grass: 0x4cd137,
  stone: 0x8b93a1,
  wool_red: 0xff5964,
  wool_blue: 0x3d9bff,
  wool_yellow: 0xffd32a,
  diamond: 0x54f2ee,
  gold: 0xffc31f,
  wood: 0x9a6a38,
}

const ALL_KEYS = Object.keys(FALLBACK_COLORS) as MaterialKey[]

function loadOne(key: MaterialKey): Promise<THREE.MeshLambertMaterial> {
  return new Promise((resolve) => {
    const fallback = () =>
      resolve(new THREE.MeshLambertMaterial({ color: FALLBACK_COLORS[key] }))
    const file = TEXTURE_FILES[key]
    if (!file) {
      fallback()
      return
    }
    new THREE.TextureLoader().load(
      `/textures/${file}`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.magFilter = THREE.NearestFilter // crisp voxel look
        resolve(new THREE.MeshLambertMaterial({ map: texture }))
      },
      undefined,
      fallback,
    )
  })
}

/** Load every game material in parallel; never rejects thanks to fallbacks. */
export async function loadMaterials(): Promise<Materials> {
  const mats = await Promise.all(ALL_KEYS.map(loadOne))
  return Object.fromEntries(
    ALL_KEYS.map((key, i) => [key, mats[i] as THREE.MeshLambertMaterial]),
  ) as Materials
}

/**
 * Clone a material with emissive glow (diamonds, levers, wool highlights).
 * Callers own the clone and must dispose it on unmount.
 */
export function glowClone(
  base: THREE.MeshLambertMaterial,
  emissive: number,
  intensity: number,
): THREE.MeshLambertMaterial {
  const clone = base.clone()
  clone.emissive = new THREE.Color(emissive)
  clone.emissiveIntensity = intensity
  return clone
}
