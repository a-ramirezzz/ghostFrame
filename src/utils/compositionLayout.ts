import type { TextConfig, WatermarkConfig } from "../types"
import { createTrackedMeasurer, getCanvasFont, wrapText } from "./compositionText"
import {
  COMPOSITION_FIT_ERROR,
  LOGICAL_COMPOSITION_WIDTH,
  type CompositionLayout,
  type FrameCorner,
  type Rect,
  type TextSection,
} from "./compositionTypes"

export function getLogicalCompositionSize(sourceWidth: number, sourceHeight: number) {
  const validDimensions = [sourceWidth, sourceHeight].every(
    (value) => Number.isFinite(value) && value > 0,
  )
  if (!validDimensions) throw new Error("Invalid image dimensions")

  return {
    width: LOGICAL_COMPOSITION_WIDTH,
    height: (LOGICAL_COMPOSITION_WIDTH * sourceHeight) / sourceWidth,
  }
}

function getWatermarkRect(
  width: number,
  height: number,
  config: WatermarkConfig,
): Rect | null {
  const image = config.image
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null

  const diameter = (config.size / 100) * width
  if (!Number.isFinite(diameter) || diameter <= 0) return null

  let x = width * 0.04
  let y = height * 0.04
  if (config.position.includes("right")) x = width - diameter - width * 0.04
  if (config.position.includes("bottom")) y = height - diameter - height * 0.04
  if (config.position === "center") {
    x = (width - diameter) / 2
    y = (height - diameter) / 2
  }

  return { x, y, width: diameter, height: diameter }
}

function overlaps(first: Rect, second: Rect): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  )
}

