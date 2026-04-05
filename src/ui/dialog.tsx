import { RGBA } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { createContext, Show, useContext, type JSX, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import { useTheme } from "../theme/context"

type DialogEntry = {
  render: () => JSX.Element
  size: "medium" | "large"
}

type DialogContextValue = {
  stack: DialogEntry[]
  replace: (render: () => JSX.Element, size?: "medium" | "large") => void
  clear: () => void
}

const DialogContext = createContext<DialogContextValue>()

export function DialogProvider(props: ParentProps) {
  const [store, setStore] = createStore<{ stack: DialogEntry[] }>({ stack: [] })

  useKeyboard((event) => {
    if (store.stack.length === 0) return
    if (!(event.name === "escape" || (event.ctrl && event.name === "c"))) return
    event.preventDefault()
    event.stopPropagation()
    setStore("stack", [])
  })

  const value: DialogContextValue = {
    get stack() {
      return store.stack
    },
    replace(render, size = "medium") {
      setStore("stack", [{ render, size }])
    },
    clear() {
      setStore("stack", [])
    },
  }

  return (
    <DialogContext.Provider value={value}>
      {props.children}
      <Show when={store.stack[0]}>
        {(entry) => <DialogLayer size={entry().size}>{entry().render()}</DialogLayer>}
      </Show>
    </DialogContext.Provider>
  )
}

function DialogLayer(props: ParentProps<{ size: "medium" | "large" }>) {
  const dimensions = useTerminalDimensions()
  const { current } = useTheme()
  const theme = () => current().colors
  const dialog = useDialog()

  const width = () => (props.size === "large" ? 88 : 62)
  const maxWidth = () => Math.max(28, dimensions().width - 4)
  const maxHeight = () => Math.max(8, dimensions().height - 3)
  const topPadding = () => Math.max(1, Math.floor(dimensions().height / 4))

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      position="absolute"
      left={0}
      top={0}
      zIndex={3000}
      alignItems="center"
      paddingTop={topPadding()}
      paddingBottom={1}
      backgroundColor={RGBA.fromInts(0, 0, 0, 145)}
      onMouseUp={() => dialog.clear()}
    >
      <box
        width={Math.min(width(), dimensions().width - 4)}
        maxWidth={maxWidth()}
        maxHeight={maxHeight()}
        backgroundColor={theme().panel}
        onMouseUp={(event) => event.stopPropagation()}
      >
        {props.children}
      </box>
    </box>
  )
}

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext)
  if (!value) throw new Error("useDialog must be used within DialogProvider")
  return value
}
