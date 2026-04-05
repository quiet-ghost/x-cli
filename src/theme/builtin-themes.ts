import aura from "./opencode-builtins/aura.json"
import ayu from "./opencode-builtins/ayu.json"
import carbonfox from "./opencode-builtins/carbonfox.json"
import catppuccinFrappe from "./opencode-builtins/catppuccin-frappe.json"
import catppuccinMacchiato from "./opencode-builtins/catppuccin-macchiato.json"
import catppuccin from "./opencode-builtins/catppuccin.json"
import cobalt2 from "./opencode-builtins/cobalt2.json"
import cursor from "./opencode-builtins/cursor.json"
import dracula from "./opencode-builtins/dracula.json"
import everforest from "./opencode-builtins/everforest.json"
import flexoki from "./opencode-builtins/flexoki.json"
import github from "./opencode-builtins/github.json"
import gruvbox from "./opencode-builtins/gruvbox.json"
import kanagawa from "./opencode-builtins/kanagawa.json"
import lucentOrng from "./opencode-builtins/lucent-orng.json"
import material from "./opencode-builtins/material.json"
import matrix from "./opencode-builtins/matrix.json"
import mercury from "./opencode-builtins/mercury.json"
import monokai from "./opencode-builtins/monokai.json"
import nightowl from "./opencode-builtins/nightowl.json"
import nord from "./opencode-builtins/nord.json"
import oneDark from "./opencode-builtins/one-dark.json"
import opencode from "./opencode-builtins/opencode.json"
import orng from "./opencode-builtins/orng.json"
import osakaJade from "./opencode-builtins/osaka-jade.json"
import palenight from "./opencode-builtins/palenight.json"
import rosepine from "./opencode-builtins/rosepine.json"
import solarized from "./opencode-builtins/solarized.json"
import synthwave84 from "./opencode-builtins/synthwave84.json"
import tokyonight from "./opencode-builtins/tokyonight.json"
import vercel from "./opencode-builtins/vercel.json"
import vesper from "./opencode-builtins/vesper.json"
import zenburn from "./opencode-builtins/zenburn.json"
import type { AppTheme } from "../domain/theme"
import { parseThemeDefinition } from "./parse"

export const builtinThemes: AppTheme[] = [
  parseThemeDefinition("aura", aura),
  parseThemeDefinition("ayu", ayu),
  parseThemeDefinition("carbonfox", carbonfox),
  parseThemeDefinition("catppuccin-frappe", catppuccinFrappe),
  parseThemeDefinition("catppuccin-macchiato", catppuccinMacchiato),
  parseThemeDefinition("catppuccin", catppuccin),
  parseThemeDefinition("cobalt2", cobalt2),
  parseThemeDefinition("cursor", cursor),
  parseThemeDefinition("dracula", dracula),
  parseThemeDefinition("everforest", everforest),
  parseThemeDefinition("flexoki", flexoki),
  parseThemeDefinition("github", github),
  parseThemeDefinition("gruvbox", gruvbox),
  parseThemeDefinition("kanagawa", kanagawa),
  parseThemeDefinition("lucent-orng", lucentOrng),
  parseThemeDefinition("material", material),
  parseThemeDefinition("matrix", matrix),
  parseThemeDefinition("mercury", mercury),
  parseThemeDefinition("monokai", monokai),
  parseThemeDefinition("nightowl", nightowl),
  parseThemeDefinition("nord", nord),
  parseThemeDefinition("one-dark", oneDark),
  parseThemeDefinition("opencode", opencode),
  parseThemeDefinition("orng", orng),
  parseThemeDefinition("osaka-jade", osakaJade),
  parseThemeDefinition("palenight", palenight),
  parseThemeDefinition("rosepine", rosepine),
  parseThemeDefinition("solarized", solarized),
  parseThemeDefinition("synthwave84", synthwave84),
  parseThemeDefinition("tokyonight", tokyonight),
  parseThemeDefinition("vercel", vercel),
  parseThemeDefinition("vesper", vesper),
  parseThemeDefinition("zenburn", zenburn),
].sort((left, right) => left.label.localeCompare(right.label))
