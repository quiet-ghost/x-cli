import { createContext, Show, useContext, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"
import { useTerminalDimensions } from "@opentui/solid"
import type { AppTheme } from "../domain/theme"
import { useTheme } from "../theme/context"

export type ToastInput = {
  variant: "info" | "success" | "warning" | "error"
  title?: string
  message: string
  duration?: number
}

type ToastContextValue = {
  show: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue>()

export function ToastProvider(props: ParentProps) {
  const [store, setStore] = createStore<{ current: ToastInput | null }>({ current: null })
  let timer: ReturnType<typeof setTimeout> | undefined

  const show = (input: ToastInput) => {
    if (timer) clearTimeout(timer)
    setStore("current", input)
    timer = setTimeout(() => setStore("current", null), input.duration ?? 3500)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {props.children}
      <ToastView current={store.current} />
    </ToastContext.Provider>
  )
}

function ToastView(props: { current: ToastInput | null }) {
  const { current } = useTheme()
  const dimensions = useTerminalDimensions()
  const theme = () => current().colors

  return (
    <Show when={props.current}>
      {(toast) => (
        <box
          position="absolute"
          top={2}
          right={2}
          zIndex={3200}
          width={Math.min(44, dimensions().width - 4)}
          paddingRight={1}
          backgroundColor={theme().panel}
        >
          <box flexDirection="row" gap={1} paddingLeft={1}>
            <text fg={variantColor(theme(), toast().variant)}>•</text>
            <box>
              <Show when={toast().title}>
                <text fg={theme().text}>{toast().title}</text>
              </Show>
              <text fg={theme().textMuted} wrapMode="word">
                {toast().message}
              </text>
            </box>
          </box>
        </box>
      )}
    </Show>
  )
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error("useToast must be used within ToastProvider")
  return value
}

function variantColor(colors: AppTheme["colors"], variant: ToastInput["variant"]): string {
  if (variant === "success") return colors.success
  if (variant === "warning") return colors.warning
  if (variant === "error") return colors.error
  return colors.primary
}
