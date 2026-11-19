import { useEffect, useRef, useState } from "react"

/**
 * Countdown driven outside the 3D loop because the HUD lives next to the
 * canvas. `runKey` restarts the timer; pausing keeps the remaining time.
 * Returns remaining seconds, or null when the level has no timer.
 */
export function useCountdown(
  seconds: number | null,
  active: boolean,
  _runKey: number,
  onExpire: () => void,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(seconds)
  const remainingRef = useRef(seconds ?? 0)
  const deadline = useRef(0)
  const fired = useRef(false)
  const expireRef = useRef(onExpire)

  useEffect(() => {
    expireRef.current = onExpire
  })

  useEffect(() => {
    remainingRef.current = seconds ?? 0
    fired.current = false
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (seconds === null || !active || fired.current) return
    deadline.current = performance.now() + remainingRef.current * 1000
    const id = window.setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000)
      remainingRef.current = left
      setRemaining(left)
      if (left <= 0 && !fired.current) {
        fired.current = true
        expireRef.current()
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [seconds, active])

  return remaining
}
