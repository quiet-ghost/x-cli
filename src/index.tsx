import { ConsolePosition } from "@opentui/core"
import { render } from "@opentui/solid"
import pkg from "../package.json"
import { ConfigStore } from "./lib/config"
import { Root } from "./app"

declare const XCLI_VERSION: string | undefined

const runtimeVersion = process.env["XCLI_VERSION"]
export const appVersion = typeof runtimeVersion === "string" ? runtimeVersion : typeof XCLI_VERSION === "string" ? XCLI_VERSION : pkg.version

const args = process.argv.slice(2)

if (args.includes("--version") || args.includes("-v")) {
  console.log(appVersion)
  process.exit(0)
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(["x-cli", "", "Usage:", "  x-cli", "  x-cli --version", "  x-cli --help"].join("\n"))
  process.exit(0)
}

const configStore = await ConfigStore.open()

await render(() => <Root configStore={configStore} appVersion={appVersion} />, {
  targetFps: 30,
  exitOnCtrlC: false,
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    maxStoredLogs: 200,
    sizePercent: 35,
  },
})
