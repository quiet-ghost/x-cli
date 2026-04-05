import fs from "node:fs/promises"
import { parse } from "smol-toml"
import { z } from "zod"
import { Paths } from "./paths"
import { AppError } from "./errors"
import type { AccountConfig, AppConfig, AuthSession } from "../domain/config"

const defaultConfig: AppConfig = {
  accounts: {
    default: {
      client_id: "",
      redirect_uri: "http://127.0.0.1:32323/callback",
    },
  },
  ui: {
    theme: "rosepine",
    active_account: "default",
  },
}
const defaultAccount: AccountConfig = defaultConfig.accounts.default ?? {
  client_id: "",
  redirect_uri: "http://127.0.0.1:32323/callback",
}

const AccountSchema = z.object({
  client_id: z.string().default(""),
  client_secret: z.string().optional(),
  redirect_uri: z.string().default("http://127.0.0.1:32323/callback"),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_expires_at: z.string().optional(),
  user_id: z.string().optional(),
  username: z.string().optional(),
})

const ConfigSchema = z.object({
  x: AccountSchema.optional(),
  accounts: z.record(z.string(), AccountSchema).optional(),
  ui: z
    .object({
      theme: z.string().default("rosepine"),
      active_account: z.string().optional(),
    })
    .default(defaultConfig.ui),
})

export class ConfigStore {
  #config: AppConfig

  private constructor(config: AppConfig) {
    this.#config = config
  }

  static async open(): Promise<ConfigStore> {
    await fs.mkdir(Paths.configDir, { recursive: true, mode: 0o700 })
    await fs.mkdir(Paths.themesDir, { recursive: true, mode: 0o700 })
    await fs.mkdir(Paths.draftsDir, { recursive: true, mode: 0o700 })

    try {
      const text = await fs.readFile(Paths.configFile, "utf8")
      const parsed = normalizeConfig(ConfigSchema.parse(parse(text)))
      await setConfigMode()
      return new ConfigStore(parsed)
    } catch (error) {
      if (isMissingFile(error)) {
        await fs.writeFile(Paths.configFile, renderConfig(defaultConfig), { mode: 0o600 })
        await setConfigMode()
        return new ConfigStore(defaultConfig)
      }
      throw new AppError("Failed to load config file.", error instanceof Error ? error.message : undefined)
    }
  }

  get value(): AppConfig {
    return this.#config
  }

  get activeAccountName(): string {
    return this.#config.ui.active_account
  }

  get activeAccount(): AccountConfig {
    return this.#config.accounts[this.activeAccountName] ?? defaultAccount
  }

  get accountNames(): string[] {
    return Object.keys(this.#config.accounts)
  }

  async reload(): Promise<AppConfig> {
    const text = await fs.readFile(Paths.configFile, "utf8")
    const parsed = normalizeConfig(ConfigSchema.parse(parse(text)))
    this.#config = parsed
    return parsed
  }

  async save(next: AppConfig): Promise<AppConfig> {
    const normalized = normalizeConfig(next)
    this.#config = normalized
    await fs.writeFile(Paths.configFile, renderConfig(normalized), { mode: 0o600 })
    await setConfigMode()
    return normalized
  }

  async saveTheme(theme: string): Promise<AppConfig> {
    return this.save({
      ...this.#config,
      ui: {
        ...this.#config.ui,
        theme,
      },
    })
  }

  async saveActiveAccount(name: string): Promise<AppConfig> {
    if (!this.#config.accounts[name]) {
      throw new AppError("Account not found.", `No account named ${name} exists in config.`)
    }

    return this.save({
      ...this.#config,
      ui: {
        ...this.#config.ui,
        active_account: name,
      },
    })
  }

  async createAccount(name: string): Promise<AppConfig> {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new AppError("Account name is required.")
    }
    if (this.#config.accounts[trimmed]) {
      throw new AppError("Account already exists.", `Choose a different name than ${trimmed}.`)
    }

    const active = this.activeAccount
    return this.save({
      ...this.#config,
      accounts: {
        ...this.#config.accounts,
        [trimmed]: {
          client_id: active.client_id,
          client_secret: active.client_secret,
          redirect_uri: active.redirect_uri,
        },
      },
      ui: {
        ...this.#config.ui,
        active_account: trimmed,
      },
    })
  }

