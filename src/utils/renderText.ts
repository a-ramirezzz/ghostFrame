import type { TextConfig } from "../types"

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: TextConfig,
) {
  const bandHeight = canvasHeight * 0.4
  let y: number

  switch (config.position) {
    case "top":
      y = 0
      break
    case "bottom":
      y = canvasHeight - bandHeight
      break
    case "center":
    default:
      y = (canvasHeight - bandHeight) / 2
      break
  }

  const overlayColor = `rgba(0, 0, 0, ${config.overlayOpacity})`
  const fadeHeight = bandHeight * 0.15

  const gradient = ctx.createLinearGradient(0, y, 0, y + bandHeight)
  const fadeStart = fadeHeight / bandHeight
  const fadeEnd = 1 - fadeStart

  gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
  gradient.addColorStop(fadeStart, overlayColor)
  gradient.addColorStop(fadeEnd, overlayColor)
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)")

  ctx.fillStyle = gradient
  ctx.fillRect(0, y, canvasWidth, bandHeight)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const { width } = ctx.measureText(testLine)

    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) lines.push(currentLine)

  return lines
}

function drawText(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: TextConfig,
) {
  const scaledFontSize = (config.fontSize / 600) * canvasWidth

  ctx.font = `${scaledFontSize}px "${config.fontFamily}"`
  ctx.fillStyle = config.color
  ctx.textAlign = config.alignment

  let x: number
  switch (config.alignment) {
    case "left":
      x = canvasWidth * 0.08
      break
    case "right":
      x = canvasWidth * 0.92
      break
    case "center":
    default:
      x = canvasWidth / 2
      break
  }

  const maxWidth = canvasWidth * 0.84
  const lines = wrapText(ctx, config.content, maxWidth)
  const lineHeight = scaledFontSize * 1.4

  let startY: number
  switch (config.position) {
    case "top":
      startY = canvasHeight * 0.08 + scaledFontSize
      break
    case "bottom":
      startY = canvasHeight - lines.length * lineHeight - canvasHeight * 0.08 + scaledFontSize
      break
    case "center":
    default:
      startY = (canvasHeight - lines.length * lineHeight) / 2 + scaledFontSize
      break
  }

  ctx.shadowColor = "rgba(0,0,0,0.7)"
  ctx.shadowBlur = scaledFontSize * 0.15
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = scaledFontSize * 0.05

  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight)
  })

  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

export function renderTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: TextConfig,
): void {
  if (!config.content) return

  if (config.showOverlay) {
    drawOverlay(ctx, canvasWidth, canvasHeight, config)
  }

  drawText(ctx, canvasWidth, canvasHeight, config)
}
