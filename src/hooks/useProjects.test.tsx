import { StrictMode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defaultEditorSnapshot } from "../state/editorPersistence"
import type { ProjectRecord, ProjectSummary } from "../state/projectStorage"
import type { ImageAssetPreparation, PreparedImageAsset } from "../utils/imageAsset"
import useProjects from "./useProjects"
import { deleteProject, listProjects, readProject, saveProject } from "../state/projectStorage"
import { prepareImageAsset } from "../utils/imageAsset"

vi.mock("../state/projectStorage", async (original) => ({
  ...(await original<typeof import("../state/projectStorage")>()),
  listProjects: vi.fn(), saveProject: vi.fn(), readProject: vi.fn(), deleteProject: vi.fn(),
}))
vi.mock("../utils/imageAsset", async (original) => ({
  ...(await original<typeof import("../utils/imageAsset")>()), prepareImageAsset: vi.fn(),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>
const makeTarget = () => ({
  commitImage: vi.fn(), commitWatermark: vi.fn(), replaceText: vi.fn(), replaceFilter: vi.fn(),
  replaceWatermark: vi.fn(), replaceExport: vi.fn(), cancelImage: vi.fn(), cancelWatermark: vi.fn(),
  clearPreviewMessages: vi.fn(),
})
const editor = (sourceFile: File | null = null, content = "", watermarkFile: File | null = null) => {
  const snapshot = defaultEditorSnapshot(); snapshot.text.content = content
  return { textConfig: snapshot.text, filterConfig: snapshot.filter, watermarkConfig: { ...snapshot.watermark, image: null }, exportConfig: snapshot.export, sourceFile, watermarkFile }
}
const file = (name = "main.png") => new File([new Uint8Array([1])], name, { type: "image/png" })
const summary = (id = "saved-id", name = "Saved"): ProjectSummary => ({ id, name, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" })
const record = (id = "saved-id", name = "Saved", watermark = false): ProjectRecord => ({
  ...summary(id, name), version: 1, editor: { ...defaultEditorSnapshot(), text: { ...defaultEditorSnapshot().text, content: "from project" } },
  source: file(), sourceFileName: "main.png", watermark: watermark ? file("mark.png") : null, watermarkFileName: watermark ? "mark.png" : null,
})
const asset = (name: string) => ({ file: file(name), image: {} as HTMLImageElement, objectUrl: `blob:${name}`, dispose: vi.fn() })
const deferred = <T,>() => {
  let resolve!: (value: T) => void; let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const preparation = () => {
  const pending = deferred<PreparedImageAsset>()
  const task = pending.promise as ImageAssetPreparation
  task.cancel = vi.fn(() => pending.reject(new DOMException("cancelled", "AbortError")))
  return { task, resolve: pending.resolve, reject: pending.reject }
}
const committedPreparation = (value: PreparedImageAsset) => {
  const task = Promise.resolve(value) as ImageAssetPreparation; task.cancel = vi.fn(); return task
}
const expectNoCommits = (target: ReturnType<typeof makeTarget>) => {
  expect(target.replaceText).not.toHaveBeenCalled(); expect(target.replaceFilter).not.toHaveBeenCalled()
  expect(target.replaceWatermark).not.toHaveBeenCalled(); expect(target.replaceExport).not.toHaveBeenCalled()
  expect(target.commitImage).not.toHaveBeenCalled(); expect(target.commitWatermark).not.toHaveBeenCalled()
}

describe("useProjects", () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockResolvedValue([])
    vi.mocked(saveProject).mockImplementation(async (value) => value)
    vi.mocked(deleteProject).mockResolvedValue()
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } })
  })

  it("keeps save and open operational after StrictMode effect replay", async () => {
    const target = makeTarget(); const source = file(); const current = editor(source); const opened = record(); let prepared!: PreparedImageAsset
    vi.mocked(readProject).mockResolvedValue(opened)
    vi.mocked(prepareImageAsset).mockImplementation((preparedFile) => { prepared = { ...asset("opened.png"), file: preparedFile }; return committedPreparation(prepared) })
    const { result, rerender } = renderHook(({ value }) => useProjects(value, target, false), { initialProps: { value: current }, wrapper }); await act(async () => { result.current.setProjectName("Current") })
    await act(async () => { await result.current.save() })
    expect(result.current.activeId).toEqual(expect.any(String)); expect(result.current.isDirty).toBe(false)
    await act(async () => { await result.current.open(opened.id) })
    expect(target.replaceText).toHaveBeenCalledWith(opened.editor.text); expect(target.replaceFilter).toHaveBeenCalledWith(opened.editor.filter)
    expect(target.replaceWatermark).toHaveBeenCalledWith(opened.editor.watermark); expect(target.replaceExport).toHaveBeenCalledWith(opened.editor.export)
    expect(target.commitImage).toHaveBeenCalledWith(prepared); expect(target.commitWatermark).toHaveBeenCalledWith(null)
    rerender({ value: { textConfig: opened.editor.text, filterConfig: opened.editor.filter, watermarkConfig: { ...opened.editor.watermark, image: null }, exportConfig: opened.editor.export, sourceFile: prepared.file, watermarkFile: null } })
    expect(result.current.activeId).toBe(opened.id); expect(result.current.isDirty).toBe(false)
    expect(result.current.isBusy).toBe(false); expect(result.current.isOpening).toBe(false)
  })

  it("survives StrictMode replay and recognizes text-only unsaved work", async () => {
    const target = makeTarget()
    const { result, rerender } = renderHook(({ value }) => useProjects(value, target, false), { initialProps: { value: editor() }, wrapper })
    await act(async () => {}); expect(result.current.isDirty).toBe(false)
    rerender({ value: editor(null, "meaningful") }); expect(result.current.isDirty).toBe(true)
  })

  it("disposes a prepared main asset when watermark preparation fails without changing the editor", async () => {
    const target = makeTarget(); const main = asset("main.png"); const mainTask = committedPreparation(main); const logoTask = preparation()
    vi.mocked(readProject).mockResolvedValue(record("with-mark", "With mark", true))
    vi.mocked(prepareImageAsset).mockReturnValueOnce(mainTask).mockReturnValueOnce(logoTask.task)
    const { result } = renderHook(() => useProjects(editor(), target, false), { wrapper }); await act(async () => {})
    let opening!: Promise<void>; act(() => { opening = result.current.open("with-mark") })
    await act(async () => { logoTask.reject(new Error("watermark failed")); await opening })
    expectNoCommits(target); expect(main.dispose).toHaveBeenCalledOnce(); expect(mainTask.cancel).toHaveBeenCalledOnce()
    expect(logoTask.task.cancel).not.toHaveBeenCalled(); expect(result.current.activeId).toBeNull()
    expect(result.current.isBusy).toBe(false); expect(result.current.isOpening).toBe(false)
  })

  it("cancels pending preparations on unmount and disposes assets that complete late", async () => {
    const target = makeTarget(); const mainTask = preparation(); const logoTask = preparation(); const lateMain = asset("late-main.png"); const lateLogo = asset("late-logo.png")
    mainTask.task.cancel = vi.fn(); logoTask.task.cancel = vi.fn()
    vi.mocked(readProject).mockResolvedValue(record("pending", "Pending", true))
    vi.mocked(prepareImageAsset).mockReturnValueOnce(mainTask.task).mockReturnValueOnce(logoTask.task)
    const { result, unmount } = renderHook(() => useProjects(editor(), target, false), { wrapper }); await act(async () => {})
    let opening!: Promise<void>; act(() => { opening = result.current.open("pending") })
    await waitFor(() => expect(prepareImageAsset).toHaveBeenCalledTimes(2)); unmount()
    expect(mainTask.task.cancel).toHaveBeenCalledOnce(); expect(logoTask.task.cancel).toHaveBeenCalledOnce()
    await act(async () => { mainTask.resolve(lateMain); logoTask.resolve(lateLogo); await opening })
    expectNoCommits(target); expect(lateMain.dispose).toHaveBeenCalledOnce(); expect(lateLogo.dispose).toHaveBeenCalledOnce()
  })

  it("protects edits made while an open is preparing when discard is rejected", async () => {
    const target = makeTarget(); const mainTask = preparation(); const candidate = asset("candidate.png")
    vi.mocked(readProject).mockResolvedValue(record()); vi.mocked(prepareImageAsset).mockReturnValue(mainTask.task)
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    const { result, rerender } = renderHook(({ value }) => useProjects(value, target, false), { initialProps: { value: editor() }, wrapper }); await act(async () => {})
    let opening!: Promise<void>; act(() => { opening = result.current.open("saved-id") })
    await waitFor(() => expect(prepareImageAsset).toHaveBeenCalledOnce()); rerender({ value: editor(file("newer.png"), "newer composition") })
    await act(async () => { mainTask.resolve(candidate); await opening })
    expect(confirm).toHaveBeenCalledOnce(); expectNoCommits(target); expect(candidate.dispose).toHaveBeenCalledOnce()
    expect(result.current.activeId).toBeNull(); expect(result.current.isDirty).toBe(true)
    expect(result.current.isBusy).toBe(false); expect(result.current.isOpening).toBe(false)
  })

  it("retains a successful save locally when its list refresh fails and retry recovers", async () => {
    const target = makeTarget(); const recovered = summary("recovered", "Recovered"); const value = editor(file())
    const { result } = renderHook(() => useProjects(value, target, false), { wrapper }); await act(async () => {})
    vi.mocked(listProjects).mockRejectedValueOnce(new Error("refresh unavailable")).mockResolvedValueOnce([recovered])
    await act(async () => { result.current.setProjectName("Committed") }); await act(async () => { await result.current.save() })
    await waitFor(() => expect(result.current.refreshError).toBe("refresh unavailable"))
    expect(result.current.status).toContain("Project saved."); expect(result.current.activeId).toEqual(expect.any(String))
    expect(result.current.isDirty).toBe(false); expect(result.current.projects).toEqual([expect.objectContaining({ name: "Committed" })])
    await act(async () => { await result.current.retryList() })
    expect(result.current.refreshError).toBeNull(); expect(result.current.projects).toEqual([recovered]); expect(saveProject).toHaveBeenCalledOnce()
  })

  it("retains a successful deletion locally when its list refresh fails and retry does not delete again", async () => {
    const target = makeTarget(); const value = editor(file())
    const { result } = renderHook(() => useProjects(value, target, false), { wrapper }); await act(async () => {})
    await act(async () => { result.current.setProjectName("To delete") }); await act(async () => { await result.current.save() })
    await waitFor(() => expect(listProjects).toHaveBeenCalledTimes(2))
    vi.mocked(listProjects).mockRejectedValueOnce(new Error("refresh unavailable")).mockResolvedValueOnce([])
    const id = result.current.activeId!; vi.spyOn(window, "confirm").mockReturnValue(true)
    await act(async () => { await result.current.remove(id) })
    await waitFor(() => expect(result.current.refreshError).toBe("refresh unavailable"))
    expect(result.current.status).toContain("Project deleted."); expect(result.current.activeId).toBeNull()
    expect(result.current.isDirty).toBe(true); expect(result.current.projects).toEqual([])
    await act(async () => { await result.current.retryList() })
    expect(result.current.refreshError).toBeNull(); expect(deleteProject).toHaveBeenCalledOnce(); expect(saveProject).toHaveBeenCalledOnce()
  })

  it("distinguishes different file bytes even when all File metadata matches", async () => {
    const target = makeTarget(); let finish!: (value: Parameters<typeof saveProject>[0]) => void
    vi.mocked(saveProject).mockImplementation((value) => new Promise((resolve) => { finish = () => resolve(value) }))
    const options = { type: "image/png", lastModified: 123 }
    const first = new File([new Uint8Array([1])], "same.png", options); const second = new File([new Uint8Array([2])], "same.png", options)
    const { result, rerender } = renderHook(({ value }) => useProjects(value, target, false), { initialProps: { value: editor(first) }, wrapper })
    await act(async () => { result.current.setProjectName("Project") })
    let saving!: Promise<void>; act(() => { saving = result.current.save() }); rerender({ value: editor(second) })
    await act(async () => { finish(null as never); await saving })
    expect(result.current.isDirty).toBe(true); expect(result.current.status).toContain("newer unsaved changes")
  })
})
