import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { AppTheme } from "../domain/theme"
import { Paths } from "../lib/paths"
import { ThemeSchema } from "./schema"

const sourceBuiltinDir = fileURLToPath(new URL("./opencode-builtins", import.meta.url))

export async function builtinThemes(): Promise<AppTheme[]> {
  const themeDir = await resolveBuiltinThemeDir()
  if (!themeDir) return []

  let entries: string[] = []
  try {
    entries = await fs.readdir(themeDir)
  } catch {
    return []
  }

  const result: AppTheme[] = []

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue
    try {
      const text = await fs.readFile(path.join(themeDir, entry), "utf8")
      result.push(ThemeSchema.parse(JSON.parse(text)))
    } catch {
    }
  }

  return result.sort((left, right) => left.label.localeCompare(right.label))
}

export async function loadThemes(): Promise<AppTheme[]> {
  const builtin = await builtinThemes()
  const custom = await loadCustomThemes()
  const merged = new Map<string, AppTheme>()

  for (const theme of [...builtin, ...custom]) {
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

async function resolveBuiltinThemeDir(): Promise<string | null> {
  const candidates = [
    process.env["XCLI_THEME_DIR"],
    path.resolve(path.dirname(process.execPath), "..", "themes"),
    sourceBuiltinDir,
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (stat.isDirectory()) return candidate
    } catch {
    }
  }

  return null
}
