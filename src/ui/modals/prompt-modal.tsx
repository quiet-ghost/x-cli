import type { InputRenderable } from "@opentui/core"
import { createSignal, onMount } from "solid-js"
import { useDialog } from "../dialog"
import { ModalFrame } from "../components/modal-frame"
import { useTheme } from "../../theme/context"

export function PromptModal(props: {
  title: string
  placeholder: string
  initialValue?: string
  onSubmit: (value: string) => void | Promise<void>
}) {
  const dialog = useDialog()
  const { current } = useTheme()
  const theme = () => current().colors
  const [value, setValue] = createSignal(props.initialValue ?? "")
  let input: InputRenderable | undefined

  onMount(() => {
    setTimeout(() => {
      if (!input || input.isDestroyed) return
      input.focus()
    }, 1)
  })

  return (
    <ModalFrame title={props.title}>
      <box gap={1}>
        <input
          ref={(renderable: InputRenderable) => {
            input = renderable
          }}
          value={props.initialValue}
          placeholder={props.placeholder}
          placeholderColor={theme().textMuted}
          focusedBackgroundColor={theme().panel}
          focusedTextColor={theme().text}
          cursorColor={theme().primary}
          onInput={(next) => setValue(next)}
          onSubmit={async (submitted) => {
            if (typeof submitted !== "string") return
            await props.onSubmit(submitted)
          }}
        />
        <text fg={theme().textMuted}>enter submit</text>
      </box>
    </ModalFrame>
  )
}

export function showPromptModal(dialog: ReturnType<typeof useDialog>, title: string, placeholder: string, initialValue?: string) {
  return new Promise<string | null>((resolve) => {
    dialog.replace(() => (
      <PromptModal
        title={title}
        placeholder={placeholder}
        initialValue={initialValue}
        onSubmit={(value) => {
          resolve(value.trim() || null)
          dialog.clear()
        }}
      />
    ))
  })
}
