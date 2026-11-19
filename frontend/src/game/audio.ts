/** Tiny sound player for /public/sounds. Missing files fail silently. */

const SOURCES: Record<"pop" | "win", string> = {
  pop: "/sounds/pop.mp3",
  win: "/sounds/win.mp3",
}

const CACHE: Partial<Record<"pop" | "win", HTMLAudioElement>> = {}

export function playSound(name: "pop" | "win"): void {
  try {
    let element = CACHE[name]
    if (!element) {
      element = new Audio(SOURCES[name])
      element.volume = 0.7
      CACHE[name] = element
    }
    element.currentTime = 0
    element.play().catch(() => {
      // Autoplay policy or missing file: a silent game is still playable.
    })
  } catch {
    // Audio unsupported in this browser: ignore.
  }
}
