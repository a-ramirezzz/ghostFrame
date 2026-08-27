import type { ExportResolution, FilterConfig, TextConfig, WatermarkConfig } from '../types'
import { RESOLUTION_PRESETS } from '../types'
import { applyFilter } from './filters'
import { renderTextOnCanvas } from './renderText'
import { renderWatermarkOnCanvas } from './renderWatermark'
import { applyNoiseGrain } from './noiseGenerator'

export interface ExportParams {
  originalImage: HTMLImageElement
  filterConfig: FilterConfig
  textConfig: TextConfig
  watermarkConfig: WatermarkConfig
  resolution: ExportResolution
  format: 'image/jpeg' | 'image/png'
  quality: number
}

export async function exportImage(params: ExportParams): Promise<Blob> {
  const { originalImage, filterConfig, textConfig, watermarkConfig, resolution, format, quality } = params
  const preset = RESOLUTION_PRESETS[resolution]

  // Step 1: Create an offscreen canvas at the target resolution.
  const canvas = document.createElement('canvas')

  // Calculate dimensions maintaining the original image aspect ratio.
  // The preset defines the MAX dimensions (bounding box).
  const imgAspect = originalImage.naturalWidth / originalImage.naturalHeight
  const boxAspect = preset.width / preset.height
  let targetWidth: number
  let targetHeight: number
  if (imgAspect > boxAspect) {
    targetWidth = preset.width
    targetHeight = Math.round(preset.width / imgAspect)
  } else {
    targetHeight = preset.height
    targetWidth = Math.round(preset.height * imgAspect)
  }
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')!

  // Step 2: Draw the original image scaled to target resolution.
  ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight)

  // Step 3: Apply filter (if any).
  if (filterConfig.active !== 'none') {
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
    const filtered = applyFilter(imageData, filterConfig.active, filterConfig.intensity)
    ctx.putImageData(filtered, 0, 0)
  }

  // Step 4: Render text overlay.
  if (textConfig.content.trim()) {
    const scaledFontSize = (textConfig.fontSize / 600) * targetWidth
    await document.fonts.load(`${scaledFontSize}px "${textConfig.fontFamily}"`)
    renderTextOnCanvas(ctx, targetWidth, targetHeight, textConfig)
  }

  // Step 5: Render watermark.
  renderWatermarkOnCanvas(ctx, targetWidth, targetHeight, watermarkConfig)

  // Step 6: Apply noise grain (anti-fingerprint).
  applyNoiseGrain(ctx, targetWidth, targetHeight)

  // Step 7: Convert canvas to Blob.
  // canvas.toBlob() produces a clean image with zero EXIF metadata.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to export image'))
      },
      format,
      format === 'image/jpeg' ? quality : undefined,
    )
  })
}
