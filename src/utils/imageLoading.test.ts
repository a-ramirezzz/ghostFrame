import { describe, expect, it } from "vitest"
import { IMAGE_DECODE_ERROR, IMAGE_LIMITS, MAIN_IMAGE_TYPES, WATERMARK_TYPES, validateImageDimensions, validateImageFile } from "./imageLoading"

const file = (type: string, size: number) => new File([new Uint8Array(size)], "asset", { type })
const dimensions = (width: number, height: number) => ({ naturalWidth: width, naturalHeight: height }) as HTMLImageElement

describe("image validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts main-image %s", (type) => {
    expect(validateImageFile(file(type, 1), MAIN_IMAGE_TYPES)).toBeNull()
  })
  it("restricts watermarks to transparent-capable formats", () => {
    expect(validateImageFile(file("image/jpeg", 1), WATERMARK_TYPES)).toMatch(/PNG or WebP/)
    expect(validateImageFile(file("image/png", 1), WATERMARK_TYPES)).toBeNull()
    expect(validateImageFile(file("image/webp", 1), WATERMARK_TYPES)).toBeNull()
  })
  it("accepts the exact size boundary and rejects the next byte", () => {
    expect(validateImageFile(file("image/png", IMAGE_LIMITS.maxFileSize), MAIN_IMAGE_TYPES)).toBeNull()
    expect(validateImageFile(file("image/png", IMAGE_LIMITS.maxFileSize + 1), MAIN_IMAGE_TYPES)).toMatch(/25 MiB/)
  })
  it("validates finite, positive dimensions", () => {
    expect(validateImageDimensions(dimensions(1, 1))).toBeNull()
    for (const value of [0, -1, NaN, Infinity]) expect(validateImageDimensions(dimensions(value, 10))).toBe(IMAGE_DECODE_ERROR)
  })
  it("enforces edge and pixel limits inclusively", () => {
    expect(validateImageDimensions(dimensions(IMAGE_LIMITS.maxDimension, 1))).toBeNull()
    expect(validateImageDimensions(dimensions(IMAGE_LIMITS.maxDimension + 1, 1))).toMatch(/dimensions/)
    expect(validateImageDimensions(dimensions(6000, 4000))).toBeNull()
    expect(validateImageDimensions(dimensions(6001, 4000))).toMatch(/dimensions/)
  })
  it("keeps format errors distinct from decode failures", () => {
    expect(validateImageFile(file("text/plain", 1), MAIN_IMAGE_TYPES)).not.toBe(IMAGE_DECODE_ERROR)
  })
})
