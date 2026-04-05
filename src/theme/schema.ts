import { z } from "zod"

export const ThemeSchema = z.object({
  id: z.string(),
  label: z.string(),
  colors: z.object({
    background: z.string(),
    panel: z.string(),
    panelMuted: z.string(),
    surface: z.string(),
    surfaceActive: z.string(),
    border: z.string(),
    text: z.string(),
    textMuted: z.string(),
    primary: z.string(),
    accent: z.string(),
    success: z.string(),
    warning: z.string(),
    error: z.string(),
    overlay: z.string(),
  }),
})
