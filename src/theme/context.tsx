import { createContext, createSignal, onMount, useContext, type Accessor, type ParentProps } from "solid-js"
import type { AppTheme } from "../domain/theme"
import { ConfigStore } from "../lib/config"
import { builtinThemes, loadThemes } from "./load"

type ThemeContextValue = {
  current: Accessor<AppTheme>
  themes: Accessor<AppTheme[]>
  ready: Accessor<boolean>
  setTheme: (id: string, persist?: boolean) => Promise<boolean>
  reload: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>()

export function ThemeProvider(props: ParentProps<{ configStore: ConfigStore }>) {
  const initialThemes = builtinThemes()
  const initialCurrent =
    initialThemes.find((item) => item.id === props.configStore.value.ui.theme) ?? initialThemes[0] ?? fallbackTheme()

  const [themes, setThemes] = createSignal<AppTheme[]>(initialThemes)
  const [current, setCurrent] = createSignal<AppTheme>(initialCurrent)
  const [ready, setReady] = createSignal(false)

  const reload = async () => {
    const loaded = await loadThemes()
    setThemes(loaded)
    const next = loaded.find((item) => item.id === props.configStore.value.ui.theme) ?? loaded[0] ?? fallbackTheme()
    setCurrent(next)
    setReady(true)
  }

  const setTheme = async (id: string, persist = true) => {
    const match = themes().find((item) => item.id === id)
    if (!match) return false
    setCurrent(match)
    if (persist) await props.configStore.saveTheme(id)
    return true
  }

  onMount(() => {
    void reload()
  })

  return <ThemeContext.Provider value={{ current, themes, ready, setTheme, reload }}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used within ThemeProvider")
  return value
}

function fallbackTheme(): AppTheme {
  return {
    id: "fallback",
    label: "Fallback",
    colors: {
      background: "#000000",
      panel: "#111111",
      panelMuted: "#161616",
      surface: "#1f1f1f",
      surfaceActive: "#2a2a2a",
      border: "#333333",
      text: "#ffffff",
      textMuted: "#aaaaaa",
      primary: "#66ccff",
      accent: "#c792ea",
      success: "#50fa7b",
      warning: "#ffcb6b",
      error: "#ff5370",
      overlay: "#999999",
    },
  }
}
