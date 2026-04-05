import fs from "node:fs/promises"
import path from "node:path"
import type { AppTheme } from "../domain/theme"
import { Paths } from "../lib/paths"
import { builtinThemes as builtinThemeList } from "./builtin-themes"
import { parseThemeFile } from "./parse"

export async function builtinThemes(): Promise<AppTheme[]> {
  return builtinThemeList
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
      result.push(parseThemeFile(entry, text))
    } catch {
    }
  }

  return result
}
