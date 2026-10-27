import { describe, expect, it, vi } from "vitest"
import { prepareImageAsset } from "./imageAsset"

const file = () => new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" })

describe("prepareImageAsset", () => {
  it("revokes the URL when Image construction fails synchronously", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() })
    vi.stubGlobal("Image", class { constructor() { throw new Error("constructor failed") } })
    const task = prepareImageAsset(file(), ["image/png"])
    await expect(task).rejects.toThrow("constructor failed")
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test")
  })

  it("releases a pending URL immediately when cancelled and ignores late load", async () => {
    class PendingImage {
      onload: null | (() => void) = null; onerror: null | (() => void) = null
      naturalWidth = 100; naturalHeight = 100; decode = vi.fn(() => new Promise<void>(() => {}))
      set src(_value: string) { /* remain pending */ }
    }
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:pending"), revokeObjectURL: vi.fn() })
    vi.stubGlobal("Image", PendingImage)
    const task = prepareImageAsset(file(), ["image/png"])
    task.cancel()
    await expect(task).rejects.toMatchObject({ name: "AbortError" })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pending")
  })

  it("releases the URL when cancelled during a deferred decode and ignores its completion", async () => {
    let finishDecode!: () => void
    class DecodingImage {
      onload: null | (() => void) = null; onerror: null | (() => void) = null
      naturalWidth = 100; naturalHeight = 100
      decode = vi.fn(() => new Promise<void>((resolve) => { finishDecode = resolve }))
      set src(_value: string) { queueMicrotask(() => this.onload?.()) }
    }
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:decoding"), revokeObjectURL: vi.fn() })
    vi.stubGlobal("Image", DecodingImage)
    const task = prepareImageAsset(file(), ["image/png"])
    await vi.waitFor(() => expect(finishDecode).toBeTypeOf("function"))
    task.cancel()
    finishDecode()
    await expect(task).rejects.toMatchObject({ name: "AbortError" })
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:decoding")
  })
})
