export function randomId(size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return toBase64Url(bytes)
}

export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return toBase64Url(new Uint8Array(digest))
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}
