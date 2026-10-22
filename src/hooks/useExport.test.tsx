import { StrictMode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { COMPOSITION_FIT_ERROR } from "../utils/composition"
import { CompositionFitError, exportImage } from "../utils/exportImage"
import { downloadBlob } from "../utils/downloadFile"
import useExport from "./useExport"
import { image, textConfig, watermarkConfig } from "../../tests/helpers/fixtures"

vi.mock("../utils/exportImage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/exportImage")>()
  return { ...actual, exportImage: vi.fn() }
})
vi.mock("../utils/downloadFile", () => ({ downloadBlob: vi.fn() }))

const input = { originalImage: image(), filterConfig: { active: "none" as const, intensity: 1 }, textConfig, watermarkConfig }
const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe("useExport", () => {
  beforeEach(() => vi.mocked(exportImage).mockResolvedValue(new Blob(["ok"], { type: "image/jpeg" })))
  it("starts only one immediate concurrent export", async () => {
    const pending = deferred<Blob>(); vi.mocked(exportImage).mockReturnValue(pending.promise)
    const { result } = renderHook(() => useExport(true), { wrapper })
    act(() => { void result.current.performExport(input); void result.current.performExport(input) })
    expect(exportImage).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve(new Blob(["ok"])))
  })
  it("blocks current ineligibility and a retained callback sees latest eligibility", () => {
    const { result, rerender } = renderHook(({ eligible }) => useExport(eligible), { initialProps: { eligible: true } })
    const retained = result.current.performExport
    rerender({ eligible: false }); act(() => { void retained(input); void result.current.performExport(input) })
    expect(exportImage).not.toHaveBeenCalled()
  })
  it("survives StrictMode setup/cleanup/setup and downloads", async () => {
    const { result } = renderHook(() => useExport(true), { wrapper })
    await act(async () => result.current.performExport(input))
    expect(downloadBlob).toHaveBeenCalledTimes(1); expect(result.current.isExporting).toBe(false)
  })
  it("does not download after unmount", async () => {
    const pending = deferred<Blob>(); vi.mocked(exportImage).mockReturnValue(pending.promise)
    const { result, unmount } = renderHook(() => useExport(true))
    act(() => { void result.current.performExport(input) }); unmount(); pending.resolve(new Blob(["ok"])); await pending.promise
    expect(downloadBlob).not.toHaveBeenCalled()
  })
  it("snapshots settings and preserves a specific fit message", async () => {
    const pending = deferred<Blob>(); vi.mocked(exportImage).mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useExport(true))
    act(() => { void result.current.performExport(input); result.current.updateExportConfig({ format: "image/png" }) })
    expect(vi.mocked(exportImage).mock.calls[0][0].format).toBe("image/jpeg")
    await act(async () => pending.resolve(new Blob(["ok"])))
    vi.mocked(exportImage).mockRejectedValueOnce(new CompositionFitError())
    await act(async () => result.current.performExport(input))
    expect(result.current.error).toBe(COMPOSITION_FIT_ERROR)
  })
  it("recovers from failure and succeeds on retry", async () => {
    vi.mocked(exportImage).mockRejectedValueOnce(new Error("nope"))
    const { result } = renderHook(() => useExport(true))
    await act(async () => result.current.performExport(input)); expect(result.current.error).toMatch(/could not be exported/)
    await act(async () => result.current.performExport(input))
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(downloadBlob).toHaveBeenCalledTimes(1)
  })
})
