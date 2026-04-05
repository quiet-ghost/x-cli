import { describe, expect, it } from "bun:test"
import { mergeAttachments } from "../src/lib/attachments"
import type { Attachment } from "../src/domain/attachment"

function createAttachment(id: string): Attachment {
  return {
    id,
    filename: `${id}.png`,
    mime: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
    size: 3,
    source: "file",
  }
}

describe("mergeAttachments", () => {
  it("allows up to four images", () => {
    const result = mergeAttachments([createAttachment("1"), createAttachment("2")], [createAttachment("3"), createAttachment("4")])
    expect(result).toHaveLength(4)
  })

  it("rejects a fifth image", () => {
    expect(() =>
      mergeAttachments(
        [createAttachment("1"), createAttachment("2"), createAttachment("3"), createAttachment("4")],
        [createAttachment("5")],
      ),
    ).toThrow("up to 4 images")
  })
})
