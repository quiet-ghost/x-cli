import { useTerminalDimensions } from "@opentui/solid"
import { Show } from "solid-js"
import { useTheme } from "../../theme/context"

export function StatusBar(props: {
  accountName: string
  username?: string
  version: string
  connected: boolean
}) {
  const dimensions = useTerminalDimensions()
  const { current } = useTheme()
  const theme = () => current().colors
  const narrow = () => dimensions().width < 72
  const versionLabel = () => (props.version === "dev" ? "dev" : `v${props.version}`)

  return (
    <box
      width="100%"
      flexDirection={narrow() ? "column" : "row"}
      justifyContent="space-between"
      backgroundColor={theme().panelMuted}
      paddingLeft={1}
      paddingRight={1}
      gap={narrow() ? 0 : 1}
    >
      <box flexDirection="row" flexWrap="wrap" gap={1}>
        <text fg={theme().text}>{props.accountName}</text>
        <Show when={props.username}>
          <text fg={theme().textMuted}>@{props.username}</text>
        </Show>
        <text fg={theme().accent}>{versionLabel()}</text>
      </box>
      <text fg={props.connected ? theme().success : theme().warning}>{props.connected ? "connected" : "not connected"}</text>
    </box>
  )
}
