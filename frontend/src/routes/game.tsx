import { createFileRoute } from "@tanstack/react-router"

import { GamePage } from "@/components/Game/GamePage"
import { cs } from "@/locales/cs"

export const Route = createFileRoute("/game")({
  component: GamePage,
  head: () => ({
    meta: [{ title: cs.meta.title }],
  }),
})
