import { RGBA, SyntaxStyle, type TextareaRenderable } from "@opentui/core"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import type { Attachment } from "./domain/attachment"
import { attachmentFromClipboard, attachmentFromFile, mergeAttachments } from "./lib/attachments"
import { countPostCharacters } from "./lib/char-count"
import { readClipboardImage } from "./lib/clipboard"
import { writeClipboardText } from "./lib/clipboard-write"
import { applyComposerHighlights } from "./lib/compose-highlights"
import { ConfigStore } from "./lib/config"
import { DraftStore } from "./lib/drafts"
import { errorMessage } from "./lib/errors"
import { pickMediaFiles } from "./lib/file-picker"
import { XClient } from "./lib/x-api"
import { ThemeProvider, useTheme } from "./theme/context"
import { DialogProvider, useDialog } from "./ui/dialog"
import { PaletteModal, type PaletteItem } from "./ui/components/palette-modal"
import { AuthModal, type AuthModalState } from "./ui/modals/auth-modal"
import { showPromptModal } from "./ui/modals/prompt-modal"
import { ComposeScreen } from "./ui/screens/compose-screen"
import { ThemeModal } from "./ui/modals/theme-modal"
import { ToastProvider, useToast } from "./ui/toast"

export function Root(props: { configStore: ConfigStore; appVersion: string }) {
  return (
    <ThemeProvider configStore={props.configStore}>
      <ToastProvider>
        <DialogProvider>
          <App configStore={props.configStore} appVersion={props.appVersion} />
        </DialogProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

function App(props: { configStore: ConfigStore; appVersion: string }) {
  const renderer = useRenderer()
  const dialog = useDialog()
  const toast = useToast()
  const theme = useTheme()
  const client = new XClient(props.configStore)

  const [content, setContent] = createSignal("")
  const [attachments, setAttachments] = createSignal<Attachment[]>([])
  const [posting, setPosting] = createSignal(false)
  const [config, setConfig] = createSignal(props.configStore.value)
  const [authState, setAuthState] = createSignal<AuthModalState>({ phase: "starting" })
  const [lastPostUrl, setLastPostUrl] = createSignal<string | undefined>()

  const characterCount = createMemo(() => countPostCharacters(content()))
  const activeAccountName = () => config().ui.active_account
  const activeAccount = () => config().accounts[activeAccountName()] ?? props.configStore.activeAccount
  const isConnected = () => Boolean(activeAccount().access_token)

  let textarea: TextareaRenderable | undefined
  let scratchTimer: ReturnType<typeof setTimeout> | undefined

  const setComposerValue = (value: string) => {
    textarea?.setText(value)
    setContent(value)
  }

  const clearComposer = () => {
    textarea?.setText("")
    setContent("")
    setAttachments([])
    void DraftStore.saveScratch(activeAccountName(), "")
  }

  const clearOrExit = () => {
    if (content().trim() || attachments().length > 0) {
      clearComposer()
      return
    }
    renderer.destroy()
  }

  const loadScratch = async (accountName: string) => {
    const scratch = await DraftStore.loadScratch(accountName)
    setComposerValue(scratch)
    setAttachments([])
  }

  const switchAccount = async (name: string) => {
    await DraftStore.saveScratch(activeAccountName(), content())
    const next = await props.configStore.saveActiveAccount(name)
    setConfig(next)
    await loadScratch(name)
  }

  const connectAccount = async () => {
    setAuthState({ phase: "starting" })
    dialog.replace(() => <AuthModal state={authState} />, "large")

    try {
      const next = await client.connect((state) => setAuthState(state))
      setConfig(next)
      toast.show({ variant: "success", message: `Connected @${next.accounts[next.ui.active_account]?.username ?? "account"}` })
      dialog.clear()
    } catch (error) {
      dialog.clear()
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  const logoutAccount = async () => {
    try {
      const next = await props.configStore.clearAuth()
      setConfig(next)
      setLastPostUrl(undefined)
      toast.show({ variant: "info", message: "Logged out of the active account." })
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  const reloadDiskState = async () => {
    try {
      const next = await props.configStore.reload()
      setConfig(next)
      await theme.reload()
      await loadScratch(next.ui.active_account)
      toast.show({ variant: "info", message: "Reloaded config and themes from disk." })
      dialog.clear()
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  const attachFromPicker = async () => {
    try {
      const files = await pickMediaFiles()
      if (files.length === 0) return
      const loaded: Attachment[] = []
      for (const file of files) loaded.push(await attachmentFromFile(file))
      setAttachments((current) => mergeAttachments(current, loaded))
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  const copyLastPostedUrl = async () => {
    const url = lastPostUrl()
    if (!url) {
      toast.show({ variant: "warning", message: "No post URL is available yet." })
      return
    }
    try {
      await writeClipboardText(url)
      toast.show({ variant: "success", message: "Copied post URL to clipboard." })
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  const openSwitchAccountPalette = () => {
    const items: PaletteItem[] = props.configStore.accountNames.map((name) => {
      const account = config().accounts[name]
      return {
        id: `account.${name}`,
        title: name,
        description: account?.username ? `@${account.username}` : "not connected",
        category: "Accounts",
        onSelect: async () => {
          await switchAccount(name)
          dialog.clear()
        },
      }
    })

    dialog.replace(() => <PaletteModal title="Accounts" placeholder="Switch account" items={items} />, "large")
  }

  const openDraftPalette = async (mode: "open" | "delete") => {
    const drafts = await DraftStore.list()
    const items: PaletteItem[] = drafts.map((draft) => ({
      id: draft.id,
      title: draft.name,
      description: new Date(draft.updatedAt).toLocaleString(),
      category: "Drafts",
      onSelect: async () => {
        if (mode === "delete") {
          await DraftStore.delete(draft.id)
          toast.show({ variant: "info", message: `Deleted draft ${draft.name}.` })
          await openDraftPalette("delete")
          return
        }

        const loaded = await DraftStore.load(draft.id)
        if (!loaded) return
        setComposerValue(loaded.content)
        dialog.clear()
      },
    }))

    dialog.replace(
      () => <PaletteModal title={mode === "open" ? "Drafts" : "Delete draft"} placeholder="Search drafts" items={items} />,
      "large",
    )
  }

  const saveDraft = async () => {
    if (!content().trim()) {
      toast.show({ variant: "warning", message: "Nothing to save yet." })
      return
    }

    const name = await showPromptModal(dialog, "Save Draft", "Draft name")
    if (!name) return

    await DraftStore.saveNamed(name, content())
    toast.show({ variant: "success", message: `Saved draft ${name}.` })
  }

  const createAccount = async () => {
    const name = await showPromptModal(dialog, "New Account", "Account name")
    if (!name) return
    try {
      const next = await props.configStore.createAccount(name)
      setConfig(next)
      await loadScratch(name)
      toast.show({ variant: "success", message: `Created account ${name}.` })
      await connectAccount()
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  const postAnother = () => {
    clearComposer()
    setLastPostUrl(undefined)
  }

  const postNow = async () => {
    const text = content().trim()
    if (!text && attachments().length === 0) {
      toast.show({ variant: "warning", message: "Nothing to post yet." })
      return
    }
    if (!characterCount().valid) {
      toast.show({ variant: "error", message: `Post is too long. X allows ${characterCount().maxLength} weighted characters.` })
      return
    }

    setPosting(true)
    try {
      const result = await client.createPost({ text: content(), attachments: attachments() })
      setLastPostUrl(result.url)
      clearComposer()
      toast.show({
        variant: "success",
        message: result.url ? `Posted. Use Ctrl+P to copy ${result.url}` : `Created post ${result.id}`,
        duration: 5000,
      })
    } catch (error) {
      toast.show({ variant: "error", title: "Posting failed", message: errorMessage(error), duration: 6000 })
    } finally {
      setPosting(false)
    }
  }

  const openCommandPalette = () => {
    const items: PaletteItem[] = [
      {
        id: "compose.post",
        title: "Post now",
        description: "ctrl+d",
        category: "Composer",
        onSelect: async () => {
          dialog.clear()
          await postNow()
        },
      },
      {
        id: "compose.copy-url",
        title: "Copy post URL",
        description: lastPostUrl() ? "copy latest" : "unavailable",
        category: "Composer",
        onSelect: async () => {
          dialog.clear()
          await copyLastPostedUrl()
        },
      },
      {
        id: "compose.post-another",
        title: "Post another",
        description: "clear composer",
        category: "Composer",
        onSelect: () => {
          dialog.clear()
          postAnother()
        },
      },
      {
        id: "draft.save",
        title: "Save draft",
        description: "store current text",
        category: "Drafts",
        onSelect: async () => {
          await saveDraft()
        },
      },
      {
        id: "draft.open",
        title: "Open draft",
        description: "load saved draft",
        category: "Drafts",
        onSelect: async () => {
          await openDraftPalette("open")
        },
      },
      {
        id: "draft.delete",
        title: "Delete draft",
        description: "remove saved draft",
        category: "Drafts",
        onSelect: async () => {
          await openDraftPalette("delete")
        },
      },
      {
        id: "account.connect",
        title: isConnected() ? "Reauthenticate account" : "Connect account",
        description: activeAccountName(),
        category: "Account",
        onSelect: async () => {
          await connectAccount()
        },
      },
      {
        id: "account.logout",
        title: "Logout account",
        description: activeAccount().username ? `@${activeAccount().username}` : activeAccountName(),
        category: "Account",
        onSelect: async () => {
          dialog.clear()
          await logoutAccount()
        },
      },
      {
        id: "account.switch",
        title: "Switch account",
        description: activeAccountName(),
        category: "Account",
        onSelect: () => openSwitchAccountPalette(),
      },
      {
        id: "account.new",
        title: "New account",
        description: "add another profile",
        category: "Account",
        onSelect: async () => {
          await createAccount()
        },
      },
      {
        id: "appearance.theme",
        title: `Theme: ${theme.current().label}`,
        description: "switch theme",
        category: "Appearance",
        onSelect: () => dialog.replace(() => <ThemeModal />, "large"),
      },
      {
        id: "system.reload",
        title: "Reload config and themes",
        description: "read from disk",
        category: "System",
        onSelect: async () => {
          await reloadDiskState()
        },
      },
      {
        id: "system.quit",
        title: "Quit",
        description: "exit x-cli",
        category: "System",
        onSelect: () => renderer.destroy(),
      },
    ]

    dialog.replace(() => <PaletteModal title="Commands" placeholder="Search commands" items={items} />, "large")
  }

  onMount(() => {
    void loadScratch(activeAccountName())
    if (!isConnected()) return
    void client.validateSession().then((next) => setConfig(next)).catch(() => {})
  })

  createEffect(() => {
    const account = activeAccountName()
    const text = content()
    if (scratchTimer) clearTimeout(scratchTimer)
    scratchTimer = setTimeout(() => {
      void DraftStore.saveScratch(account, text)
    }, 250)
  })

  createEffect(() => {
    const text = content()
    const currentTheme = theme.current()
    if (!textarea || textarea.isDestroyed) return
    applyComposerHighlights(textarea, text, currentTheme.colors)
  })

  onCleanup(() => {
    if (scratchTimer) clearTimeout(scratchTimer)
  })

  useKeyboard((event) => {
    if (event.defaultPrevented) return
    if (dialog.stack.length > 0) return
    if (posting()) return

    if (event.ctrl && event.name === "c") {
      event.preventDefault()
      event.stopPropagation()
      clearOrExit()
      return
    }

    if (event.name === "escape") {
      event.preventDefault()
      renderer.destroy()
    }
  })

  const handleComposerKey = async (event: {
    ctrl: boolean
    name: string
    preventDefault: () => void
    stopPropagation?: () => void
  }) => {
    if (posting()) return

    if (event.ctrl && event.name === "p") {
      event.preventDefault()
      event.stopPropagation?.()
      openCommandPalette()
      return
    }

    if (event.ctrl && event.name === "d") {
      event.preventDefault()
      event.stopPropagation?.()
      await postNow()
      return
    }

    if (event.ctrl && event.name === "u") {
      event.preventDefault()
      event.stopPropagation?.()
      await attachFromPicker()
      return
    }

    if (!(event.ctrl && event.name === "v")) return
    const image = await readClipboardImage().catch(() => null)
    if (!image) return
    event.preventDefault()
    event.stopPropagation?.()
    try {
      const attachment = attachmentFromClipboard(image.bytes, image.mime)
      setAttachments((current) => mergeAttachments(current, [attachment]))
    } catch (error) {
      toast.show({ variant: "error", message: errorMessage(error) })
    }
  }

  return (
    <ComposeScreen
      content={content()}
      onContentChange={setContent}
      onReady={(value) => {
        textarea = value
        textarea.syntaxStyle = SyntaxStyle.create()
      }}
      attachments={attachments()}
      onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
      connected={isConnected()}
      accountName={activeAccountName()}
      username={activeAccount().username}
      appVersion={props.appVersion}
      posting={posting()}
      status={""}
      modalOpen={dialog.stack.length > 0}
      weightedCount={characterCount().weightedLength}
      maxCount={characterCount().maxLength}
      countValid={characterCount().valid}
      onComposerKeyDown={handleComposerKey}
    />
  )
}
