import { StrictMode } from "react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defaultEditorSnapshot, EDITOR_STORAGE_KEY, LEGACY_PAGE_NAME_KEY, loadEditorSnapshot } from "../state/editorPersistence"
import useEditorPersistence from "./useEditorPersistence"

const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>

function data(content = "") {
  const value = defaultEditorSnapshot()
  value.text.content = content
  return {
    textConfig: value.text,
    filterConfig: value.filter,
    watermarkConfig: { ...value.watermark, image: null },
    exportConfig: value.export,
  }
}

describe("useEditorPersistence", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  it("does not overwrite restored state during startup and saves the latest debounced value", () => {
    const saved = defaultEditorSnapshot(); saved.text.content = "restored"
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(saved))
    const write = vi.spyOn(Storage.prototype, "setItem")
    const initial = loadEditorSnapshot()
    const { rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data("restored") }, wrapper })
    expect(write).not.toHaveBeenCalled()
    rerender({ value: data("first") }); rerender({ value: data("último\ntexto") })
    act(() => vi.advanceTimersByTime(300))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("último\ntexto")
    expect(write).toHaveBeenCalledTimes(1)
  })

  it("does not save when only an unrelated rerender occurs", () => {
    const write = vi.spyOn(Storage.prototype, "setItem")
    const initial = loadEditorSnapshot()
    const current = data()
    const { rerender } = renderHook(({ value, zoom: _zoom }) => useEditorPersistence(initial, value), { initialProps: { value: current, zoom: 1 }, wrapper })
    rerender({ value: current, zoom: 2 })
    act(() => vi.advanceTimersByTime(500))
    expect(write).not.toHaveBeenCalled()
  })

  it.each([
    ["debounce", (finish: () => void) => finish()],
    ["pagehide", () => window.dispatchEvent(new PageTransitionEvent("pagehide"))],
    ["visibility", () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
      document.dispatchEvent(new Event("visibilitychange"))
    }],
  ])("discards A after returning to the saved baseline before %s", (_name, trigger) => {
    const saved = defaultEditorSnapshot(); saved.text.content = "baseline"
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(saved))
    const write = vi.spyOn(Storage.prototype, "setItem")
    const initial = loadEditorSnapshot()
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data("baseline") }, wrapper })
    rerender({ value: data("A") })
    rerender({ value: data("baseline") })
    act(() => trigger(() => vi.advanceTimersByTime(300)))
    act(() => vi.advanceTimersByTime(300))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("baseline")
    expect(write).not.toHaveBeenCalled()
    expect(result.current.status).toBe("restored")
  })

  it("discards A and B after returning to the saved baseline", () => {
    const saved = defaultEditorSnapshot(); saved.text.content = "baseline"
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(saved))
    const write = vi.spyOn(Storage.prototype, "setItem")
    const initial = loadEditorSnapshot()
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data("baseline") }, wrapper })
    rerender({ value: data("A") }); rerender({ value: data("B") }); rerender({ value: data("baseline") })
    act(() => vi.advanceTimersByTime(300))
    expect(write).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("baseline")
    expect(result.current.status).toBe("restored")
  })

  it("discards a failed pending write when state returns to the last successful baseline", () => {
    const saved = defaultEditorSnapshot(); saved.text.content = "baseline"
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(saved))
    const initial = loadEditorSnapshot()
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota") })
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data("baseline") }, wrapper })
    rerender({ value: data("A") }); act(() => vi.advanceTimersByTime(300))
    expect(result.current.status).toBe("unavailable")
    rerender({ value: data("baseline") })
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")))
    act(() => vi.advanceTimersByTime(300))
    expect(write).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("baseline")
    expect(result.current.status).toBe("restored")
  })

  it("replaces a discarded edit with the genuine outstanding legacy migration", () => {
    localStorage.setItem(LEGACY_PAGE_NAME_KEY, "Legacy")
    const initial = loadEditorSnapshot()
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota") })
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), {
      initialProps: { value: { ...data(), textConfig: initial.snapshot.text } }, wrapper,
    })
    expect(result.current.status).toBe("unavailable")
    rerender({ value: data("discard me") })
    rerender({ value: { ...data(), textConfig: initial.snapshot.text } })
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")))
    expect(write).toHaveBeenCalledTimes(2)
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("")
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.pageName).toBe("Legacy")
    expect(localStorage.getItem(LEGACY_PAGE_NAME_KEY)).toBeNull()
    expect(result.current.status).toBe("saved")
  })

  it("flushes pending work on pagehide and hidden visibility", () => {
    const initial = loadEditorSnapshot()
    const { rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    rerender({ value: data("page hide") })
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("page hide")
    rerender({ value: data("hidden") })
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("hidden")
  })

  it("cleans timers/listeners in StrictMode and recovers after a failed save retry", () => {
    const removeWindow = vi.spyOn(window, "removeEventListener")
    const removeDocument = vi.spyOn(document, "removeEventListener")
    const initial = loadEditorSnapshot()
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota") })
    const { result, rerender, unmount } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    rerender({ value: data("safe in memory") })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.status).toBe("unavailable")
    act(() => result.current.retry())
    expect(result.current.status).toBe("saved")
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("safe in memory")
    unmount()
    expect(removeWindow).toHaveBeenCalledWith("pagehide", expect.any(Function))
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    expect(setItem).toHaveBeenCalledTimes(2)
  })

  it("reset cancels pending old data and allows later edits to save", () => {
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(defaultEditorSnapshot()))
    const initial = loadEditorSnapshot()
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    rerender({ value: data("must not return") })
    act(() => expect(result.current.clearSavedEditor()).toBe(true))
    act(() => vi.advanceTimersByTime(500))
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).toBeNull()
    rerender({ value: data() })
    rerender({ value: data("new work") })
    act(() => vi.advanceTimersByTime(300))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("new work")
  })

  it("reports a storage removal failure without claiming reset succeeded", () => {
    const initial = loadEditorSnapshot()
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked") })
    const { result } = renderHook(() => useEditorPersistence(initial, data()), { wrapper })
    act(() => expect(result.current.clearSavedEditor()).toBe(false))
    expect(result.current.status).toBe("reset-error")
    expect(remove).toHaveBeenCalledWith(LEGACY_PAGE_NAME_KEY)
  })

  it("never overwrites a future snapshot through edits, retry, timers, or lifecycle flushes", () => {
    const raw = JSON.stringify({ version: 99, future: "bytes stay exact" })
    localStorage.setItem(EDITOR_STORAGE_KEY, raw)
    const initial = loadEditorSnapshot()
    const write = vi.spyOn(Storage.prototype, "setItem")
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    rerender({ value: data("edit") })
    act(() => { result.current.retry(); vi.advanceTimersByTime(300) })
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")))
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).toBe(raw)
    expect(write).not.toHaveBeenCalled()
    expect(result.current.status).toBe("unsupported")
  })

  it("keeps both keys and pending work when the first reset removal fails", () => {
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(defaultEditorSnapshot()))
    localStorage.setItem(LEGACY_PAGE_NAME_KEY, "legacy")
    const initial = loadEditorSnapshot()
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    rerender({ value: data("pending") })
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => {
      if (key === LEGACY_PAGE_NAME_KEY) throw new Error("blocked")
    })
    act(() => expect(result.current.clearSavedEditor()).toBe(false))
    expect(result.current.status).toBe("reset-error")
    expect(localStorage.getItem(LEGACY_PAGE_NAME_KEY)).toBe("legacy")
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).not.toBeNull()
    act(() => vi.advanceTimersByTime(300))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("pending")
  })

  it("removes legacy first but preserves the modern snapshot and pending work if the second removal fails", () => {
    const saved = defaultEditorSnapshot()
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(saved))
    localStorage.setItem(LEGACY_PAGE_NAME_KEY, "legacy")
    const initial = loadEditorSnapshot()
    const originalRemove = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (this: Storage, key) {
      if (key === EDITOR_STORAGE_KEY) throw new Error("blocked")
      return originalRemove.call(this, key)
    })
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    rerender({ value: data("pending") })
    act(() => expect(result.current.clearSavedEditor()).toBe(false))
    expect(result.current.status).toBe("reset-error")
    expect(localStorage.getItem(LEGACY_PAGE_NAME_KEY)).toBeNull()
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).toBe(JSON.stringify(saved))
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.status).toBe("saved")
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("pending")
  })

  it("keeps future protection after failed reset and unlocks only after a successful reset", () => {
    const raw = JSON.stringify({ version: 50, future: true })
    localStorage.setItem(EDITOR_STORAGE_KEY, raw)
    const initial = loadEditorSnapshot()
    const originalRemove = Storage.prototype.removeItem
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => undefined).mockImplementationOnce(() => { throw new Error("blocked") })
    const { result, rerender } = renderHook(({ value }) => useEditorPersistence(initial, value), { initialProps: { value: data() }, wrapper })
    act(() => expect(result.current.clearSavedEditor()).toBe(false))
    expect(result.current.status).toBe("reset-error")
    rerender({ value: data("must not save") })
    act(() => { result.current.retry(); vi.advanceTimersByTime(300); window.dispatchEvent(new PageTransitionEvent("pagehide")) })
    expect(result.current.status).toBe("unsupported")
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).toBe(raw)
    remove.mockImplementation(function (this: Storage, key) { return originalRemove.call(this, key) })
    act(() => expect(result.current.clearSavedEditor()).toBe(true))
    expect(result.current.status).toBe("reset")
    expect(localStorage.getItem(EDITOR_STORAGE_KEY)).toBeNull()
    rerender({ value: data() }); rerender({ value: data("after reset") })
    act(() => vi.advanceTimersByTime(300))
    expect(JSON.parse(localStorage.getItem(EDITOR_STORAGE_KEY)!).text.content).toBe("after reset")
  })
})
