import type { ParentProps } from "solid-js"
import { useDialog } from "../dialog"
import { useTheme } from "../../theme/context"

export function ModalFrame(props: ParentProps<{ title: string; subtitle?: string }>) {
  const dialog = useDialog()
  const { current } = useTheme()
  const theme = () => current().colors

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <box gap={0}>
          <text fg={theme().text}>{props.title}</text>
          {props.subtitle ? <text fg={theme().textMuted}>{props.subtitle}</text> : undefined}
        </box>
        <text fg={theme().textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      {props.children}
    </box>
  )
}
