#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"
import { cacheFromDirectory, downloadAndCacheFromRegistry, platformPackageName, resolveInstalledPackageDir } from "./platform-package.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageName = platformPackageName()

try {
  await cacheFromDirectory(resolveInstalledPackageDir(packageName), __dirname)
  console.log(`x-cli: cached platform package ${packageName}`)
} catch (error) {
  try {
    await downloadAndCacheFromRegistry(packageName, __dirname)
    console.log(`x-cli: downloaded and cached ${packageName}`)
  } catch (downloadError) {
    console.error(`x-cli: failed to resolve ${packageName}`)
    console.error(`Reinstall with: bun install -g @quietghost/x-cli`)
    console.error(downloadError instanceof Error ? downloadError.message : String(downloadError))
    process.exit(1)
  }
}
