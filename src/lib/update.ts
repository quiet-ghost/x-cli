import fs from "node:fs/promises"
import { z } from "zod"
import { Paths } from "./paths"

const publishedPackageName = "@quietghost/x-cli"
export const updateCheckIntervalMs = 15 * 60 * 1000

const UpdateStateSchema = z.object({
  installedVersion: z.string().optional(),
  latestVersion: z.string().optional(),
  lastCheckedAt: z.string().optional(),
  lastNotifiedAvailableVersion: z.string().optional(),
})

const RegistryResponseSchema = z.object({
  version: z.string(),
})

export type UpdateState = z.infer<typeof UpdateStateSchema>

export type UpdateNotification = {
  updatedFrom?: string
  availableVersion?: string
}

export function shouldCheckForUpdates(lastCheckedAt?: string, now = Date.now()): boolean {
  if (!lastCheckedAt) return true
  const checkedAt = Date.parse(lastCheckedAt)
  if (Number.isNaN(checkedAt)) return true
  return now - checkedAt >= updateCheckIntervalMs
}

export function reconcileUpdateState(input: {
  state: UpdateState
  currentVersion: string
  latestVersion?: string
  checkedAt?: string
}): { state: UpdateState; notification: UpdateNotification } {
  const nextState: UpdateState = { ...input.state }

  const updatedFrom =
    nextState.installedVersion && compareVersions(input.currentVersion, nextState.installedVersion) > 0 ? nextState.installedVersion : undefined

  if (input.latestVersion) {
    nextState.latestVersion = input.latestVersion
    nextState.lastCheckedAt = input.checkedAt
  }

  const availableVersion = nextState.latestVersion && compareVersions(nextState.latestVersion, input.currentVersion) > 0 ? nextState.latestVersion : undefined
  const shouldNotifyAvailable = availableVersion && nextState.lastNotifiedAvailableVersion !== availableVersion ? availableVersion : undefined

  nextState.installedVersion = input.currentVersion
  nextState.lastNotifiedAvailableVersion = availableVersion

  return {
    state: nextState,
    notification: {
      updatedFrom,
      availableVersion: shouldNotifyAvailable,
    },
  }
}

export async function syncPackageUpdateState(currentVersion: string): Promise<UpdateNotification> {
  if (currentVersion === "dev") return {}

  const state = await loadUpdateState()
  const checkedAt = new Date().toISOString()
  const latestVersion = shouldCheckForUpdates(state.lastCheckedAt) ? await fetchLatestVersion().catch(() => undefined) : undefined
  const { state: nextState, notification } = reconcileUpdateState({
    state,
    currentVersion,
    latestVersion,
    checkedAt: latestVersion ? checkedAt : undefined,
  })

  await saveUpdateState(nextState)
  return notification
}

export function updateInstallCommand(): string {
  return `bun install -g ${publishedPackageName}`
}

function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersion(left)
  const rightVersion = parseVersion(right)
  if (!leftVersion || !rightVersion) return left.localeCompare(right)

  for (const key of ["major", "minor", "patch"] as const) {
    const difference = leftVersion[key] - rightVersion[key]
    if (difference !== 0) return difference
  }

  const leftPre = leftVersion.prerelease
  const rightPre = rightVersion.prerelease
  if (!leftPre && !rightPre) return 0
  if (!leftPre) return 1
  if (!rightPre) return -1

  const length = Math.max(leftPre.length, rightPre.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftPre[index]
    const rightPart = rightPre[index]
    if (leftPart === undefined) return -1
    if (rightPart === undefined) return 1
    if (leftPart === rightPart) continue

    const leftNumber = Number(leftPart)
    const rightNumber = Number(rightPart)
    const leftIsNumber = Number.isInteger(leftNumber) && `${leftNumber}` === leftPart
    const rightIsNumber = Number.isInteger(rightNumber) && `${rightNumber}` === rightPart

    if (leftIsNumber && rightIsNumber) return leftNumber - rightNumber
    if (leftIsNumber) return -1
    if (rightIsNumber) return 1
    return leftPart.localeCompare(rightPart)
  }

  return 0
}

function parseVersion(version: string): { major: number; minor: number; patch: number; prerelease?: string[] } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/)
  if (!match) return null

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  const prerelease = match[4]?.split(".").filter(Boolean)

  return {
    major,
    minor,
    patch,
    prerelease,
  }
}

async function loadUpdateState(): Promise<UpdateState> {
  try {
    const text = await fs.readFile(Paths.updateStateFile, "utf8")
    return UpdateStateSchema.parse(JSON.parse(text))
  } catch {
    return {}
  }
}

async function saveUpdateState(state: UpdateState): Promise<void> {
  await fs.writeFile(Paths.updateStateFile, JSON.stringify(state, null, 2))
}

async function fetchLatestVersion(): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(publishedPackageName)}/latest`, {
    headers: {
      accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`npm registry responded with ${response.status}`)
  }

  const payload = RegistryResponseSchema.parse(await response.json())
  return payload.version
}
