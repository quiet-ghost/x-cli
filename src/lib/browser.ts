import { AppError } from "./errors"
import { runCommand } from "./process"

export async function openExternal(url: string): Promise<void> {
  const platform = process.platform
  const commands =
    platform === "darwin"
      ? [["open", url]]
      : platform === "win32"
        ? [["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", `Start-Process '${url.replace(/'/g, "''")}'`]]
        : [["xdg-open", url]]

  for (const command of commands) {
    const result = await runCommand(command)
    if (result.exitCode === 0) return
  }

  throw new AppError("Failed to open the browser.", `Open this URL manually: ${url}`)
}
