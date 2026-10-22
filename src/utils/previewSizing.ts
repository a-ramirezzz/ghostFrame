export const MAX_PREVIEW_EDGE = 2048
export const MAX_PREVIEW_PIXELS = 3_000_000

export interface PreviewSize {
  width: number
  height: number
}

/**
 * Returns a uniformly reduced preview size. Flooring keeps integer dimensions
 * inside both limits; the one-pixel floor also keeps extreme aspect ratios
 * drawable without ever enlarging either source dimension. This fixed-size
 * preview can look softer at high zoom, and filtering after downsampling may
 * differ slightly from the independent full-resolution export path.
 */
export function getPreviewSize(sourceWidth: number, sourceHeight: number): PreviewSize {
  if (![sourceWidth, sourceHeight].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Invalid image dimensions")
  }

  const width = Math.max(1, Math.floor(sourceWidth))
  const height = Math.max(1, Math.floor(sourceHeight))
  const reduction = Math.min(
    1,
    MAX_PREVIEW_EDGE / width,
    MAX_PREVIEW_EDGE / height,
    Math.sqrt(MAX_PREVIEW_PIXELS / (width * height)),
  )

  return {
    width: Math.max(1, Math.floor(width * reduction)),
    height: Math.max(1, Math.floor(height * reduction)),
  }
}
