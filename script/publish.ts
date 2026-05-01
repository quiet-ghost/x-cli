#!/usr/bin/env bun

import { $ } from "bun"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const distDir = path.join(root, "dist")
const version = process.env["XCLI_VERSION"] || pkg.version

const entries = await fs.readdir(distDir, { withFileTypes: true })
const platformDirs = entries
  .filter((entry) => entry.isDirectory() && entry.name !== "assets" && entry.name !== "wrapper")
  .map((entry) => entry.name)
  .sort()

if (platformDirs.length === 0) {
  throw new Error("No built platform packages were found in dist/. Run bun run build:release first.")
}

const optionalDependencies = Object.fromEntries(
  await Promise.all(
    platformDirs.map(async (dirName) => {
      const packageJson = await Bun.file(path.join(distDir, dirName, "package.json")).json()
      return [packageJson.name as string, version]
    }),
  ),
)

const wrapperDir = path.join(distDir, "wrapper")
await $`rm -rf ${wrapperDir}`
await fs.mkdir(path.join(wrapperDir, "bin"), { recursive: true })
await fs.copyFile(path.join(root, "bin", "x-cli"), path.join(wrapperDir, "bin", "x-cli"))
await fs.copyFile(path.join(root, "script", "postinstall.mjs"), path.join(wrapperDir, "postinstall.mjs"))
await fs.copyFile(path.join(root, "script", "platform-package.mjs"), path.join(wrapperDir, "platform-package.mjs"))
await fs.copyFile(path.join(root, "script", "update.mjs"), path.join(wrapperDir, "update.mjs"))
await fs.copyFile(path.join(root, "README.md"), path.join(wrapperDir, "README.md"))

await fs.writeFile(
  path.join(wrapperDir, "package.json"),
  JSON.stringify(
      {
        name: "@quietghost/x-cli",
      version,
      license: pkg.license,
      description: "Post to X from the terminal with Bun and OpenTUI.",
      bin: {
        "x-cli": "./bin/x-cli",
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      optionalDependencies,
      publishConfig: {
        access: "public",
      },
      repository: pkg.repository,
    },
    null,
    2,
  ),
)

for (const dirName of platformDirs) {
  const cwd = path.join(distDir, dirName)
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(cwd)
  }
  await $`bun pm pack`.cwd(cwd)
  await $`npm publish *.tgz --access public`.cwd(cwd)
}

await $`chmod -R 755 .`.cwd(wrapperDir)
await $`bun pm pack`.cwd(wrapperDir)
await $`npm publish *.tgz --access public`.cwd(wrapperDir)

console.log(`published ${platformDirs.length + 1} npm package${platformDirs.length === 0 ? "" : "s"} for ${version}`)