function calculateLayout(
  ctx: CanvasRenderingContext2D,
  height: number,
  config: TextConfig,
  watermarkConfig: WatermarkConfig,
  fitScale: number,
): CompositionLayout {
  const width = LOGICAL_COMPOSITION_WIDTH
  const quoteSize = config.fontSize * fitScale
  const safeX = Math.max(width * 0.075, Math.min(width, height) * 0.055)
  const safeY = Math.max(height * 0.065, Math.min(width, height) * 0.055)
  const maxWidth = width - safeX * 2
  const measure = createTrackedMeasurer(ctx)

  ctx.font = getCanvasFont(config.fontFamily, quoteSize)
  const quote: TextSection = {
    font: config.fontFamily,
    size: quoteSize,
    lineHeight: quoteSize * 1.28,
    tracking: 0,
    lines: config.content.trim() ? wrapText(config.content, maxWidth, 0, measure) : [],
  }

  const authorSize = quoteSize * 0.48
  const authorTracking = authorSize * 0.08
  ctx.font = getCanvasFont("Cinzel", authorSize)
  const author: TextSection = {
    font: "Cinzel",
    size: authorSize,
    lineHeight: authorSize * 1.35,
    tracking: authorTracking,
    lines: config.author.trim()
      ? wrapText(config.author.trim(), maxWidth, authorTracking, measure)
      : [],
  }

  const signatureSize = quoteSize * 0.35
  const normalizedPage = config.pageName.trim().replace(/^@+/, "")
  const signatureText = normalizedPage ? `@${normalizedPage.toUpperCase()}` : ""
  ctx.font = getCanvasFont("Cinzel", signatureSize)
  let signatureTracking = signatureSize * 0.085
  if (signatureText && measure.width(signatureText, signatureTracking) > maxWidth) {
    signatureTracking = signatureSize * 0.045
  }
  const signature: TextSection = {
    font: "Cinzel",
    size: signatureSize,
    lineHeight: signatureSize * 1.34,
    tracking: signatureTracking,
    lines: signatureText
      ? wrapText(signatureText, maxWidth, signatureTracking, measure)
      : [],
  }

  const quoteGap = quote.lines.length && author.lines.length ? quoteSize * 0.58 : 0
  const dividerHeight = signature.lines.length ? Math.max(10, quoteSize * 0.28) : 0
  const dividerWidth = signature.lines.length
    ? Math.min(maxWidth * 0.34, Math.max(maxWidth * 0.3, quoteSize * 3.8))
    : 0
  const dividerGap =
    signature.lines.length && (quote.lines.length || author.lines.length)
      ? quoteSize * 0.5
      : 0
  const signatureGap = signature.lines.length ? quoteSize * 0.3 : 0
  const blockHeight =
    quote.lines.length * quote.lineHeight +
    quoteGap +
    author.lines.length * author.lineHeight +
    dividerGap +
    dividerHeight +
    signatureGap +
    signature.lines.length * signature.lineHeight

  let blockTop = (height - blockHeight) / 2
  if (config.position === "top") blockTop = safeY
  if (config.position === "bottom") blockTop = height - safeY - blockHeight
  const blockBottom = blockTop + blockHeight
  const x =
    config.alignment === "left"
      ? safeX
      : config.alignment === "right"
        ? width - safeX
        : width / 2
  const fits = blockTop >= safeY - 0.5 && blockBottom <= height - safeY + 0.5

  let currentY = blockTop
  const quoteY = currentY
  currentY += quote.lines.length * quote.lineHeight
  if (author.lines.length) currentY += quoteGap
  const authorY = currentY
  currentY += author.lines.length * author.lineHeight

  let divider: CompositionLayout["divider"] = null
  if (signature.lines.length) {
    currentY += dividerGap
    let centerX = x
    if (config.alignment === "left") centerX += dividerWidth / 2
    if (config.alignment === "right") centerX -= dividerWidth / 2
    divider = {
      width: dividerWidth,
      height: dividerHeight,
      diamond: Math.max(6, dividerHeight * 0.5),
      centerX,
      y: currentY + dividerHeight / 2,
    }
    currentY += dividerHeight + signatureGap
  }
  const signatureY = currentY

  const padding = Math.max(quoteSize * 0.9, height * 0.035)
  const overlayTop = Math.max(0, blockTop - padding)
  const overlayBottom = Math.min(height, blockBottom + padding)
  const bandHeight = Math.max(1, overlayBottom - overlayTop)
  const watermark = getWatermarkRect(width, height, watermarkConfig)
  const unit = Math.min(width, height)
  const inset = unit * 0.052
  const corner = unit * 0.105
  const opening = unit * 0.02
  const watermarkPadding = unit * 0.018
  const blocked = watermark
    ? {
        x: watermark.x - watermarkPadding,
        y: watermark.y - watermarkPadding,
        width: watermark.width + watermarkPadding * 2,
        height: watermark.height + watermarkPadding * 2,
      }
    : null
  const corners: FrameCorner[] = [
    { sx: 1, sy: 1, x: inset, y: inset, visible: true },
    { sx: -1, sy: 1, x: width - inset, y: inset, visible: true },
    { sx: 1, sy: -1, x: inset, y: height - inset, visible: true },
    { sx: -1, sy: -1, x: width - inset, y: height - inset, visible: true },
  ]
  for (const item of corners) {
    const bounds = {
      x: item.sx > 0 ? item.x : item.x - corner,
      y: item.sy > 0 ? item.y : item.y - corner,
      width: corner,
      height: corner,
    }
    item.visible = !blocked || !overlaps(bounds, blocked)
  }

  return {
    logicalWidth: width,
    logicalHeight: height,
    fits,
    warning: fits ? null : COMPOSITION_FIT_ERROR,
    x,
    alignment: config.alignment,
    blockTop,
    blockBottom,
    quote,
    author,
    signature,
    quoteY,
    authorY,
    signatureY,
    divider,
    overlay:
      config.showOverlay && blockHeight > 0
        ? {
            top: overlayTop,
            bottom: overlayBottom,
            fade: Math.min(0.28, Math.max(0.08, padding / bandHeight)),
          }
        : null,
    frame: config.showFrame ? { unit, inset, corner, opening, corners } : null,
    watermark,
  }
}

export function layoutComposition(
  ctx: CanvasRenderingContext2D,
  sourceWidth: number,
  sourceHeight: number,
  config: TextConfig,
  watermarkConfig: WatermarkConfig,
): CompositionLayout {
  const { height } = getLogicalCompositionSize(sourceWidth, sourceHeight)
  let layout = calculateLayout(ctx, height, config, watermarkConfig, 1)

  for (let scale = 0.94; !layout.fits && scale >= 0.56; scale -= 0.06) {
    layout = calculateLayout(ctx, height, config, watermarkConfig, scale)
  }

  return layout
}
