import { AppError } from "./errors"
import { runCommand } from "./process"

export async function writeClipboardText(text: string): Promise<void> {
  const platform = process.platform

  const commands =
    platform === "darwin"
      ? [["pbcopy"]]
      : platform === "win32"
        ? [["powershell.exe", "-NonInteractive", "-NoProfile", "-Command", "Set-Clipboard -Value ([Console]::In.ReadToEnd())"]]
        : process.env["WAYLAND_DISPLAY"]
          ? [["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]]
          : [["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]]

  for (const command of commands) {
    try {
      const result = await runCommand(command, text)
      if (result.exitCode === 0) return
    } catch {
    }
  }

  throw new AppError("Failed to copy to clipboard.", "No working clipboard command was available.")
}
