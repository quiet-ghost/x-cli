import path from "node:path"
import { AppError } from "./errors"
import type { Attachment } from "../domain/attachment"

const imageMimeByExtension: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function attachmentFromFile(filePath: string): Promise<Attachment> {
  const file = Bun.file(filePath)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const filename = path.basename(filePath)
  const mime = detectMime(filePath, file.type)

  validateAttachment({ filename, mime, size: bytes.byteLength })

  return {
    id: crypto.randomUUID(),
    filename,
    mime,
    bytes,
    size: bytes.byteLength,
    source: "file",
  }
}

export function attachmentFromClipboard(bytes: Uint8Array, mime: string): Attachment {
  validateAttachment({ filename: "clipboard.png", mime, size: bytes.byteLength })

  return {
    id: crypto.randomUUID(),
    filename: "clipboard.png",
    mime,
    bytes,
    size: bytes.byteLength,
    source: "clipboard",
  }
}

export function mergeAttachments(current: Attachment[], incoming: Attachment[]): Attachment[] {
  const merged = [...current]
  for (const item of incoming) {
    if (merged.length >= 4) {
      throw new AppError("X allows up to 4 images per post.")
    }
    merged.push(item)
  }
  return merged
}

function detectMime(filePath: string, inferred: string): string {
  if (inferred.startsWith("image/")) return inferred
  const ext = path.extname(filePath).toLowerCase()
  return imageMimeByExtension[ext] ?? "application/octet-stream"
}

function validateAttachment(input: { filename: string; mime: string; size: number }): void {
  if (!input.mime.startsWith("image/")) {
    throw new AppError("Only image uploads are supported right now.", `${input.filename} is ${input.mime}.`)
  }

  const limit = input.mime === "image/gif" ? 15 * 1024 * 1024 : 5 * 1024 * 1024
  if (input.size > limit) {
    throw new AppError("Attachment is too large.", `${input.filename} exceeds the X upload limit for ${input.mime}.`)
  }
}
