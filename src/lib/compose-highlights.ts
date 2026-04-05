import { RGBA, SyntaxStyle, type TextareaRenderable } from "@opentui/core"
import type { AppTheme } from "../domain/theme"

export function applyComposerHighlights(textarea: TextareaRenderable, text: string, colors: AppTheme["colors"]): void {
  const syntaxStyle = SyntaxStyle.create()
  const urlStyle = syntaxStyle.registerStyle("xcli.url", {
    fg: RGBA.fromHex(colors.primary),
    underline: true,
  })
  const mentionStyle = syntaxStyle.registerStyle("xcli.mention", {
    fg: RGBA.fromHex(colors.accent),
  })
  const hashtagStyle = syntaxStyle.registerStyle("xcli.hashtag", {
    fg: RGBA.fromHex(colors.warning),
  })

  textarea.syntaxStyle = syntaxStyle
  textarea.clearAllHighlights()

  addMatches(textarea, text, /https?:\/\/[^\s]+/g, urlStyle)
  addMatches(textarea, text, /(^|[^\p{L}\p{N}_])(@[\p{L}\p{N}_]{1,15})/gu, mentionStyle, 2)
  addMatches(textarea, text, /(^|[^\p{L}\p{N}_])(#[\p{L}\p{N}_]+)/gu, hashtagStyle, 2)
}

function addMatches(
  textarea: TextareaRenderable,
  text: string,
  pattern: RegExp,
  styleId: number,
  groupIndex?: number,
): void {
  for (const match of text.matchAll(pattern)) {
    const wholeStart = match.index
    if (wholeStart === undefined) continue
    const wholeText = match[0] ?? ""
    const target = groupIndex ? match[groupIndex] : wholeText
    if (!target) continue
    const localOffset = groupIndex ? wholeText.indexOf(target) : 0
    const startIndex = wholeStart + localOffset
    const endIndex = startIndex + target.length
    textarea.addHighlightByCharRange({
      start: displayOffset(text, startIndex),
      end: displayOffset(text, endIndex),
      styleId,
      priority: 0,
    })
  }
}

function displayOffset(text: string, index: number): number {
  return Bun.stringWidth(text.slice(0, index).replace(/\n/g, ""))
}
