import type { TextConfig, WatermarkConfig } from "../types"
import { getCanvasFont } from "./compositionText"
import type { CompositionLayout, DestinationMapping, TextLine, TextSection } from "./compositionTypes"

export function getDestinationMapping(destinationWidth: number, destinationHeight: number, logicalWidth: number, logicalHeight: number): DestinationMapping {
  // Rounded export dimensions can differ slightly from the source aspect ratio.
  // Centered cover keeps every layer on one uniform mapping.
  const scale = Math.max(destinationWidth / logicalWidth, destinationHeight / logicalHeight)
  return {
    scale,
    offsetX: (destinationWidth - logicalWidth * scale) / 2,
    offsetY: (destinationHeight - logicalHeight * scale) / 2,
  }
}

export function applyDestinationMapping(ctx: CanvasRenderingContext2D, mapping: DestinationMapping): void {
  ctx.translate(mapping.offsetX, mapping.offsetY)
  ctx.scale(mapping.scale, mapping.scale)
}

function drawTrackedText(ctx: CanvasRenderingContext2D, line: TextLine, x: number, y: number, tracking: number, alignment: CanvasTextAlign): void {
  const runs = line.runs ?? []
  let cursor = alignment === "center" ? x - line.width / 2 : alignment === "right" ? x - line.width : x
  ctx.textAlign = "left"
  runs.forEach((run, index) => {
    ctx.fillText(run.text, cursor, y)
    cursor += run.advance + (index < runs.length - 1 ? tracking : 0)
  })
}

function drawLines(ctx: CanvasRenderingContext2D, section: TextSection, x: number, y: number, alignment: CanvasTextAlign): void {
  ctx.font = getCanvasFont(section.font, section.size)
  section.lines.forEach((line, index) => {
    const lineY = y + index * section.lineHeight
    if (section.tracking) {
      drawTrackedText(ctx, line, x, lineY, section.tracking, alignment)
    } else {
      ctx.textAlign = alignment
      ctx.fillText(line.text, x, lineY)
    }
  })
}

function drawFrame(ctx: CanvasRenderingContext2D, layout: CompositionLayout, accent: string): void {
  const frame = layout.frame
  if (!frame) return
  ctx.save()
  try {
    ctx.strokeStyle = accent
    ctx.lineCap = "square"
    for (const corner of frame.corners) {
      if (!corner.visible) continue
      ctx.globalAlpha = 0.62
      ctx.lineWidth = Math.max(1, frame.unit * 0.00135)
      ctx.beginPath()
      ctx.moveTo(corner.x + corner.sx * frame.corner, corner.y)
      ctx.lineTo(corner.x + corner.sx * frame.opening, corner.y)
      ctx.lineTo(corner.x, corner.y + corner.sy * frame.opening)
      ctx.lineTo(corner.x, corner.y + corner.sy * frame.corner)
      ctx.stroke()

      const echoInset = frame.unit * 0.012
      const echo = frame.corner * 0.48
      ctx.globalAlpha = 0.36
      ctx.lineWidth = Math.max(0.75, frame.unit * 0.00085)
      ctx.beginPath()
      ctx.moveTo(corner.x + corner.sx * echo, corner.y + corner.sy * echoInset)
      ctx.lineTo(corner.x + corner.sx * (frame.opening + echoInset), corner.y + corner.sy * echoInset)
      ctx.lineTo(corner.x + corner.sx * echoInset, corner.y + corner.sy * (frame.opening + echoInset))
      ctx.lineTo(corner.x + corner.sx * echoInset, corner.y + corner.sy * echo)
      ctx.stroke()
    }
  } finally {
    ctx.restore()
  }
}

