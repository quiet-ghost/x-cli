import { PaletteModal } from "../components/palette-modal"

export function SettingsModal(props: {
  connected: boolean
  themeLabel: string
  onConnect: () => void | Promise<void>
  onThemes: () => void
  onReload: () => void | Promise<void>
}) {
  return (
    <PaletteModal
      title="Settings"
      items={[
        {
          id: "account.connect",
          title: props.connected ? "Reconnect account" : "Connect account",
          category: "Account",
          description: props.connected ? "refresh login" : "oauth2 flow",
          onSelect: props.onConnect,
        },
        {
          id: "appearance.themes",
          title: `Theme: ${props.themeLabel}`,
          category: "Appearance",
          description: "switch theme",
          onSelect: props.onThemes,
        },
        {
          id: "system.reload",
          title: "Reload config and themes",
          category: "System",
          description: "read from disk",
          onSelect: props.onReload,
        },
      ]}
      placeholder="Search settings"
    />
  )
}
