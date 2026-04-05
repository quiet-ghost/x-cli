import type { InputRenderable } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useDialog } from "../dialog"
import { useTheme } from "../../theme/context"

export type PaletteItem = {
  id: string
  title: string
  description?: string
  category?: string
  onSelect?: () => void | Promise<void>
}

export function PaletteModal(props: {
  title: string
  placeholder?: string
  items: PaletteItem[]
  onMove?: (item: PaletteItem) => void
  onClose?: () => void
}) {
  const dialog = useDialog()
  const dimensions = useTerminalDimensions()
  const { current } = useTheme()
  const theme = () => current().colors
  const [selected, setSelected] = createSignal(0)
  const [filter, setFilter] = createSignal("")

  let input: InputRenderable | undefined

  const filtered = createMemo(() => {
    const query = filter().trim().toLowerCase()
    if (!query) return props.items
    return props.items.filter((item) => {
      return [item.title, item.description, item.category].some((part) => part?.toLowerCase().includes(query))
    })
  })

  const grouped = createMemo(() => {
    const map = new Map<string, PaletteItem[]>()
    for (const item of filtered()) {
      const category = item.category ?? ""
      const existing = map.get(category)
      if (existing) existing.push(item)
      else map.set(category, [item])
    }
    return [...map.entries()]
  })

  const resultsHeight = () => Math.max(4, Math.floor(dimensions().height / 2) - 4)

  const moveTo = (index: number) => {
    const items = filtered()
    if (items.length === 0) return
    const wrapped = index < 0 ? items.length - 1 : index >= items.length ? 0 : index
    setSelected(wrapped)
    const item = items[wrapped]
    if (item) props.onMove?.(item)
  }

  const activate = () => {
    const item = filtered()[selected()]
    if (!item) return
    void item.onSelect?.()
  }

  useKeyboard((event) => {
    if (event.name === "up") {
      event.preventDefault()
      event.stopPropagation()
      moveTo(selected() - 1)
      return
    }
    if (event.name === "down") {
      event.preventDefault()
      event.stopPropagation()
      moveTo(selected() + 1)
      return
    }
    if (event.name === "return") {
      event.preventDefault()
      event.stopPropagation()
      activate()
    }
  })

  onMount(() => {
    setTimeout(() => {
      if (!input || input.isDestroyed) return
      input.focus()
    }, 1)
    const first = filtered()[0]
    if (first) props.onMove?.(first)
  })

  onCleanup(() => {
    props.onClose?.()
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1} width="100%">
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().text}>{props.title}</text>
        <text fg={theme().textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <input
        ref={(value: InputRenderable) => {
          input = value
        }}
        placeholder={props.placeholder ?? "Search"}
        placeholderColor={theme().textMuted}
        focusedTextColor={theme().textMuted}
        focusedBackgroundColor={theme().panel}
        cursorColor={theme().primary}
        onInput={(value) => {
          setFilter(value)
          setSelected(0)
          const first = filtered()[0]
          if (first) props.onMove?.(first)
        }}
      />
      <Show when={filtered().length > 0} fallback={<text fg={theme().textMuted}>No results</text>}>
        <scrollbox scrollY maxHeight={resultsHeight()} paddingRight={1}>
          <box gap={1}>
            <For each={grouped()}>
              {([category, items]) => (
                <box gap={0}>
                  <Show when={category}>
                    <box paddingTop={1}>
                      <text fg={theme().accent}>{category}</text>
                    </box>
                  </Show>
                  <For each={items}>
                    {(item) => {
                      const active = () => filtered()[selected()]?.id === item.id
                      return (
                        <box
                          width="100%"
                          backgroundColor={active() ? theme().primary : theme().panel}
                          paddingLeft={1}
                          paddingRight={1}
                          paddingTop={1}
                          paddingBottom={1}
                          onMouseDown={() => {
                            const index = filtered().findIndex((entry) => entry.id === item.id)
                            if (index >= 0) moveTo(index)
                          }}
                          onMouseUp={() => activate()}
                        >
                          <box flexDirection="row" justifyContent="space-between" gap={2}>
                            <text fg={active() ? selectedText(theme().primary) : theme().text}>{item.title}</text>
                            <Show when={item.description}>
                              <text fg={active() ? selectedText(theme().primary) : theme().textMuted}>{item.description}</text>
                            </Show>
                          </box>
                        </box>
                      )
                    }}
                  </For>
                </box>
              )}
            </For>
          </box>
        </scrollbox>
      </Show>
    </box>
  )
}

function selectedText(color: string): string {
  const hex = color.replace(/^#/, "")
  const normalized = hex.length === 3 ? hex.split("").map((item) => item + item).join("") : hex
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance > 0.6 ? "#111111" : "#f8f8f2"
}
