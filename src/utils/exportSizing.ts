import { RESOLUTION_PRESETS, type ExportResolution } from "../types"

export interface ExportSize {
  width: number
  height: number
}

export function getExportSize(
  sourceWidth: number,
  sourceHeight: number,
  resolution: ExportResolution,
): ExportSize {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0 || !Number.isFinite(sourceHeight) || sourceHeight <= 0) {
    throw new Error("Invalid image dimensions")
  }

  const preset = RESOLUTION_PRESETS[resolution]
  if (!preset || !Number.isFinite(preset.width) || preset.width <= 0 || !Number.isFinite(preset.height) || preset.height <= 0) {
    throw new Error("Invalid export preset")
  }

  const imageAspect = sourceWidth / sourceHeight
  const boxAspect = preset.width / preset.height
  const size = imageAspect > boxAspect
    ? { width: preset.width, height: Math.round(preset.width / imageAspect) }
    : { width: Math.round(preset.height * imageAspect), height: preset.height }

  if (!Number.isFinite(size.width) || size.width <= 0 || !Number.isFinite(size.height) || size.height <= 0) {
    throw new Error("Invalid export dimensions")
  }
  return size
}
