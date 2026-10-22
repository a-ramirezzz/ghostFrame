import { describe, expect, it } from "vitest"
import { getPreviewSize, MAX_PREVIEW_EDGE, MAX_PREVIEW_PIXELS } from "./previewSizing"

describe("preview sizing", () => {
  it("leaves small integer images unchanged", () => expect(getPreviewSize(640, 480)).toEqual({ width: 640, height: 480 }))
  it.each([[8000, 12000], [9000, 9000], [12000, 6000], [11999, 2001]])("bounds %i x %i", (width, height) => {
    const result = getPreviewSize(width, height)
    expect(result.width).toBeGreaterThan(0); expect(result.height).toBeGreaterThan(0)
    expect(Number.isInteger(result.width) && Number.isInteger(result.height)).toBe(true)
    expect(result.width).toBeLessThanOrEqual(Math.min(width, MAX_PREVIEW_EDGE))
    expect(result.height).toBeLessThanOrEqual(Math.min(height, MAX_PREVIEW_EDGE))
    expect(result.width * result.height).toBeLessThanOrEqual(MAX_PREVIEW_PIXELS)
  })
  it.each([[0, 1], [-1, 2], [NaN, 1], [1, Infinity]])("rejects invalid dimensions", (width, height) => {
    expect(() => getPreviewSize(width, height)).toThrow("Invalid image dimensions")
  })
  it("keeps extreme accepted aspect ratios drawable", () => {
    expect(getPreviewSize(12000, 1)).toEqual({ width: 2048, height: 1 })
  })
})
