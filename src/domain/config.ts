export type AccountConfig = {
  client_id: string
  client_secret?: string
  redirect_uri: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  user_id?: string
  username?: string
}

export type AppConfig = {
  accounts: Record<string, AccountConfig>
  ui: {
    theme: string
    active_account: string
  }
}

export type AuthSession = {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  userId?: string
  username?: string
}
