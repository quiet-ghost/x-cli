export type AttachmentSource = "clipboard" | "file"

export type Attachment = {
  id: string
  filename: string
  mime: string
  bytes: Uint8Array
  size: number
  source: AttachmentSource
}
