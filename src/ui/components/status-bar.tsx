import { useTheme } from "../../theme/context"

export function StatusBar(props: { status: string; username?: string; connected: boolean }) {
  const { current } = useTheme()
  const theme = () => current().colors

  return (
    <box flexDirection="row" justifyContent="space-between" backgroundColor={theme().panelMuted} paddingLeft={1} paddingRight={1}>
      <text fg={theme().textMuted}>{props.status}</text>
      <text fg={props.connected ? theme().success : theme().warning}>
        {props.connected ? `connected${props.username ? ` as @${props.username}` : ""}` : "not connected"}
      </text>
    </box>
  )
}
