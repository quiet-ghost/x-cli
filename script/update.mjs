#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  acquireUpdateLock,
  downloadAndCacheFromRegistry,
  fetchLatestVersion,
  isNewerVersion,
  platformPackageName,
  readCachedVersion,
  readInstalledVersion,
  shouldCheckForUpdates,
} from "./platform-package.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = __dirname
const intervalMs = 60 * 60 * 1000

if (process.env["XCLI_DISABLE_AUTOUPDATE"] === "1") {
  process.exit(0)
}

const shouldCheck = await shouldCheckForUpdates(packageRoot, intervalMs)
if (!shouldCheck) {
  process.exit(0)
}

const releaseLock = await acquireUpdateLock(packageRoot)
if (!releaseLock) {
  process.exit(0)
}

try {
  const name = platformPackageName()
  const currentVersion = (await readCachedVersion(packageRoot)) ?? (await readInstalledVersion(name))
  const latestVersion = await fetchLatestVersion(name)

  if (!currentVersion || isNewerVersion(latestVersion, currentVersion)) {
    await downloadAndCacheFromRegistry(name, packageRoot, latestVersion)
  }
} catch {
} finally {
  await releaseLock()
}
