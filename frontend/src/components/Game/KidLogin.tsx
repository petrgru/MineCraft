/** Picture-only login for kids: pick a big animal, press PLAY. */

import { useMutation } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

import { GameService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { type AvatarKey, cs } from "@/locales/cs"
import { AVATAR_EMOJI, AVATAR_KEYS } from "./avatarEmojis"

export function KidLogin({
  onStarted,
}: {
  onStarted: (avatar: AvatarKey) => void
}): ReactNode {
  const [avatar, setAvatar] = useState<AvatarKey>("lion")
  const { showErrorToast } = useCustomToast()

  const login = useMutation({
    mutationFn: () => GameService.quickLogin({ body: { avatar } }),
    onSuccess: (response) => {
      localStorage.setItem("access_token", response.data.access_token)
      onStarted(avatar)
    },
    onError: () => {
      showErrorToast("📡 ❌")
    },
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-sky-100 p-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {AVATAR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={cs.animals[key]}
            aria-pressed={avatar === key}
            onClick={() => setAvatar(key)}
            className={cn(
              "flex size-44 cursor-pointer flex-col items-center justify-center rounded-3xl border-8 bg-white transition-transform hover:scale-105",
              avatar === key
                ? "scale-105 border-yellow-400 shadow-2xl"
                : "border-sky-200 shadow-lg",
            )}
          >
            <span className="text-8xl">{AVATAR_EMOJI[key]}</span>
          </button>
        ))}
      </div>
      <Button
        aria-label={cs.aria.play}
        disabled={login.isPending}
        onClick={() => login.mutate()}
        className="h-28 w-64 cursor-pointer rounded-full bg-green-500 text-6xl hover:bg-green-600"
      >
        ▶️
      </Button>
    </div>
  )
}
