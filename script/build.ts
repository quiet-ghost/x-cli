#!/usr/bin/env bun

import { $ } from "bun"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "../package.json"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const distDir = path.join(root, "dist")
const assetsDir = path.join(distDir, "assets")
const themeDir = path.join(root, "src", "theme", "opencode-builtins")
const version = process.env["XCLI_VERSION"] || pkg.version
const single = process.argv.includes("--single")
const plugin = createSolidTransformPlugin()
const skipInstall = process.argv.includes("--skip-install")

type Target = {
  platform: "linux" | "darwin" | "windows"
  os: "linux" | "darwin" | "win32"
  arch: "x64" | "arm64"
}

const allTargets: Target[] = [
  { platform: "linux", os: "linux", arch: "x64" },
  { platform: "linux", os: "linux", arch: "arm64" },
  { platform: "darwin", os: "darwin", arch: "x64" },
  { platform: "darwin", os: "darwin", arch: "arm64" },
  { platform: "windows", os: "win32", arch: "x64" },
  { platform: "windows", os: "win32", arch: "arm64" },
]

const targets = single
  ? allTargets.filter((target) => target.os === process.platform && target.arch === process.arch)
  : allTargets

await $`rm -rf ${distDir}`
await fs.mkdir(assetsDir, { recursive: true })

if (!skipInstall) {
  await $`bun install --os="*" --cpu="*" @opentui/core@${pkg.dependencies["@opentui/core"]}`.cwd(root)
}

for (const target of targets) {
  const slug = `x-cli-${target.platform}-${target.arch}`
  const packageName = `@quietghost/${slug}`
  const packageDir = path.join(distDir, slug)
  const binDir = path.join(packageDir, "bin")
  const themesTargetDir = path.join(packageDir, "themes")

  await fs.mkdir(binDir, { recursive: true })

  await Bun.build({
    entrypoints: [path.join(root, "src", "index.tsx")],
    tsconfig: path.join(root, "tsconfig.json"),
    plugins: [plugin],
    define: {
      XCLI_VERSION: JSON.stringify(version),
    },
    compile: {
      target: `bun-${target.platform}-${target.arch}` as never,
      outfile: path.join(binDir, "x-cli"),
      windows: {},
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadPackageJson: true,
      autoloadTsconfig: true,
    },
  })

  await fs.cp(themeDir, themesTargetDir, { recursive: true })
  await fs.writeFile(
    path.join(packageDir, "package.json"),
    JSON.stringify(
      {
        name: packageName,
        version,
        license: pkg.license,
        os: [target.os],
        cpu: [target.arch],
      },
      null,
      2,
    ),
  )

  if (target.os === process.platform && target.arch === process.arch) {
    const binaryName = target.platform === "windows" ? "x-cli.exe" : "x-cli"
    const binaryPath = path.join(binDir, binaryName)
    const output = await $`${binaryPath} --version`.text()
    console.log(`smoke test passed for ${slug}: ${output.trim()}`)
  }

  if (target.platform === "windows") {
    await $`zip -rq ${path.join(assetsDir, `${slug}.zip`)} .`.cwd(packageDir)
  } else {
    await $`tar -czf ${path.join(assetsDir, `${slug}.tar.gz`)} .`.cwd(packageDir)
  }
}

console.log(`built ${targets.length} platform package${targets.length === 1 ? "" : "s"} for ${version}`)
