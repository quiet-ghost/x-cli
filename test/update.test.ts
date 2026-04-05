import { describe, expect, it } from "bun:test"
import { reconcileUpdateState, shouldCheckForUpdates, updateCheckIntervalMs } from "../src/lib/update"

describe("shouldCheckForUpdates", () => {
  it("skips checks inside the 15 minute cache window", () => {
    const now = Date.parse("2026-04-05T12:15:00.000Z")
    expect(shouldCheckForUpdates("2026-04-05T12:00:01.000Z", now)).toBe(false)
  })

  it("allows checks once the 15 minute window has elapsed", () => {
    const now = Date.parse("2026-04-05T12:15:00.000Z")
    expect(shouldCheckForUpdates("2026-04-05T12:00:00.000Z", now)).toBe(true)
    expect(updateCheckIntervalMs).toBe(15 * 60 * 1000)
  })
})

describe("reconcileUpdateState", () => {
  it("notifies once when the installed package version changes", () => {
    const firstRun = reconcileUpdateState({
      state: { installedVersion: "0.1.3" },
      currentVersion: "0.1.4",
    })

    expect(firstRun.notification.updatedFrom).toBe("0.1.3")
    expect(firstRun.state.installedVersion).toBe("0.1.4")

    const secondRun = reconcileUpdateState({
      state: firstRun.state,
      currentVersion: "0.1.4",
    })

    expect(secondRun.notification.updatedFrom).toBeUndefined()
  })

  it("notifies once per newly discovered available version", () => {
    const firstRun = reconcileUpdateState({
      state: {},
      currentVersion: "0.1.4",
      latestVersion: "0.1.5",
      checkedAt: "2026-04-05T12:00:00.000Z",
    })

    expect(firstRun.notification.availableVersion).toBe("0.1.5")
    expect(firstRun.state.lastNotifiedAvailableVersion).toBe("0.1.5")

    const secondRun = reconcileUpdateState({
      state: firstRun.state,
      currentVersion: "0.1.4",
    })

    expect(secondRun.notification.availableVersion).toBeUndefined()

    const thirdRun = reconcileUpdateState({
      state: secondRun.state,
      currentVersion: "0.1.4",
      latestVersion: "0.1.6",
      checkedAt: "2026-04-05T12:15:00.000Z",
    })

    expect(thirdRun.notification.availableVersion).toBe("0.1.6")
  })

  it("ignores semver build metadata when comparing versions", () => {
    const result = reconcileUpdateState({
      state: { installedVersion: "0.1.4" },
      currentVersion: "0.1.4+sha.123",
      latestVersion: "0.1.4",
      checkedAt: "2026-04-05T12:00:00.000Z",
    })

    expect(result.notification.updatedFrom).toBeUndefined()
    expect(result.notification.availableVersion).toBeUndefined()
  })
})
