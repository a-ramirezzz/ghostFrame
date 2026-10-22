export const IMAGE_LIMITS = {
  maxFileSize: 25 * 1024 * 1024,
  maxPixels: 24_000_000,
  maxDimension: 12_000,
} as const

export const MAIN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const WATERMARK_TYPES = ["image/png", "image/webp"] as const

export type ImageLoadError = string | null

export function validateImageFile(file: File, acceptedTypes: readonly string[]): ImageLoadError {
  if (!acceptedTypes.includes(file.type)) {
    const formats = acceptedTypes.includes("image/jpeg") ? "a JPG, PNG, or WebP" : "a PNG or WebP"
    return `Unsupported image format. Choose ${formats} file.`
  }
  if (file.size > IMAGE_LIMITS.maxFileSize) {
    return "This file exceeds the 25 MiB limit. Choose a smaller image."
  }
  return null
}

export function validateImageDimensions(image: HTMLImageElement): ImageLoadError {
  const { naturalWidth: width, naturalHeight: height } = image
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "This image could not be opened. It may be damaged or unsupported."
  }
  if (
    width > IMAGE_LIMITS.maxDimension ||
    height > IMAGE_LIMITS.maxDimension ||
    width * height > IMAGE_LIMITS.maxPixels
  ) {
    return "This image exceeds the supported dimensions. Resize it and try again."
  }
  return null
}

export const IMAGE_DECODE_ERROR =
  "This image could not be opened. It may be damaged or unsupported."
