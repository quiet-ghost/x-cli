import { For, Show } from "solid-js"
import type { Attachment } from "../../domain/attachment"
import { useTheme } from "../../theme/context"

export function AttachmentList(props: { attachments: Attachment[]; onRemove: (id: string) => void }) {
  const { current } = useTheme()
  const theme = () => current().colors

  return (
    <Show when={props.attachments.length > 0}>
      <box gap={1} flexDirection="row" flexWrap="wrap">
        <For each={props.attachments}>
          {(attachment) => (
            <box backgroundColor={theme().panelMuted} paddingLeft={1} paddingRight={1} flexDirection="row" gap={1}>
              <text fg={theme().text}>{attachment.filename}</text>
              <text fg={theme().textMuted}>{Math.ceil(attachment.size / 1024)} KB</text>
              <text fg={theme().textMuted} onMouseUp={() => props.onRemove(attachment.id)}>
                x
              </text>
            </box>
          )}
        </For>
      </box>
    </Show>
  )
}
