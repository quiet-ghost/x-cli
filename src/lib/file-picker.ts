import { AppError } from "./errors"
import { commandExists, runCommand } from "./process"

export async function pickMediaFiles(): Promise<string[]> {
  if (await commandExists("zenity")) {
    const result = await runCommand([
      "zenity",
      "--file-selection",
      "--multiple",
      "--separator=\n",
      "--title=Attach media",
      "--file-filter=Images | *.png *.jpg *.jpeg *.gif *.webp",
    ])
    if (result.exitCode === 0) return decodePaths(result.stdout)
    return []
  }

  if (await commandExists("kdialog")) {
    const result = await runCommand([
      "kdialog",
      "--getopenfilename",
      ".",
      "*.png *.jpg *.jpeg *.gif *.webp|Image Files",
      "--multiple",
      "--separate-output",
    ])
    if (result.exitCode === 0) return decodePaths(result.stdout)
    return []
  }

  throw new AppError("No file picker is available.", "Install zenity or kdialog to attach files from a GUI picker.")
}

function decodePaths(bytes: Uint8Array): string[] {
  const text = Buffer.from(bytes).toString("utf8").trim()
  if (!text) return []
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean)
}
