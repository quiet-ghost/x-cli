import type { Accessor } from "solid-js"
import { ModalFrame } from "../components/modal-frame"
import { useTheme } from "../../theme/context"

export type AuthModalState =
  | { phase: "starting"; url?: string }
  | { phase: "waiting"; url: string }
  | { phase: "exchanging"; url: string }
  | { phase: "done"; url: string }

export function AuthModal(props: { state: Accessor<AuthModalState> }) {
  const { current } = useTheme()
  const theme = () => current().colors

  return (
    <ModalFrame title="Connect X Account" subtitle="OAuth 2.0 with PKCE">
      <box gap={1}>
        <text fg={theme().text}>{messageFor(props.state())}</text>
        <text fg={theme().textMuted} wrapMode="word">
          Callback URL: `http://127.0.0.1:32323/callback`
        </text>
        {props.state().url ? (
          <text fg={theme().textMuted} wrapMode="word">
            If the browser did not open, visit: {props.state().url}
          </text>
        ) : undefined}
      </box>
    </ModalFrame>
  )
}

function messageFor(state: AuthModalState): string {
  if (state.phase === "starting") return "Preparing the browser login flow..."
  if (state.phase === "waiting") return "Approve access in the browser. x-cli is waiting for the callback on localhost."
  if (state.phase === "exchanging") return "Received the callback. Exchanging the authorization code for tokens..."
  return "Connected successfully. Returning to the composer..."
}
