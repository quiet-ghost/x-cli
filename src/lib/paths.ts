import os from "node:os"
import path from "node:path"

const homeDir = os.homedir()
const configDir = path.join(homeDir, ".config", "x-cli")

export const Paths = {
  homeDir,
  configDir,
  configFile: path.join(configDir, "config.toml"),
  themesDir: path.join(configDir, "themes"),
  draftsDir: path.join(configDir, "drafts"),
} as const
