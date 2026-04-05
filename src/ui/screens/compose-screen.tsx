import type { TextareaRenderable } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { createEffect, onMount, Show } from "solid-js"
import type { Attachment } from "../../domain/attachment"
import { useTheme } from "../../theme/context"
import { AttachmentList } from "../components/attachment-list"

export function ComposeScreen(props: {
  content: string
  onContentChange: (value: string) => void
  onReady: (textarea: TextareaRenderable) => void
  attachments: Attachment[]
  onRemoveAttachment: (id: string) => void
  connected: boolean
  username?: string
  posting: boolean
  status: string
  modalOpen: boolean
  weightedCount: number
  maxCount: number
  countValid: boolean
  onComposerKeyDown: (event: { ctrl: boolean; name: string; preventDefault: () => void }) => void | Promise<void>
}) {
  const { current } = useTheme()
  const dimensions = useTerminalDimensions()
  const theme = () => current().colors
  let textarea: TextareaRenderable | undefined

  const contentWidth = () => Math.min(104, Math.max(60, dimensions().width - 4))

  onMount(() => {
    setTimeout(() => {
      if (!textarea || textarea.isDestroyed) return
      textarea.focus()
    }, 1)
  })

  createEffect(() => {
    if (!textarea || textarea.isDestroyed) return
    textarea.traits = {
      suspend: props.modalOpen || props.posting,
    }
    if (props.modalOpen || props.posting) {
      textarea.blur()
      return
    }
    textarea.focus()
  })

  return (
    <box width="100%" height="100%" backgroundColor={theme().background} alignItems="center">
      <box flexGrow={1} />
      <box width={contentWidth()} backgroundColor={theme().panel} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1}>
          <Show
            when={!props.connected}
            fallback={
              undefined
            }
          >
            <text fg={theme().warning}>Connect your X account from Settings before posting.</text>
          </Show>

          <textarea
            ref={(value: TextareaRenderable) => {
              textarea = value
              props.onReady(value)
            }}
            initialValue={props.content}
            minHeight={8}
            maxHeight={12}
            textColor={props.posting ? theme().textMuted : theme().text}
            focusedTextColor={props.posting ? theme().textMuted : theme().text}
            placeholder="What's happening?"
            placeholderColor={theme().textMuted}
            focusedBackgroundColor={theme().panel}
            cursorColor={theme().primary}
            onContentChange={() => {
              if (!textarea) return
              props.onContentChange(textarea.plainText)
            }}
            onKeyDown={(event) => {
              void props.onComposerKeyDown(event)
              }}
            />

          <box flexDirection="row" justifyContent="space-between">
            <text wrapMode="none">
              <span style={{ fg: theme().text }}>ctrl+v</span>
              <span style={{ fg: theme().textMuted }}> paste </span>
              <span style={{ fg: theme().text }}>ctrl+p</span>
              <span style={{ fg: theme().textMuted }}> commands </span>
              <span style={{ fg: theme().text }}>ctrl+d</span>
              <span style={{ fg: theme().textMuted }}> post</span>
            </text>
            <text fg={props.countValid ? theme().textMuted : theme().warning}>
              {props.weightedCount}/{props.maxCount}
            </text>
          </box>

          <AttachmentList attachments={props.attachments} onRemove={props.onRemoveAttachment} />
      </box>
      <box flexGrow={1} />
      <box width="100%" paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <box flexDirection="row" justifyContent="flex-end">
          <Show
            when={props.connected && props.username}
            fallback={<text fg={props.connected ? theme().textMuted : theme().warning}>{props.connected ? "" : "connect"}</text>}
          >
            <text fg={theme().textMuted}>@{props.username}</text>
          </Show>
        </box>
      </box>
    </box>
  )
}