  async clearAuth(name = this.activeAccountName): Promise<AppConfig> {
    const account = this.#config.accounts[name]
    if (!account) {
      throw new AppError("Account not found.", `No account named ${name} exists in config.`)
    }

    return this.save({
      ...this.#config,
      accounts: {
        ...this.#config.accounts,
        [name]: {
          ...account,
          access_token: undefined,
          refresh_token: undefined,
          token_expires_at: undefined,
          user_id: undefined,
          username: undefined,
        },
      },
    })
  }

  async saveAccount(name: string, account: AccountConfig): Promise<AppConfig> {
    return this.save({
      ...this.#config,
      accounts: {
        ...this.#config.accounts,
        [name]: account,
      },
    })
  }

  async saveAuth(session: AuthSession, name = this.activeAccountName): Promise<AppConfig> {
    const account: AccountConfig = this.#config.accounts[name] ?? defaultAccount
    return this.save({
      ...this.#config,
      accounts: {
        ...this.#config.accounts,
        [name]: {
          ...account,
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          token_expires_at: session.expiresAt,
          user_id: session.userId,
          username: session.username,
        },
      },
    })
  }
}

function renderConfig(config: AppConfig): string {
  const accountNames = Object.keys(config.accounts)
  const activeName = config.ui.active_account
  const activeAccount = config.accounts[activeName] ?? config.accounts[accountNames[0] ?? "default"] ?? defaultAccount

  const lines = [
    "# X CLI configuration",
    "# Add your OAuth 2.0 client details from the X Developer Console.",
    "# For this app, set the callback URL in the X console to exactly:",
    `# ${activeAccount.redirect_uri}`,
    "",
    "[ui]",
    `theme = ${quote(config.ui.theme)}`,
    `active_account = ${quote(activeName)}`,
  ]

  for (const name of accountNames) {
    const account = config.accounts[name]!
    lines.push("", `[accounts.${name}]`, `client_id = ${quote(account.client_id)}`)

    if (account.client_secret) lines.push(`client_secret = ${quote(account.client_secret)}`)

    lines.push(`redirect_uri = ${quote(account.redirect_uri)}`)

    if (account.access_token) lines.push(`access_token = ${quote(account.access_token)}`)
    if (account.refresh_token) lines.push(`refresh_token = ${quote(account.refresh_token)}`)
    if (account.token_expires_at) lines.push(`token_expires_at = ${quote(account.token_expires_at)}`)
    if (account.user_id) lines.push(`user_id = ${quote(account.user_id)}`)
    if (account.username) lines.push(`username = ${quote(account.username)}`)
  }

  lines.push("")

  return `${lines.join("\n")}`
}

function normalizeConfig(input: z.infer<typeof ConfigSchema> | AppConfig): AppConfig {
  if ("accounts" in input && input.accounts && "active_account" in input.ui) {
    const normalizedAccounts: Record<string, AccountConfig> =
      Object.keys(input.accounts).length > 0 ? input.accounts : { default: defaultAccount }
    const names = Object.keys(normalizedAccounts)
    const active = input.ui.active_account && normalizedAccounts[input.ui.active_account] ? input.ui.active_account : names[0] ?? "default"
    return {
      accounts: normalizedAccounts,
      ui: {
        theme: input.ui.theme ?? defaultConfig.ui.theme,
        active_account: active,
      },
    }
  }

  const legacy = input as z.infer<typeof ConfigSchema>
  const accounts: Record<string, AccountConfig> =
    legacy.accounts && Object.keys(legacy.accounts).length > 0 ? legacy.accounts : { default: legacy.x ?? defaultAccount }
  const names = Object.keys(accounts)
  const active = legacy.ui.active_account && accounts[legacy.ui.active_account] ? legacy.ui.active_account : names[0] ?? "default"

  return {
    accounts,
    ui: {
      theme: legacy.ui.theme ?? defaultConfig.ui.theme,
      active_account: active,
    },
  }
}

function quote(value: string): string {
  return JSON.stringify(value)
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

async function setConfigMode(): Promise<void> {
  await fs.chmod(Paths.configFile, 0o600).catch(() => {})
}
