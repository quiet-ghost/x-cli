import { z } from "zod"
import type { Attachment } from "../domain/attachment"
import type { AccountConfig, AppConfig, AuthSession } from "../domain/config"
import { AppError } from "./errors"
import { openExternal } from "./browser"
import { ConfigStore } from "./config"
import { createOAuthStart, oauthScopes } from "./oauth"

const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
})

const UserResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    username: z.string(),
  }),
})

const MediaResponseSchema = z.object({
  data: z.object({
    id: z.string(),
  }),
})

const CreatePostResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    text: z.string(),
  }),
})

type AuthStatus =
  | { phase: "starting"; url?: string }
  | { phase: "waiting"; url: string }
  | { phase: "exchanging"; url: string }
  | { phase: "done"; url: string }

export class XClient {
  readonly #configStore: ConfigStore

  constructor(configStore: ConfigStore) {
    this.#configStore = configStore
  }

  async connect(onStatus?: (status: AuthStatus) => void): Promise<AppConfig> {
    const account = this.#configStore.activeAccount
    onStatus?.({ phase: "starting" })

    const start = await createOAuthStart({
      clientId: account.client_id,
      redirectUri: account.redirect_uri,
    })

    const code = await waitForAuthorizationCode({
      redirectUri: account.redirect_uri,
      state: start.state,
      authorizeUrl: start.authorizeUrl,
      onStatus,
    })

    onStatus?.({ phase: "exchanging", url: start.authorizeUrl })
    const token = await exchangeAuthorizationCode(account, code, start.codeVerifier)
    const user = await this.getCurrentUser(token.accessToken)

    const next = await this.#configStore.saveAuth({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      userId: user.id,
      username: user.username,
    })

    onStatus?.({ phase: "done", url: start.authorizeUrl })
    return next
  }

  async createPost(input: { text: string; attachments: Attachment[] }): Promise<{ id: string; url?: string }> {
    const accessToken = await this.getAccessToken()
    const mediaIds: string[] = []

    for (const attachment of input.attachments) {
      mediaIds.push(await this.uploadMedia(accessToken, attachment))
    }

    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
      }),
    })

    const payload = await parseApiResponse(response, CreatePostResponseSchema, "Failed to create the post.")
    const username = this.#configStore.activeAccount.username

    return {
      id: payload.data.id,
      url: username ? `https://x.com/${username}/status/${payload.data.id}` : undefined,
    }
  }

  async validateSession(): Promise<AppConfig> {
    const accessToken = await this.getAccessToken()
    const user = await this.getCurrentUser(accessToken)
    return this.#configStore.saveAuth({
      accessToken,
      refreshToken: this.#configStore.activeAccount.refresh_token,
      expiresAt: this.#configStore.activeAccount.token_expires_at,
      userId: user.id,
      username: user.username,
    })
  }

  async getAccessToken(): Promise<string> {
    const account = this.#configStore.activeAccount
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : undefined
    const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() + 60_000 : false

    if (account.access_token && !isExpired) return account.access_token
    if (!account.refresh_token) {
      throw new AppError("You are not connected to X.", "Open Settings and run Connect account.")
    }

    const refreshed = await refreshAccessToken(account)
    await this.#configStore.saveAuth({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? account.refresh_token,
      expiresAt: refreshed.expiresAt,
      userId: account.user_id,
      username: account.username,
    })

    return refreshed.accessToken
  }

  private async getCurrentUser(accessToken: string): Promise<{ id: string; username: string }> {
    const response = await fetch("https://api.x.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const payload = await parseApiResponse(response, UserResponseSchema, "Failed to load the authenticated X user.")
    return payload.data
  }

  private async uploadMedia(accessToken: string, attachment: Attachment): Promise<string> {
    const form = new FormData()
    form.append("media", new File([Uint8Array.from(attachment.bytes)], attachment.filename, { type: attachment.mime }))
    form.append("media_category", "tweet_image")
    form.append("media_type", attachment.mime)

    const response = await fetch("https://api.x.com/2/media/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    })

    const payload = await parseApiResponse(response, MediaResponseSchema, `Failed to upload ${attachment.filename}.`)
    return payload.data.id
  }
}

async function waitForAuthorizationCode(input: {
  redirectUri: string
  state: string
  authorizeUrl: string
  onStatus?: (status: AuthStatus) => void
}): Promise<string> {
  const redirect = new URL(input.redirectUri)
  const hostname = redirect.hostname
  const pathname = redirect.pathname || "/"
  const port = redirect.port ? Number(redirect.port) : redirect.protocol === "https:" ? 443 : 80

  if (!["127.0.0.1", "localhost"].includes(hostname)) {
    throw new AppError("OAuth redirect_uri must point to localhost for the built-in auth flow.", `Current redirect_uri is ${input.redirectUri}.`)
  }

  let stopServer: (() => void) | undefined
  const stopServerSoon = () => {
    setTimeout(() => stopServer?.(), 250)
  }

  const codePromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      stopServer?.()
      reject(new AppError("Timed out waiting for X authorization.", "Approve the app in the browser and try again."))
    }, 5 * 60_000)

    const server = Bun.serve({
      hostname,
      port,
      fetch(request) {
        const url = new URL(request.url)
        if (url.pathname !== pathname) {
          return new Response("Not found", { status: 404 })
        }

        const returnedState = url.searchParams.get("state")
        const error = url.searchParams.get("error")
        const code = url.searchParams.get("code")

        if (error) {
          clearTimeout(timeout)
          stopServerSoon()
          reject(new AppError("X authorization was denied.", error))
          return htmlResponse({
            title: "Connection failed",
            body: "X did not approve the authorization request. You can close this tab and return to x-cli.",
            tone: "error",
          })
        }

        if (returnedState !== input.state || !code) {
          clearTimeout(timeout)
          stopServerSoon()
          reject(new AppError("X returned an invalid OAuth callback.", "The state or code was missing."))
          return htmlResponse({
            title: "Invalid callback",
            body: "The callback was missing required data. Return to x-cli and try connecting again.",
            tone: "error",
          })
        }

        clearTimeout(timeout)
        stopServerSoon()
        resolve(code)
        return htmlResponse({
          title: "Connected to cli-x",
          body: "Authorization succeeded. You can close this tab and return to x-cli.",
          tone: "success",
          autoClose: true,
        })
      },
    })

    stopServer = () => server.stop(true)
  })

  input.onStatus?.({ phase: "waiting", url: input.authorizeUrl })
  try {
    await openExternal(input.authorizeUrl)
    return codePromise
  } catch (error) {
    stopServer?.()
    throw error
  }
}