function drawDivider(ctx: CanvasRenderingContext2D, layout: CompositionLayout, color: string): void {
  const divider = layout.divider
  if (!divider) return
  const center = divider.centerX
  const { width, diamond, y } = divider
  const innerGap = diamond * 1.15
  const accentY = y + diamond * 0.72
  const innerArm = width * 0.28
  ctx.save()
  try {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineCap = "square"
    ctx.globalAlpha = 0.9
    ctx.lineWidth = Math.max(1, layout.quote.size * 0.017)
    ctx.beginPath()
    ctx.moveTo(center - width / 2, y)
    ctx.lineTo(center - innerGap, y)
    ctx.moveTo(center + innerGap, y)
    ctx.lineTo(center + width / 2, y)
    ctx.moveTo(center, y - diamond)
    ctx.lineTo(center + diamond, y)
    ctx.lineTo(center, y + diamond)
    ctx.lineTo(center - diamond, y)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(center, y - diamond * 0.24)
    ctx.lineTo(center + diamond * 0.24, y)
    ctx.lineTo(center, y + diamond * 0.24)
    ctx.lineTo(center - diamond * 0.24, y)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.lineWidth = Math.max(0.75, layout.quote.size * 0.009)
    ctx.beginPath()
    ctx.moveTo(center - innerGap, accentY)
    ctx.lineTo(center - innerArm, accentY)
    ctx.moveTo(center + innerGap, accentY)
    ctx.lineTo(center + innerArm, accentY)
    ctx.stroke()
  } finally {
    ctx.restore()
  }
}

export function drawBaseImage(ctx: CanvasRenderingContext2D, destinationWidth: number, destinationHeight: number, layout: CompositionLayout, image: CanvasImageSource): void {
  const mapping = getDestinationMapping(destinationWidth, destinationHeight, layout.logicalWidth, layout.logicalHeight)
  ctx.save()
  try {
    ctx.beginPath()
    ctx.rect(0, 0, destinationWidth, destinationHeight)
    ctx.clip()
    applyDestinationMapping(ctx, mapping)
    ctx.drawImage(image, 0, 0, layout.logicalWidth, layout.logicalHeight)
  } finally {
    ctx.restore()
  }
}

export function drawComposition(ctx: CanvasRenderingContext2D, destinationWidth: number, destinationHeight: number, layout: CompositionLayout, config: TextConfig): void {
  const mapping = getDestinationMapping(destinationWidth, destinationHeight, layout.logicalWidth, layout.logicalHeight)
  ctx.save()
  try {
    applyDestinationMapping(ctx, mapping)
    drawFrame(ctx, layout, config.accentColor)
    if (layout.overlay) {
      const { top, bottom, fade } = layout.overlay
      const gradient = ctx.createLinearGradient(0, top, 0, bottom)
      const color = `rgba(0, 0, 0, ${config.overlayOpacity})`
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
      gradient.addColorStop(fade, color)
      gradient.addColorStop(1 - fade, color)
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, top, layout.logicalWidth, bottom - top)
    }
    ctx.textBaseline = "top"
    if (layout.quote.lines.length) {
      ctx.fillStyle = config.color
      ctx.shadowColor = "rgba(0, 0, 0, 0.72)"
      // Canvas shadow values are not transformed, so scale them to the destination explicitly.
      ctx.shadowBlur = layout.quote.size * 0.1 * mapping.scale
      ctx.shadowOffsetY = layout.quote.size * 0.045 * mapping.scale
      drawLines(ctx, layout.quote, layout.x, layout.quoteY, layout.alignment)
    }
    if (layout.author.lines.length) {
      ctx.fillStyle = config.color
      ctx.globalAlpha = 0.9
      drawLines(ctx, layout.author, layout.x, layout.authorY, layout.alignment)
    }
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.globalAlpha = 1
    drawDivider(ctx, layout, config.accentColor)
    if (layout.signature.lines.length) {
      ctx.fillStyle = config.accentColor
      ctx.globalAlpha = 0.94
      drawLines(ctx, layout.signature, layout.x, layout.signatureY, layout.alignment)
    }
  } finally {
    ctx.restore()
  }
}

export function drawWatermark(ctx: CanvasRenderingContext2D, destinationWidth: number, destinationHeight: number, layout: CompositionLayout, config: WatermarkConfig): void {
  const image = config.image
  const rect = layout.watermark
  if (!image || !rect) return
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
  const mapping = getDestinationMapping(destinationWidth, destinationHeight, layout.logicalWidth, layout.logicalHeight)
  ctx.save()
  try {
    applyDestinationMapping(ctx, mapping)
    ctx.globalAlpha = config.opacity
    ctx.beginPath()
    ctx.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(
      image,
      (image.naturalWidth - sourceSize) / 2,
      (image.naturalHeight - sourceSize) / 2,
      sourceSize,
      sourceSize,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    )
  } finally {
    ctx.restore()
  }
}
