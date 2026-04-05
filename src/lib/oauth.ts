import { AppError } from "./errors"
import { randomId, sha256Base64Url } from "./crypto"

const scopes = ["tweet.read", "tweet.write", "users.read", "media.write", "offline.access"] as const

export type OAuthStart = {
  authorizeUrl: string
  state: string
  codeVerifier: string
}

export function oauthScopes(): string[] {
  return [...scopes]
}

export async function createOAuthStart(input: { clientId: string; redirectUri: string }): Promise<OAuthStart> {
  if (!input.clientId.trim()) {
    throw new AppError("Missing client_id in config.", "Add it to ~/.config/x-cli/config.toml before connecting.")
  }

  const state = randomId(24)
  const codeVerifier = randomId(48)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const url = new URL("https://x.com/i/oauth2/authorize")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", input.clientId)
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("scope", scopes.join(" "))
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")

  return {
    authorizeUrl: url.toString(),
    state,
    codeVerifier,
  }
}
