import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

if (!globalThis.ImageData) {
  globalThis.ImageData = class ImageData {
    readonly data: Uint8ClampedArray
    readonly width: number
    readonly height: number
    constructor(data: Uint8ClampedArray, width: number, height = data.length / 4 / width) {
      this.data = data
      this.width = width
      this.height = height
    }
  } as typeof ImageData
}
