import { z } from "zod"
import type { AppTheme } from "../domain/theme"
import { ThemeSchema } from "./schema"

const ThemeTokenSchema = z.union([
  z.string(),
  z
    .object({
      dark: z.string().optional(),
      light: z.string().optional(),
    })
    .refine((value) => Boolean(value.dark || value.light)),
])

const OpencodeThemeSchema = z.object({
  defs: z.record(z.string(), z.string()).default({}),
  theme: z.object({
    primary: ThemeTokenSchema,
    accent: ThemeTokenSchema,
    success: ThemeTokenSchema,
    warning: ThemeTokenSchema,
    error: ThemeTokenSchema,
    text: ThemeTokenSchema,
    textMuted: ThemeTokenSchema,
    background: ThemeTokenSchema,
    backgroundPanel: ThemeTokenSchema,
    backgroundElement: ThemeTokenSchema.optional(),
    border: ThemeTokenSchema.optional(),
    borderActive: ThemeTokenSchema.optional(),
    borderSubtle: ThemeTokenSchema.optional(),
  }),
})

export function parseThemeFile(sourceName: string, text: string): AppTheme {
  const parsed = JSON.parse(text) as unknown
  return parseThemeDefinition(sourceName, parsed)
}

export function parseThemeDefinition(sourceName: string, input: unknown): AppTheme {
  const appTheme = ThemeSchema.safeParse(input)
  if (appTheme.success) return appTheme.data

  const opencodeTheme = OpencodeThemeSchema.parse(input)
  return {
    id: slugFromName(sourceName),
    label: labelFromName(sourceName),
    colors: {
      background: resolveToken(opencodeTheme, opencodeTheme.theme.background),
      panel: resolveToken(opencodeTheme, opencodeTheme.theme.backgroundPanel),
      panelMuted: resolveToken(opencodeTheme, opencodeTheme.theme.backgroundElement ?? opencodeTheme.theme.backgroundPanel),
      surface: resolveToken(opencodeTheme, opencodeTheme.theme.backgroundElement ?? opencodeTheme.theme.backgroundPanel),
      surfaceActive: resolveToken(opencodeTheme, opencodeTheme.theme.borderActive ?? opencodeTheme.theme.backgroundElement ?? opencodeTheme.theme.backgroundPanel),
      border: resolveToken(opencodeTheme, opencodeTheme.theme.border ?? opencodeTheme.theme.borderSubtle ?? opencodeTheme.theme.textMuted),
      text: resolveToken(opencodeTheme, opencodeTheme.theme.text),
      textMuted: resolveToken(opencodeTheme, opencodeTheme.theme.textMuted),
      primary: resolveToken(opencodeTheme, opencodeTheme.theme.primary),
      accent: resolveToken(opencodeTheme, opencodeTheme.theme.accent),
      success: resolveToken(opencodeTheme, opencodeTheme.theme.success),
      warning: resolveToken(opencodeTheme, opencodeTheme.theme.warning),
      error: resolveToken(opencodeTheme, opencodeTheme.theme.error),
      overlay: resolveToken(opencodeTheme, opencodeTheme.theme.borderActive ?? opencodeTheme.theme.primary),
    },
  }
}

function resolveToken(theme: z.infer<typeof OpencodeThemeSchema>, token: z.infer<typeof ThemeTokenSchema>): string {
  const raw = typeof token === "string" ? token : token.dark ?? token.light
  if (!raw) throw new Error("Theme token is missing a color value")
  return theme.defs[raw] ?? raw
}

function slugFromName(sourceName: string): string {
  return sourceName.replace(/\.json$/u, "")
}

function labelFromName(sourceName: string): string {
  return slugFromName(sourceName)
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(" ")
}
