import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { createEffect, createSignal, For, onCleanup } from "solid-js"
import { useTheme } from "../../theme/context"
import { ModalFrame } from "./modal-frame"

export type MenuItem = {
  title: string
  description?: string
  onSelect?: () => void | Promise<void>
}

export function MenuModal(props: {
  title: string
  subtitle?: string
  items: MenuItem[]
  onMove?: (index: number) => void
  onClose?: () => void
}) {
  const dimensions = useTerminalDimensions()
  const { current } = useTheme()
  const theme = () => current().colors
  const [selected, setSelected] = createSignal(0)
  const listHeight = () => Math.max(4, Math.floor(dimensions().height / 2) - 4)
  let list: ScrollBoxRenderable | undefined

  const move = (next: number) => {
    if (props.items.length === 0) return
    const wrapped = next < 0 ? props.items.length - 1 : next >= props.items.length ? 0 : next
    setSelected(wrapped)
    props.onMove?.(wrapped)
  }

  useKeyboard((event) => {
    if (event.name === "up") {
      event.preventDefault()
      move(selected() - 1)
    }
    if (event.name === "down") {
      event.preventDefault()
      move(selected() + 1)
    }
    if (event.name === "return") {
      event.preventDefault()
      void props.items[selected()]?.onSelect?.()
    }
  })

  createEffect(() => {
    if (props.items.length === 0 || !list || list.isDestroyed) return
    list.scrollChildIntoView(menuRowId(selected()))
  })

  onCleanup(() => {
    props.onClose?.()
  })

  return (
    <ModalFrame title={props.title} subtitle={props.subtitle}>
      <scrollbox
        ref={(value: ScrollBoxRenderable) => {
          list = value
        }}
        scrollY
        maxHeight={listHeight()}
      >
        <box gap={1}>
          <For each={props.items}>
            {(item, index) => (
              <box
                id={menuRowId(index())}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={1}
                paddingBottom={1}
                backgroundColor={index() === selected() ? theme().surfaceActive : theme().surface}
                border
                borderColor={index() === selected() ? theme().primary : theme().border}
                onMouseUp={() => {
                  setSelected(index())
                  props.onMove?.(index())
                  void item.onSelect?.()
                }}
              >
                <text fg={index() === selected() ? theme().text : theme().textMuted}>{item.title}</text>
                {item.description ? (
                  <text fg={theme().textMuted} wrapMode="word">
                    {item.description}
                  </text>
                ) : undefined}
              </box>
            )}
          </For>
        </box>
      </scrollbox>
    </ModalFrame>
  )
}

function menuRowId(index: number): string {
  return `menu-item-${index}`
}
