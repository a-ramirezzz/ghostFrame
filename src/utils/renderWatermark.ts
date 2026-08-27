import type { WatermarkConfig } from "../types"

export function renderWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: WatermarkConfig,
): void {
  if (!config.image) return

  const wmWidth = (config.size / 100) * canvasWidth
  const wmHeight = wmWidth * (config.image.naturalHeight / config.image.naturalWidth)

  let x: number
  let y: number

  switch (config.position) {
    case "bottom-left":
      x = canvasWidth * 0.04
      y = canvasHeight - wmHeight - canvasHeight * 0.04
      break
    case "top-right":
      x = canvasWidth - wmWidth - canvasWidth * 0.04
      y = canvasHeight * 0.04
      break
    case "top-left":
      x = canvasWidth * 0.04
      y = canvasHeight * 0.04
      break
    case "center":
      x = (canvasWidth - wmWidth) / 2
      y = (canvasHeight - wmHeight) / 2
      break
    case "bottom-right":
    default:
      x = canvasWidth - wmWidth - canvasWidth * 0.04
      y = canvasHeight - wmHeight - canvasHeight * 0.04
      break
  }

  ctx.globalAlpha = config.opacity
  ctx.drawImage(config.image, x, y, wmWidth, wmHeight)
  ctx.globalAlpha = 1.0
}
