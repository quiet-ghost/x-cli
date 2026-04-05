import fs from "node:fs/promises"
import path from "node:path"
import type { AppTheme } from "../domain/theme"
import { Paths } from "../lib/paths"
import { ThemeSchema } from "./schema"
import rosepine from "./builtins/rosepine.json"
import opencode from "./builtins/opencode.json"
import carbonfox from "./builtins/carbonfox.json"

const OPENCODE_THEME_DIR = "/home/ghost/dev/repos/opencode/packages/opencode/src/cli/cmd/tui/context/theme"

export function builtinThemes(): AppTheme[] {
  return [
    ThemeSchema.parse(rosepine),
    ThemeSchema.parse(opencode),
    ThemeSchema.parse(carbonfox),
  ]
}

export async function loadThemes(): Promise<AppTheme[]> {
  const opencode = await loadOpencodeBuiltinThemes()
  const custom = await loadCustomThemes()
  const merged = new Map<string, AppTheme>()

  for (const theme of [...builtinThemes(), ...opencode, ...custom]) {
    merged.set(theme.id, theme)
  }

  return [...merged.values()]
}

async function loadCustomThemes(): Promise<AppTheme[]> {
  let entries: string[] = []

  try {
    entries = await fs.readdir(Paths.themesDir)
  } catch {
    return []
  }

  const result: AppTheme[] = []

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue
    const filePath = path.join(Paths.themesDir, entry)
    try {
      const text = await fs.readFile(filePath, "utf8")
      const parsed = ThemeSchema.parse(JSON.parse(text))
      result.push(parsed)
    } catch {
    }
  }

  return result
}

async function loadOpencodeBuiltinThemes(): Promise<AppTheme[]> {
  let entries: string[] = []

  try {
    entries = await fs.readdir(OPENCODE_THEME_DIR)
  } catch {
    return []
  }

  const themes: AppTheme[] = []

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue
    const filePath = path.join(OPENCODE_THEME_DIR, entry)
    try {
      const text = await fs.readFile(filePath, "utf8")
      const parsed = JSON.parse(text) as OpenCodeThemeJson
      themes.push(mapOpencodeTheme(path.basename(entry, ".json"), parsed))
    } catch {
    }
  }

  return themes.sort((left, right) => left.label.localeCompare(right.label))
}

type OpenCodeThemeJson = {
  defs?: Record<string, string>
  theme: Record<string, string | { dark: string; light: string }>
}

function mapOpencodeTheme(id: string, source: OpenCodeThemeJson): AppTheme {
  const defs = source.defs ?? {}
  const resolve = (value: string | { dark: string; light: string }): string => {
    const target = typeof value === "string" ? value : value.dark
    return resolveRef(target, defs, source.theme)
  }
  const required = (key: string): string | { dark: string; light: string } => {
    const value = source.theme[key]
    if (!value) throw new Error(`Missing theme key ${key} in ${id}`)
    return value
  }
  const optional = (primary: string, fallback: string): string | { dark: string; light: string } => {
    return source.theme[primary] ?? required(fallback)
  }

  return ThemeSchema.parse({
    id,
    label: toLabel(id),
    colors: {
      background: resolve(required("background")),
      panel: resolve(required("backgroundPanel")),
      panelMuted: resolve(required("backgroundElement")),
      surface: resolve(required("backgroundElement")),
      surfaceActive: resolve(optional("borderActive", "primary")),
      border: resolve(optional("borderSubtle", "border")),
      text: resolve(required("text")),
      textMuted: resolve(required("textMuted")),
      primary: resolve(required("primary")),
      accent: resolve(required("accent")),
      success: resolve(required("success")),
      warning: resolve(required("warning")),
      error: resolve(required("error")),
      overlay: resolve(optional("border", "textMuted")),
    },
  })
}

function resolveRef(
  value: string,
  defs: Record<string, string>,
  theme: Record<string, string | { dark: string; light: string }>,
  chain: string[] = [],
): string {
  if (value === "transparent" || value === "none") return "#000000"
  if (value.startsWith("#")) return value
  if (chain.includes(value)) throw new Error(`Circular theme reference: ${[...chain, value].join(" -> ")}`)

  const next = defs[value] ?? theme[value]
  if (!next) throw new Error(`Missing theme reference: ${value}`)
  const target = typeof next === "string" ? next : next.dark
  return resolveRef(target, defs, theme, [...chain, value])
}

function toLabel(id: string): string {
  return id
    .split("-")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0]!.toUpperCase() + part.slice(1)))
    .join(" ")
}