async function exchangeAuthorizationCode(config: AccountConfig, code: string, codeVerifier: string): Promise<AuthSession> {
  const body = new URLSearchParams({
    client_id: config.client_id,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirect_uri,
    code_verifier: codeVerifier,
  })

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: tokenHeaders(config),
    body,
  })

  const payload = await parseApiResponse(response, TokenResponseSchema, "Failed to exchange the X authorization code.")
  return toSession(payload)
}

async function refreshAccessToken(config: AccountConfig): Promise<AuthSession> {
  const refreshToken = config.refresh_token
  if (!refreshToken) {
    throw new AppError("No refresh token is stored.", "Reconnect the app from Settings.")
  }

  const body = new URLSearchParams({
    client_id: config.client_id,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: tokenHeaders(config),
    body,
  })

  const payload = await parseApiResponse(response, TokenResponseSchema, "Failed to refresh the X access token.")
  return toSession(payload)
}

function tokenHeaders(config: AccountConfig): HeadersInit {
  if (!config.client_secret) {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
    }
  }

  const basic = Buffer.from(`${config.client_id}:${config.client_secret}`).toString("base64")
  return {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }
}

function toSession(payload: z.infer<typeof TokenResponseSchema>): AuthSession {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : undefined,
  }
}

async function parseApiResponse<T>(response: Response, schema: z.ZodSchema<T>, fallbackMessage: string): Promise<T> {
  const text = await response.text()
  const json = text ? safeJson(text) : undefined

  if (!response.ok) {
    const detail = errorDetail(json) ?? response.statusText
    throw new AppError(fallbackMessage, detail)
  }

  return schema.parse(json)
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function errorDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined

  const record = payload as Record<string, unknown>
  const errors = record["errors"]
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0]
    if (first && typeof first === "object") {
      const title = typeof first["title"] === "string" ? first["title"] : undefined
      const detail = typeof first["detail"] === "string" ? first["detail"] : undefined
      if (title && detail) return `${title}: ${detail}`
      if (detail) return detail
      if (title) return title
    }
  }

  const message = typeof record["message"] === "string" ? record["message"] : undefined
  const detail = typeof record["detail"] === "string" ? record["detail"] : undefined
  const title = typeof record["title"] === "string" ? record["title"] : undefined
  return detail ?? message ?? title
}

function htmlResponse(input: {
  title: string
  body: string
  tone: "success" | "error"
  autoClose?: boolean
}): Response {
  const accent = input.tone === "success" ? "#9ccfd8" : "#eb6f92"
  const badge = input.tone === "success" ? "Connected" : "Action needed"
  const script = input.autoClose
    ? `<script>
setTimeout(() => {
  window.close()
}, 1200)
</script>`
    : ""

  return new Response(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${input.title}</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #191724;
        color: #e0def4;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .card {
        width: min(560px, calc(100vw - 32px));
        background: #1f1d2e;
        border: 1px solid #403d52;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }
      .badge {
        display: inline-block;
        margin-bottom: 16px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.04);
        color: ${accent};
        border: 1px solid ${accent};
        font-size: 13px;
        letter-spacing: 0.02em;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 34px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #908caa;
        font-size: 16px;
        line-height: 1.55;
      }
      .hint {
        margin-top: 20px;
        color: #e0def4;
      }
      .scopes {
        margin-top: 18px;
        font-size: 13px;
        color: #908caa;
      }
    </style>
    ${script}
  </head>
  <body>
    <main class="card">
      <div class="badge">${badge}</div>
      <h1>${input.title}</h1>
      <p>${input.body}</p>
      <p class="hint">Return to the terminal window. cli-x should now show your connected account.</p>
      <div class="scopes">Scopes: ${oauthScopes().join(", ")}</div>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  )
}
