import { AppError } from "./errors"
import { runCommand } from "./process"

export async function readClipboardImage(): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (process.platform !== "linux") {
    throw new AppError("Clipboard image paste is only implemented for Linux in this first pass.")
  }

  const wayland = await tryRead(["wl-paste", "-t", "image/png"])
  if (wayland) return { bytes: wayland, mime: "image/png" }

  const x11 = await tryRead(["xclip", "-selection", "clipboard", "-t", "image/png", "-o"])
  if (x11) return { bytes: x11, mime: "image/png" }

  return null
}

async function tryRead(command: string[]): Promise<Uint8Array | null> {
  try {
    const result = await runCommand(command)
    if (result.exitCode !== 0 || result.stdout.byteLength === 0) return null
    return result.stdout
  } catch {
    return null
  }
}
