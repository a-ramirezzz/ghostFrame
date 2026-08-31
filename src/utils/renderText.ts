import type { TextConfig } from "../types"

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: TextConfig,
  bandHeight: number,
) {
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

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text

  let truncated = text
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }

  return `${truncated}…`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "")
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized

  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)

  return {
    r: Number.isNaN(r) ? 255 : r,
    g: Number.isNaN(g) ? 255 : g,
    b: Number.isNaN(b) ? 255 : b,
  }
}

interface TextMetrics {
  x: number
  scaledFontSize: number
  lines: string[]
  lineHeight: number
  startY: number
  maxWidth: number
  authorLine: string | null
  authorFontSize: number
  authorY: number
  pageNameLine: string | null
  pageNameFontSize: number
  pageNameY: number
}

function measureText(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: TextConfig,
): TextMetrics {
  const scaledFontSize = (config.fontSize / 600) * canvasWidth

  ctx.font = `${scaledFontSize}px "${config.fontFamily}"`
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

  const authorFontSize = scaledFontSize * 0.58
  let authorLine: string | null = null
  let authorY = 0

  const trimmedAuthor = config.author?.trim()
  if (trimmedAuthor) {
    ctx.font = `${authorFontSize}px "${config.fontFamily}"`
    authorLine = truncateToWidth(ctx, `— ${trimmedAuthor}`, maxWidth)
    authorY = startY + (lines.length - 1) * lineHeight + lineHeight * 1.1
  }

  const pageNameFontSize = scaledFontSize * 0.4
  let pageNameLine: string | null = null
  let pageNameY = 0

  const trimmedPageName = config.pageName?.trim().replace(/^@+/, "")
  if (trimmedPageName) {
    ctx.font = `${pageNameFontSize}px "${config.fontFamily}"`
    pageNameLine = truncateToWidth(ctx, `@${trimmedPageName.toUpperCase()}`, maxWidth)

    if (authorLine) {
      pageNameY = authorY + pageNameFontSize * 1.5
    } else {
      pageNameY = startY + (lines.length - 1) * lineHeight + lineHeight * 1.2
    }
  }

  return {
    x,
    scaledFontSize,
    lines,
    lineHeight,
    startY,
    maxWidth,
    authorLine,
    authorFontSize,
    authorY,
    pageNameLine,
    pageNameFontSize,
    pageNameY,
  }
}

function drawMainText(
  ctx: CanvasRenderingContext2D,
  config: TextConfig,
  metrics: TextMetrics,
) {
  const { x, scaledFontSize, lines, lineHeight, startY } = metrics

  ctx.font = `${scaledFontSize}px "${config.fontFamily}"`
  ctx.fillStyle = config.color
  ctx.textAlign = config.alignment

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

function drawAuthor(
  ctx: CanvasRenderingContext2D,
  config: TextConfig,
  metrics: TextMetrics,
) {
  const { x, authorLine, authorFontSize, authorY } = metrics
  if (!authorLine) return

  const { r, g, b } = hexToRgb(config.color)

  ctx.font = `${authorFontSize}px "${config.fontFamily}"`
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.75)`
  ctx.textAlign = config.alignment

  ctx.shadowColor = "rgba(0,0,0,0.7)"
  ctx.shadowBlur = authorFontSize * 0.15
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = authorFontSize * 0.05

  ctx.fillText(authorLine, x, authorY)

  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

function drawPageName(
  ctx: CanvasRenderingContext2D,
  config: TextConfig,
  metrics: TextMetrics,
) {
  const { x, pageNameLine, pageNameFontSize, pageNameY } = metrics
  if (!pageNameLine) return

  const { r, g, b } = hexToRgb(config.color)

  ctx.font = `${pageNameFontSize}px "${config.fontFamily}"`
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.55)`
  ctx.textAlign = config.alignment

  ctx.shadowColor = "rgba(0,0,0,0.5)"
  ctx.shadowBlur = pageNameFontSize * 0.12
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = pageNameFontSize * 0.04

  ctx.fillText(pageNameLine, x, pageNameY)

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

  const metrics = measureText(ctx, canvasWidth, canvasHeight, config)

  if (config.showOverlay) {
    let bandHeight = canvasHeight * 0.4
    if (metrics.authorLine) {
      bandHeight += metrics.authorFontSize * 1.5
    }
    if (metrics.pageNameLine) {
      bandHeight += metrics.pageNameFontSize * 2
    }
    drawOverlay(ctx, canvasWidth, canvasHeight, config, bandHeight)
  }

  drawMainText(ctx, config, metrics)
  drawAuthor(ctx, config, metrics)
  drawPageName(ctx, config, metrics)
}
