#!/usr/bin/env node

import os from "node:os"
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

const platform = platformMap[os.platform()] || os.platform()
const arch = archMap[os.arch()] || os.arch()
const packageName = `@quietghost/x-cli-${platform}-${arch}`

try {
  require.resolve(`${packageName}/package.json`)
  console.log(`x-cli: found platform package ${packageName}`)
} catch (error) {
  console.error(`x-cli: failed to resolve ${packageName}`)
  console.error(`Reinstall with: bun install -g @quietghost/x-cli`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
