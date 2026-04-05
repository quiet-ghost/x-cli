import { onCleanup } from "solid-js"
import { useDialog } from "../dialog"
import { PaletteModal } from "../components/palette-modal"
import { useTheme } from "../../theme/context"

export function ThemeModal() {
  const dialog = useDialog()
  const theme = useTheme()
  const initial = theme.current().id
  let confirmed = false

  onCleanup(() => {
    if (!confirmed) {
      void theme.setTheme(initial, false)
    }
  })

  return (
    <PaletteModal
      title="Themes"
      items={theme.themes().map((item) => ({
        id: item.id,
        title: item.label,
        description: item.id,
        onSelect: async () => {
          confirmed = true
          await theme.setTheme(item.id, true)
          dialog.clear()
        },
      }))}
      placeholder="Search themes"
      onMove={(item) => {
        const match = theme.themes().find((themeItem) => themeItem.id === item.id)
        if (!match) return
        void theme.setTheme(match.id, false)
      }}
      onClose={() => {
        void theme.setTheme(initial, false)
      }}
    />
  )
}
