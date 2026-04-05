import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const platformMap = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
}

const archMap = {
  x64: "x64",
  arm64: "arm64",
}

export function detect() {
  return {
    platform: platformMap[os.platform()] || os.platform(),
    arch: archMap[os.arch()] || os.arch(),
  }
}

export function binaryName() {
  return detect().platform === "windows" ? "x-cli.exe" : "x-cli"
}

export function platformPackageName() {
  const target = detect()
  return `@quietghost/x-cli-${target.platform}-${target.arch}`
}

export function cacheBinaryPath(packageRoot) {
  return path.join(packageRoot, "bin", ".x-cli")
}

export function cacheVersionPath(packageRoot) {
  return path.join(packageRoot, "bin", ".x-cli-version")
}

export function updateCheckPath(packageRoot) {
  return path.join(packageRoot, "bin", ".x-cli-update-check")
}

export function updateLockPath(packageRoot) {
  return path.join(packageRoot, "bin", ".x-cli-update-lock")
}

export function resolveInstalledPackageDir(name = platformPackageName()) {
  const packageJsonPath = require.resolve(`${name}/package.json`)
  return path.dirname(packageJsonPath)
}

export async function cacheFromDirectory(packageDir, packageRoot) {
  const sourceBinary = path.join(packageDir, "bin", binaryName())
  const targetBinary = cacheBinaryPath(packageRoot)
  const targetVersion = cacheVersionPath(packageRoot)
  const version = await readPackageVersion(packageDir)

  await fsp.mkdir(path.dirname(targetBinary), { recursive: true })
  await fsp.rm(targetBinary, { force: true }).catch(() => {})
  await fsp.copyFile(sourceBinary, targetBinary)
  await fsp.chmod(targetBinary, 0o755).catch(() => {})
  await fsp.writeFile(targetVersion, `${version}\n`)

  return version
}

export async function downloadAndCacheFromRegistry(name, packageRoot, version) {
  const metadata = await fetchPackageMetadata(name)
  const resolvedVersion = version ?? metadata["dist-tags"]?.latest
  const tarball = metadata.versions?.[resolvedVersion]?.dist?.tarball
  if (!resolvedVersion || !tarball) {
    throw new Error(`Could not find a published tarball for ${name}`)
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "x-cli-"))
  const archivePath = path.join(tempDir, "package.tgz")
  const extractDir = path.join(tempDir, "extract")

  try {
    const archiveResponse = await fetch(tarball)
    if (!archiveResponse.ok) {
      throw new Error(`Failed to download ${name} tarball`)
    }

    await fsp.writeFile(archivePath, new Uint8Array(await archiveResponse.arrayBuffer()))
    await fsp.mkdir(extractDir, { recursive: true })
    execFileSync("tar", ["-xzf", archivePath, "-C", extractDir])
    await cacheFromDirectory(path.join(extractDir, "package"), packageRoot)
    return resolvedVersion
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function fetchLatestVersion(name) {
  const metadata = await fetchPackageMetadata(name)
  const version = metadata["dist-tags"]?.latest
  if (!version) {
    throw new Error(`Could not determine the latest version for ${name}`)
  }
  return version
}

export async function readCachedVersion(packageRoot) {
  try {
    return (await fsp.readFile(cacheVersionPath(packageRoot), "utf8")).trim() || null
  } catch {
    return null
  }
}

export async function readInstalledVersion(name = platformPackageName()) {
  try {
    return await readPackageVersion(resolveInstalledPackageDir(name))
  } catch {
    return null
  }
}

export async function shouldCheckForUpdates(packageRoot, intervalMs) {
  try {
    const lastCheck = Number((await fsp.readFile(updateCheckPath(packageRoot), "utf8")).trim())
    if (Number.isFinite(lastCheck) && Date.now() - lastCheck < intervalMs) return false
  } catch {
  }

  await fsp.mkdir(path.join(packageRoot, "bin"), { recursive: true })
  await fsp.writeFile(updateCheckPath(packageRoot), `${Date.now()}\n`)
  return true
}

export async function acquireUpdateLock(packageRoot) {
  const lockFile = updateLockPath(packageRoot)

  try {
    const handle = await fsp.open(lockFile, "wx")
    return async () => {
      await handle.close().catch(() => {})
      await fsp.rm(lockFile, { force: true }).catch(() => {})
    }
  } catch {
    return null
  }
}

export function isNewerVersion(nextVersion, currentVersion) {
  const next = parseSemver(nextVersion)
  const current = parseSemver(currentVersion)
  if (!next || !current) return false
  if (next.major !== current.major) return next.major > current.major
  if (next.minor !== current.minor) return next.minor > current.minor
  return next.patch > current.patch
}

async function fetchPackageMetadata(name) {
  const encoded = encodeURIComponent(name)
  const response = await fetch(`https://registry.npmjs.org/${encoded}`)
  if (!response.ok) {
    throw new Error(`Could not fetch registry metadata for ${name}`)
  }

  return response.json()
}

async function readPackageVersion(packageDir) {
  const packageJson = JSON.parse(await fsp.readFile(path.join(packageDir, "package.json"), "utf8"))
  const version = packageJson?.version
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`Could not determine package version in ${packageDir}`)
  }

  return version
}

function parseSemver(input) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(input.trim())
  if (!match) return null

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}
