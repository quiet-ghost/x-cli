#!/usr/bin/env node

import fs from "node:fs"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const platformMap = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
}

const archMap = {
  x64: "x64",
  arm64: "arm64",
}

const platform = platformMap[os.platform()] || os.platform()
const arch = archMap[os.arch()] || os.arch()
const packageName = `@quietghost/x-cli-${platform}-${arch}`
const binaryName = platform === "windows" ? "x-cli.exe" : "x-cli"

try {
  const packageJsonPath = require.resolve(`${packageName}/package.json`)
  const packageDir = path.dirname(packageJsonPath)
  await cacheFromDirectory(packageDir)
  console.log(`x-cli: cached platform package ${packageName}`)
} catch (error) {
  try {
    await downloadAndCacheFromRegistry(packageName)
    console.log(`x-cli: downloaded and cached ${packageName}`)
  } catch (downloadError) {
    console.error(`x-cli: failed to resolve ${packageName}`)
    console.error(`Reinstall with: bun install -g @quietghost/x-cli`)
    console.error(downloadError instanceof Error ? downloadError.message : String(downloadError))
    process.exit(1)
  }
}

async function cacheFromDirectory(packageDir) {
  const sourceBinary = path.join(packageDir, "bin", binaryName)
  const sourceThemes = path.join(packageDir, "themes")
  const targetBinary = path.join(__dirname, "bin", ".x-cli")
  const targetThemes = path.join(__dirname, "themes")

  await fsp.mkdir(path.dirname(targetBinary), { recursive: true })
  await fsp.rm(targetBinary, { force: true }).catch(() => {})
  await fsp.rm(targetThemes, { recursive: true, force: true }).catch(() => {})
  await fsp.copyFile(sourceBinary, targetBinary)
  await fsp.chmod(targetBinary, 0o755).catch(() => {})
  await fsp.cp(sourceThemes, targetThemes, { recursive: true })
}

async function downloadAndCacheFromRegistry(name) {
  const encoded = encodeURIComponent(name)
  const response = await fetch(`https://registry.npmjs.org/${encoded}`)
  if (!response.ok) {
    throw new Error(`Could not fetch registry metadata for ${name}`)
  }

  const metadata = await response.json()
  const version = metadata["dist-tags"]?.latest
  const tarball = metadata.versions?.[version]?.dist?.tarball
  if (!version || !tarball) {
    throw new Error(`Could not find a published tarball for ${name}`)
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "x-cli-"))
  const archivePath = path.join(tempDir, "package.tgz")
  const extractDir = path.join(tempDir, "extract")
  const archiveResponse = await fetch(tarball)
  if (!archiveResponse.ok) {
    throw new Error(`Failed to download ${name} tarball`)
  }
  await Bun.write(archivePath, await archiveResponse.arrayBuffer())
  await fsp.mkdir(extractDir, { recursive: true })
  execFileSync("tar", ["-xzf", archivePath, "-C", extractDir])
  await cacheFromDirectory(path.join(extractDir, "package"))
  await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {})
}
