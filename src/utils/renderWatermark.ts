import type { WatermarkConfig } from "../types"

export interface WatermarkRect { x: number; y: number; width: number; height: number }

export function getWatermarkRect(canvasWidth: number, canvasHeight: number, config: WatermarkConfig): WatermarkRect | null {
  const image = config.image
  if (!image || !Number.isFinite(image.naturalWidth) || !Number.isFinite(image.naturalHeight) || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null
  const diameter = (config.size / 100) * canvasWidth
  if (!Number.isFinite(diameter) || diameter <= 0) return null
  let x = canvasWidth * 0.04
  let y = canvasHeight * 0.04
  if (config.position.includes("right")) x = canvasWidth - diameter - canvasWidth * 0.04
  if (config.position.includes("bottom")) y = canvasHeight - diameter - canvasHeight * 0.04
  if (config.position === "center") { x = (canvasWidth - diameter) / 2; y = (canvasHeight - diameter) / 2 }
  return { x, y, width: diameter, height: diameter }
}

export function renderWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: WatermarkConfig,
): void {
  const rect = getWatermarkRect(canvasWidth, canvasHeight, config)
  if (!config.image || !rect) return
  const { x, y, width: diameter } = rect
  const { naturalWidth, naturalHeight } = config.image

  const sourceSize = Math.min(naturalWidth, naturalHeight)
  const sourceX = (naturalWidth - sourceSize) / 2
  const sourceY = (naturalHeight - sourceSize) / 2

  ctx.save()
  ctx.globalAlpha = config.opacity
  ctx.beginPath()
  ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(
    config.image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    x,
    y,
    diameter,
    diameter,
  )
  ctx.restore()
}
