import { describe, expect, it } from "vitest"
import { getExportSize } from "./exportSizing"

describe("getExportSize", () => {
  it.each([
    ["low", 1200, 800, 1080, 720],
    ["medium", 1200, 800, 1620, 1080],
    ["high", 1200, 800, 2048, 1365],
    ["low", 800, 1200, 720, 1080],
    ["medium", 800, 1200, 720, 1080],
    ["high", 800, 1200, 1365, 2048],
    ["low", 900, 900, 1080, 1080],
    ["medium", 900, 900, 1080, 1080],
    ["high", 900, 900, 2048, 2048],
    ["high", 1234, 777, 2048, 1290],
  ] as const)("%s maps %sx%s to %sx%s", (preset, sourceWidth, sourceHeight, width, height) => {
    expect(getExportSize(sourceWidth, sourceHeight, preset)).toEqual({ width, height })
  })

  it("preserves the existing small-source upscaling behavior", () => {
    expect(getExportSize(20, 10, "low")).toEqual({ width: 1080, height: 540 })
  })

  it.each([[0, 10], [10, 0], [Number.NaN, 10], [10, Number.POSITIVE_INFINITY]])("rejects invalid source dimensions", (width, height) => {
    expect(() => getExportSize(width, height, "low")).toThrow("Invalid image dimensions")
  })

  it("rejects unsupported presets and targets that round to zero", () => {
    expect(() => getExportSize(10, 10, "other" as "low")).toThrow("Invalid export preset")
    expect(() => getExportSize(1, Number.MAX_VALUE, "low")).toThrow("Invalid export dimensions")
  })
})
