# x-cli

Post to X from the terminal with Bun, OpenTUI, and Solid.

## Install

```bash
bun install -g @quietghost/x-cli
x-cli
```

## Current scope

- text posts
- OAuth 2.0 user auth with PKCE
- clipboard screenshot paste on Linux
- image attach from a GUI file picker
- built-in and custom themes
- Rose Pine default theme

## Setup

1. Install dependencies:

```bash
bun install
```

2. Start the app once so it creates `~/.config/x-cli/config.toml`.

3. In the X Developer Console, configure OAuth 2.0 with this exact callback URL:

```text
http://127.0.0.1:32323/callback
```

4. Put your OAuth 2.0 `client_id` into `~/.config/x-cli/config.toml`.

5. If your app type is confidential, also add `client_secret`.

6. Launch the app and open Settings with `Ctrl+,`, then run `Connect account`.

## Development

```bash
bun run dev
bun run typecheck
bun test
```

## Release build

```bash
bun run build:single
bun run build:release
```

## Publish

The repository includes `.github/workflows/publish.yml`.

Before using it, add this GitHub Actions secret:

- `NPM_TOKEN`

Then run the workflow manually with a version like `0.1.0`.

You can either:

- provide an explicit `version`
- or provide a `bump` of `patch`, `minor`, or `major`

It will:

- build compiled platform packages
- publish platform packages to npm
- publish the wrapper package `@quietghost/x-cli`
- create or update the GitHub release and upload binary archives

## Custom themes

Drop theme JSON files into:

```text
~/.config/x-cli/themes/
```

They use the same shape as the built-ins in `src/theme/builtins/`.
