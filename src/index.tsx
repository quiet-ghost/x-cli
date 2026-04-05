import { ConsolePosition } from "@opentui/core"
import { render } from "@opentui/solid"
import { ConfigStore } from "./lib/config"
import { Root } from "./app"

const configStore = await ConfigStore.open()

await render(() => <Root configStore={configStore} />, {
  targetFps: 30,
  exitOnCtrlC: false,
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    maxStoredLogs: 200,
    sizePercent: 35,
  },
})
