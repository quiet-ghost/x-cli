import fs from "node:fs/promises"
import path from "node:path"
import { Paths } from "./paths"

export type Draft = {
  id: string
  name: string
  content: string
  updatedAt: string
}

export const DraftStore = {
  async list(): Promise<Draft[]> {
    await fs.mkdir(Paths.draftsDir, { recursive: true, mode: 0o700 })
    const entries = await fs.readdir(Paths.draftsDir).catch(() => [])
    const drafts: Draft[] = []

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue
      try {
        const text = await fs.readFile(path.join(Paths.draftsDir, entry), "utf8")
        drafts.push(JSON.parse(text) as Draft)
      } catch {
      }
    }

    return drafts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  },

  async saveNamed(name: string, content: string): Promise<Draft> {
    const id = slug(name)
    const draft: Draft = {
      id,
      name,
      content,
      updatedAt: new Date().toISOString(),
    }
    await writeDraft(draft)
    return draft
  },

  async load(id: string): Promise<Draft | null> {
    try {
      const text = await fs.readFile(path.join(Paths.draftsDir, `${id}.json`), "utf8")
      return JSON.parse(text) as Draft
    } catch {
      return null
    }
  },

  async delete(id: string): Promise<void> {
    await fs.rm(path.join(Paths.draftsDir, `${id}.json`), { force: true })
  },

  async saveScratch(account: string, content: string): Promise<void> {
    await fs.mkdir(Paths.draftsDir, { recursive: true, mode: 0o700 })
    const filePath = scratchPath(account)
    if (!content.trim()) {
      await fs.rm(filePath, { force: true }).catch(() => {})
      return
    }
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          account,
          content,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    )
  },

  async loadScratch(account: string): Promise<string> {
    try {
      const text = await fs.readFile(scratchPath(account), "utf8")
      const parsed = JSON.parse(text) as { content?: string }
      return parsed.content ?? ""
    } catch {
      return ""
    }
  },
}

async function writeDraft(draft: Draft): Promise<void> {
  await fs.mkdir(Paths.draftsDir, { recursive: true, mode: 0o700 })
  await fs.writeFile(path.join(Paths.draftsDir, `${draft.id}.json`), JSON.stringify(draft, null, 2), { mode: 0o600 })
}

function scratchPath(account: string): string {
  return path.join(Paths.draftsDir, `_scratch-${slug(account)}.json`)
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
