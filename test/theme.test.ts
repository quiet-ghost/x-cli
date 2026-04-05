import { describe, expect, it } from "bun:test"
import { builtinThemes } from "../src/theme/builtin-themes"
import { parseThemeDefinition } from "../src/theme/parse"

describe("builtinThemes", () => {
  it("embeds the opencode builtin theme catalog", () => {
    expect(builtinThemes.length).toBeGreaterThan(20)
    expect(builtinThemes.some((theme) => theme.id === "opencode")).toBe(true)
    expect(builtinThemes.some((theme) => theme.id === "rosepine")).toBe(true)
  })

  it("converts opencode theme files into app theme colors", () => {
    const theme = parseThemeDefinition("example.json", {
      defs: {
        bg: "#101010",
        panel: "#1a1a1a",
        border: "#303030",
        text: "#f0f0f0",
        muted: "#909090",
        primary: "#70d6ff",
        accent: "#ff70d6",
        success: "#7dffb3",
        warning: "#ffd37d",
        error: "#ff7d7d",
      },
      theme: {
        background: "bg",
        backgroundPanel: "panel",
        backgroundElement: "panel",
        border: "border",
        borderActive: "muted",
        primary: "primary",
        accent: "accent",
        success: "success",
        warning: "warning",
        error: "error",
        text: "text",
        textMuted: "muted",
      },
    })

    expect(theme).toEqual({
      id: "example",
      label: "Example",
      colors: {
        background: "#101010",
        panel: "#1a1a1a",
        panelMuted: "#1a1a1a",
        surface: "#1a1a1a",
        surfaceActive: "#909090",
        border: "#303030",
        text: "#f0f0f0",
        textMuted: "#909090",
        primary: "#70d6ff",
        accent: "#ff70d6",
        success: "#7dffb3",
        warning: "#ffd37d",
        error: "#ff7d7d",
        overlay: "#909090",
      },
    })
  })
})
