import { describe, expect, it, vi } from "vitest"
import { drawBaseImage, drawComposition, drawWatermark, getDestinationMapping, layoutComposition, splitGraphemes, splitGraphemesFallback } from "./composition"
import { context, image, textConfig, watermarkConfig } from "../../tests/helpers/fixtures"

describe("composition", () => {
  it("uses equivalent logical geometry for equal source aspects", () => {
    const first = layoutComposition(context(), 1200, 800, textConfig, watermarkConfig)
    const second = layoutComposition(context(), 6000, 4000, textConfig, watermarkConfig)
    expect(second).toEqual(first)
  })
  it("preserves explicit breaks and grapheme sequences", () => {
    const layout = layoutComposition(context(), 1000, 1000, { ...textConfig, content: "uno\n👩🏽‍💻e\u0301" }, watermarkConfig)
    expect(layout.quote.lines.map((line) => line.text)).toEqual(["uno", "👩🏽‍💻é"])
    expect(splitGraphemes("👩🏽‍💻e\u0301")).toEqual(["👩🏽‍💻", "é"])
    expect(splitGraphemesFallback("🇲🇽")).toEqual(["🇲🇽"])
  })
  it("stores tracked width as advances plus inter-run tracking", () => {
    const layout = layoutComposition(context(), 1000, 1000, textConfig, watermarkConfig)
    const line = layout.author.lines[0], runs = line.runs ?? []
    expect(line.width).toBeCloseTo(runs.reduce((sum, run) => sum + run.advance, 0) + (runs.length - 1) * layout.author.tracking)
  })
  it("draws a measured layout without measuring again", () => {
    const ctx = context(), layout = layoutComposition(ctx, 1000, 1000, textConfig, watermarkConfig)
    vi.mocked(ctx.measureText).mockClear()
    drawComposition(ctx, 1000, 1000, layout, textConfig)
    expect(ctx.measureText).not.toHaveBeenCalled()
  })
  it("keeps a fitting complete block within vertical safe margins", () => {
    const layout = layoutComposition(context(), 1000, 1000, textConfig, watermarkConfig)
    expect(layout.fits).toBe(true)
    expect(layout.blockTop).toBeGreaterThanOrEqual(39)
    expect(layout.blockBottom).toBeLessThanOrEqual(layout.logicalHeight - 39)
  })
  it("returns the fit warning when minimum scaling cannot fit", () => {
    const content = Array.from({ length: 80 }, (_, i) => `línea ${i}`).join("\n")
    const layout = layoutComposition(context(), 1000, 300, { ...textConfig, content, fontSize: 72 }, watermarkConfig)
    expect(layout.fits).toBe(false); expect(layout.warning).toMatch(/does not fit/)
  })
  it("maps exact and rounded sizes with uniform centered cover", () => {
    expect(getDestinationMapping(1200, 800, 600, 400)).toEqual({ scale: 2, offsetX: 0, offsetY: 0 })
    const rounded = getDestinationMapping(1080, 719, 600, 400)
    expect(rounded.scale).toBe(1.8); expect(rounded.offsetX).toBe(0); expect(rounded.offsetY).toBeCloseTo(-0.5)
  })
  it("shares the same mapping for image, composition, and watermark", () => {
    const logo = image(100, 100), wm = { ...watermarkConfig, image: logo }
    const layout = layoutComposition(context(), 1200, 800, textConfig, wm)
    const contexts = [context(), context(), context()]
    drawBaseImage(contexts[0], 1080, 720, layout, image())
    drawComposition(contexts[1], 1080, 720, layout, textConfig)
    drawWatermark(contexts[2], 1080, 720, layout, wm)
    for (const ctx of contexts) {
      expect(ctx.translate).toHaveBeenCalledWith(0, 0)
      expect(ctx.scale).toHaveBeenCalledWith(1.8, 1.8)
    }
  })
  it("hides the frame corner occupied by a watermark", () => {
    const wm = { ...watermarkConfig, image: image(100, 100), position: "bottom-right" as const, size: 20 }
    const layout = layoutComposition(context(), 1000, 1000, textConfig, wm)
    expect(layout.frame?.corners.map((corner) => corner.visible)).toEqual([true, true, true, false])
  })
})

// measureText is deterministic here: these tests protect layout orchestration and
// invariants, not real font metrics or raster appearance. Playwright covers real fonts/canvas.
