/**
 * The player cannot read yet, so the UI uses pictograms only.
 * This file holds the tiny amount of text that exists at all:
 * invisible accessibility labels plus the emoji glyph set.
 */
export const cs = {
  meta: {
    title: "Kostíkový svět",
  },
  animals: {
    lion: "Lvoušek",
    fox: "Liška",
    bear: "Medvídek",
    frog: "Žabka",
  },
  aria: {
    play: "Hrát",
    newGame: "Nová hra",
    playAgain: "Hrát znovu",
    retry: "Zkusit znovu",
    continueGame: "Pokračovat",
    score: "Body",
    thermometer: "Čas",
    levels: "Úrovně",
    demo: "Ukázka barev",
  },
  /** One icon per level, shown in the HUD level dots. */
  roomIcons: [
    "🌉",
    "💎",
    "🏰",
    "🎈",
    "🌉",
    "💎",
    "🎨",
    "🏰",
    "🎯",
    "🌈",
    "🎨",
    "🚀",
  ],
} as const

export type AvatarKey = keyof typeof cs.animals
