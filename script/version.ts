#!/usr/bin/env bun

import pkg from "../package.json"

type Bump = "major" | "minor" | "patch"

const explicitVersion = process.env["XCLI_VERSION"] || process.argv[2]
const bump = (process.env["XCLI_BUMP"] || process.argv[3]) as Bump | undefined

const version = explicitVersion ? normalizeVersion(explicitVersion) : bump ? incrementVersion(pkg.version, bump) : pkg.version

if (process.env["GITHUB_OUTPUT"]) {
  await Bun.write(process.env["GITHUB_OUTPUT"], `version=${version}\n`)
} else {
  console.log(version)
}

function incrementVersion(input: string, bump: Bump): string {
  const parsed = parseSemver(input)
  if (bump === "major") return `${parsed.major + 1}.0.0`
  if (bump === "minor") return `${parsed.major}.${parsed.minor + 1}.0`
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
}

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
