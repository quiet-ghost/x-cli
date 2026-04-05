import { describe, expect, it } from "bun:test"
import { createOAuthStart, oauthScopes } from "../src/lib/oauth"

describe("createOAuthStart", () => {
  it("builds the expected X OAuth 2.0 URL", async () => {
    const start = await createOAuthStart({
      clientId: "client-id-123",
      redirectUri: "http://127.0.0.1:32323/callback",
    })

    const url = new URL(start.authorizeUrl)
    expect(url.origin).toBe("https://x.com")
    expect(url.pathname).toBe("/i/oauth2/authorize")
    expect(url.searchParams.get("client_id")).toBe("client-id-123")
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:32323/callback")
    expect(url.searchParams.get("scope")).toBe(oauthScopes().join(" "))
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(start.state.length).toBeGreaterThan(10)
    expect(start.codeVerifier.length).toBeGreaterThan(20)
  })
})
