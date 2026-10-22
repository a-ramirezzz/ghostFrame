import { beforeEach, describe, expect, it, vi } from "vitest"
import { COMPOSITION_FIT_ERROR } from "./composition"
import { CompositionFitError, exportImage, type ExportParams } from "./exportImage"
import { context, image, textConfig, watermarkConfig } from "../../tests/helpers/fixtures"

function params(overrides: Partial<ExportParams> = {}): ExportParams {
  return { originalImage: image(), filterConfig: { active: "none", intensity: 1 }, textConfig,
    watermarkConfig, resolution: "low", format: "image/png", quality: 0.92, ...overrides }
}

describe("exportImage", () => {
  let ctx: CanvasRenderingContext2D
  let canvas: HTMLCanvasElement
  beforeEach(() => {
    ctx = context()
    canvas = document.createElement("canvas")
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx)
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => tag === "canvas" ? canvas : createElement(tag)) as typeof document.createElement)
    Object.defineProperty(document, "fonts", { configurable: true, value: { load: vi.fn(() => Promise.resolve([])), ready: Promise.resolve() } })
  })

  it.each(["image/png", "image/jpeg"] as const)("encodes a nonempty %s", async (format) => {
    vi.spyOn(canvas, "toBlob").mockImplementation((callback, requested) => callback(new Blob(["encoded"], { type: requested ?? undefined })))
    const blob = await exportImage(params({ format }))
    expect(blob.type).toBe(format); expect(blob.size).toBeGreaterThan(0)
  })
  it.each([
    ["null", null], ["empty", new Blob([], { type: "image/png" })],
    ["mismatched MIME", new Blob(["x"], { type: "image/jpeg" })],
  ] as const)("rejects %s blobs", async (_description, blob) => {
    vi.spyOn(canvas, "toBlob").mockImplementation((callback) => callback(blob))
    await expect(exportImage(params())).rejects.toThrow("Failed to encode image")
  })
  it("rejects missing contexts, font failures, drawing failures, and encoding exceptions", async () => {
    vi.mocked(canvas.getContext).mockReturnValueOnce(null)
    await expect(exportImage(params())).rejects.toThrow("Canvas is unavailable")
    vi.mocked(document.fonts.load).mockRejectedValueOnce(new Error("font"))
    await expect(exportImage(params())).rejects.toThrow("font")
    vi.mocked(ctx.drawImage).mockImplementationOnce(() => { throw new Error("draw") })
    await expect(exportImage(params())).rejects.toThrow("draw")
    vi.spyOn(canvas, "toBlob").mockImplementation(() => { throw new Error("encode") })
    await expect(exportImage(params())).rejects.toThrow("encode")
  })
  it("throws CompositionFitError before drawing, filtering, noise, or encoding", async () => {
    const overflow = { ...textConfig, content: Array.from({ length: 80 }, () => "demasiado").join("\n"), fontSize: 72 }
    const encode = vi.spyOn(canvas, "toBlob")
    await expect(exportImage(params({ originalImage: image(1000, 300), textConfig: overflow }))).rejects.toEqual(expect.objectContaining({ name: "CompositionFitError", message: COMPOSITION_FIT_ERROR }))
    expect(ctx.drawImage).not.toHaveBeenCalled(); expect(ctx.getImageData).not.toHaveBeenCalled(); expect(encode).not.toHaveBeenCalled()
    expect(new CompositionFitError()).toBeInstanceOf(Error)
  })
})
