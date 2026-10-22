import { StrictMode } from "react"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import useImageLoader from "./useImageLoader"
import useWatermarkConfig from "./useWatermarkConfig"

class ControlledImage {
  static instances: ControlledImage[] = []
  naturalWidth = 100
  naturalHeight = 100
  src = ""
  onload: null | (() => void) = null
  onerror: null | (() => void) = null
  decode = vi.fn(() => Promise.resolve())
  constructor() { ControlledImage.instances.push(this) }
}

const wrapper = ({ children }: { children: React.ReactNode }) => <StrictMode>{children}</StrictMode>
const valid = (name = "a.png") => new File(["ok"], name, { type: "image/png" })

interface Adapter {
  load(file: File): void
  current: HTMLImageElement | null
  clear(): void
  isLoading: boolean
  error: string | null
}

function useMainAdapter(): Adapter {
  const value = useImageLoader()
  return { load: value.loadImage, current: value.originalImage, clear: value.clearImage, isLoading: value.isLoading, error: value.error }
}

function useWatermarkAdapter(): Adapter {
  const value = useWatermarkConfig()
  return { load: value.loadWatermark, current: value.watermarkConfig.image, clear: value.removeWatermark, isLoading: value.isLoading, error: value.error }
}

describe.each([
  ["main image", useMainAdapter],
  ["watermark", useWatermarkAdapter],
] as const)("%s loading", (_name, hook) => {
  beforeEach(() => {
    ControlledImage.instances = []
    vi.stubGlobal("Image", ControlledImage)
    vi.spyOn(URL, "createObjectURL").mockImplementation((file) => `blob:${(file as File).name}`)
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
  })

  it("loads successfully and releases the URL on clear", async () => {
    const { result } = renderHook(() => hook(), { wrapper })
    act(() => result.current.load(valid()))
    await act(async () => ControlledImage.instances.at(-1)?.onload?.())
    expect(result.current.current).toBe(ControlledImage.instances.at(-1))
    act(() => result.current.clear())
    expect(result.current.current).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:a.png")
  })
  it("preserves a valid image after a failed replacement", async () => {
    const { result } = renderHook(() => hook(), { wrapper })
    act(() => result.current.load(valid("a.png")))
    await act(async () => ControlledImage.instances[0].onload?.())
    const first = result.current.current
    act(() => result.current.load(valid("bad.png")))
    act(() => ControlledImage.instances[1].onerror?.())
    expect(result.current.current).toBe(first)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toMatch(/could not be opened/)
  })
  it("ignores A when B wins, and invalid selection cancels pending A", async () => {
    const { result } = renderHook(() => hook(), { wrapper })
    act(() => { result.current.load(valid("a.png")); result.current.load(valid("b.png")) })
    await act(async () => ControlledImage.instances[1].onload?.())
    await act(async () => ControlledImage.instances[0].onload?.())
    expect(result.current.current).toBe(ControlledImage.instances[1])
    act(() => result.current.load(valid("pending.png")))
    act(() => result.current.load(new File(["x"], "invalid.gif", { type: "image/gif" })))
    await act(async () => ControlledImage.instances[2].onload?.())
    expect(result.current.current).toBe(ControlledImage.instances[1])
    expect(result.current.isLoading).toBe(false)
  })
  it("clear and unmount cancel pending decode safely", async () => {
    let resolveDecode!: () => void
    const { result, unmount } = renderHook(() => hook(), { wrapper })
    act(() => result.current.load(valid()))
    ControlledImage.instances[0].decode.mockReturnValue(new Promise<void>((resolve) => { resolveDecode = resolve }))
    const loading = act(async () => ControlledImage.instances[0].onload?.())
    act(() => result.current.clear()); unmount(); resolveDecode()
    await loading
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:a.png")
  })
  it("handles synchronous URL creation failures and permits retrying the same file", async () => {
    vi.mocked(URL.createObjectURL).mockImplementationOnce(() => { throw new Error("boom") })
    const { result } = renderHook(() => hook(), { wrapper }); const selected = valid()
    act(() => result.current.load(selected))
    expect(result.current.isLoading).toBe(false); expect(result.current.error).toBeTruthy()
    act(() => result.current.load(selected))
    await act(async () => ControlledImage.instances.at(-1)?.onload?.())
    expect(result.current.current).not.toBeNull()
  })
})
