#!/usr/bin/env bun

import path from "node:path"
import { fileURLToPath } from "node:url"

type PackageJson = {
  version?: unknown
}

const explicitVersion = process.env["XCLI_VERSION"] || process.argv[2]

if (!explicitVersion) {
  throw new Error("Missing version. Set XCLI_VERSION or pass a version argument like 0.1.3")
}

const version = normalizeVersion(explicitVersion)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJsonPath = path.join(__dirname, "..", "package.json")
const packageJson = (await Bun.file(packageJsonPath).json()) as PackageJson

if (typeof packageJson.version !== "string") {
  throw new Error(`Could not determine the current package version in ${packageJsonPath}`)
}

if (packageJson.version !== version) {
  await Bun.write(
    packageJsonPath,
    `${JSON.stringify(
      {
        ...(packageJson as Record<string, unknown>),
        version,
      },
      null,
      2,
    )}\n`,
  )
}

console.log(version)

function normalizeVersion(input: string): string {
  const parsed = parseSemver(input)
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`
}

function parseSemver(input: string): { major: number; minor: number; patch: number } {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(input.trim())
  if (!match) {
    throw new Error(`Invalid version: ${input}. Expected format like 0.1.0`)
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}
