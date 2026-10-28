import type { ExportResolution, FilterConfig, TextConfig, WatermarkConfig } from '../types'
import { applyFilter } from './filters'
import { COMPOSITION_FIT_ERROR, drawBaseImage, drawComposition, drawWatermark, layoutComposition, prepareCompositionFonts } from './composition'
import { applyNoiseGrain } from './noiseGenerator'
import { getExportSize } from './exportSizing'

export interface ExportParams {
  originalImage: HTMLImageElement
  filterConfig: FilterConfig
  textConfig: TextConfig
  watermarkConfig: WatermarkConfig
  resolution: ExportResolution
  format: 'image/jpeg' | 'image/png'
  quality: number
}

export class CompositionFitError extends Error {
  constructor() {
    super(COMPOSITION_FIT_ERROR)
    this.name = 'CompositionFitError'
  }
}

export async function exportImage(params: ExportParams): Promise<Blob> {
  const { originalImage, filterConfig, textConfig, watermarkConfig, resolution, format, quality } = params
  const sourceWidth = originalImage.naturalWidth
  const sourceHeight = originalImage.naturalHeight
  const { width: targetWidth, height: targetHeight } = getExportSize(sourceWidth, sourceHeight, resolution)

  // Step 1: Create an offscreen canvas at the target resolution.
  const canvas = document.createElement('canvas')

  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')

  await prepareCompositionFonts(textConfig)
  const layout = layoutComposition(ctx, sourceWidth, sourceHeight, textConfig, watermarkConfig)
  if (!layout.fits) throw new CompositionFitError()

  // Step 2: Draw the original image scaled to target resolution.
  drawBaseImage(ctx, targetWidth, targetHeight, layout, originalImage)

  // Step 3: Apply filter (if any).
  if (filterConfig.active !== 'none') {
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
    const filtered = applyFilter(imageData, filterConfig.active, filterConfig.intensity)
    ctx.putImageData(filtered, 0, 0)
  }

  // Step 4: Draw the already measured logical composition.
  drawComposition(ctx, targetWidth, targetHeight, layout, textConfig)

  // Step 5: Render watermark.
  drawWatermark(ctx, targetWidth, targetHeight, layout, watermarkConfig)

  // Step 6: Apply noise grain (anti-fingerprint).
  applyNoiseGrain(ctx, targetWidth, targetHeight)

  // Step 7: Convert canvas to Blob.
  // canvas.toBlob() produces a clean image with zero EXIF metadata.
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0 || blob.type !== format) {
            reject(new Error('Failed to encode image'))
            return
          }
          resolve(blob)
        },
        format,
        format === 'image/jpeg' ? quality : undefined,
      )
    } catch (error) {
      reject(error)
    }
  })
}
