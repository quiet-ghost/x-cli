import { AppError } from "./errors"

export async function runCommand(command: string[], input?: string): Promise<{ stdout: Uint8Array; stderr: string; exitCode: number }> {
  let proc: ReturnType<typeof Bun.spawn>

  try {
    proc = Bun.spawn(command, {
      stdin: input !== undefined ? "pipe" : "ignore",
      stdout: "pipe",
      stderr: "pipe",
    })
  } catch (error) {
    throw new AppError(`Failed to launch ${command[0]}.`, error instanceof Error ? error.message : undefined)
  }

  if (input !== undefined && proc.stdin && typeof proc.stdin !== "number") {
    proc.stdin.write(input)
    proc.stdin.end()
  }

  const stdoutBody = proc.stdout instanceof ReadableStream ? proc.stdout : undefined
  const stderrBody = proc.stderr instanceof ReadableStream ? proc.stderr : undefined

  const [stdout, stderr, exitCode] = await Promise.all([
    stdoutBody ? new Response(stdoutBody).bytes() : Promise.resolve(new Uint8Array()),
    stderrBody ? new Response(stderrBody).text() : Promise.resolve(""),
    proc.exited,
  ])

  return { stdout, stderr, exitCode }
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await runCommand(["sh", "-lc", `command -v ${command}`])
    return result.exitCode === 0
  } catch {
    return false
  }
}
