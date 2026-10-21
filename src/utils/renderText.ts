import type { TextConfig, WatermarkConfig } from "../types"
import { getWatermarkRect, type WatermarkRect } from "./renderWatermark"

export interface CompositionRenderResult { fits: boolean; warning: string | null }

const FONT_WEIGHTS: Record<string, number> = { "Playfair Display": 700, Montserrat: 700, Lora: 400, Cinzel: 400, Raleway: 300 }
export function getCanvasFont(fontFamily: string, size: number): string { return `${FONT_WEIGHTS[fontFamily] ?? 400} ${size}px "${fontFamily}"` }

function trackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number) { return ctx.measureText(text).width + Math.max(0, Array.from(text).length - 1) * tracking }
function splitLongToken(ctx: CanvasRenderingContext2D, token: string, maxWidth: number, tracking = 0) {
  const parts: string[] = []; let part = ""
  for (const character of Array.from(token)) { const candidate = part + character; if (part && trackedWidth(ctx, candidate, tracking) > maxWidth) { parts.push(part); part = character } else part = candidate }
  if (part) parts.push(part); return parts
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, tracking = 0) {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    if (!paragraph) { lines.push(""); continue }
    let line = ""
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const pieces = trackedWidth(ctx, word, tracking) > maxWidth ? splitLongToken(ctx, word, maxWidth, tracking) : [word]
      for (const piece of pieces) { const candidate = line ? `${line} ${piece}` : piece; if (line && trackedWidth(ctx, candidate, tracking) > maxWidth) { lines.push(line); line = piece } else line = candidate }
    }
    lines.push(line)
  }
  return lines
}

interface Metrics {
  quoteSize: number; quoteLines: string[]; quoteLineHeight: number; authorSize: number; authorLines: string[]; authorLineHeight: number; authorTracking: number
  signatureSize: number; signatureLines: string[]; signatureLineHeight: number; signatureTracking: number; dividerHeight: number; dividerWidth: number
  quoteGap: number; dividerGap: number; signatureGap: number; blockHeight: number; blockTop: number; blockBottom: number; x: number; maxWidth: number; fits: boolean
}

function calculateMetrics(ctx: CanvasRenderingContext2D, width: number, height: number, config: TextConfig, fitScale: number): Metrics {
  const quoteSize = config.fontSize * (width / 600) * fitScale, quoteLineHeight = quoteSize * 1.28
  const safeX = Math.max(width * 0.075, Math.min(width, height) * 0.055), safeY = Math.max(height * 0.065, Math.min(width, height) * 0.055), maxWidth = width - safeX * 2
  ctx.font = getCanvasFont(config.fontFamily, quoteSize); const quoteLines = config.content.trim() ? wrapText(ctx, config.content, maxWidth) : []
  const authorSize = quoteSize * 0.48, authorLineHeight = authorSize * 1.35, authorTracking = authorSize * 0.08
  ctx.font = getCanvasFont("Cinzel", authorSize); const authorLines = config.author.trim() ? wrapText(ctx, config.author.trim(), maxWidth, authorTracking) : []
  const normalizedPage = config.pageName.trim().replace(/^@+/, ""), signatureSize = quoteSize * 0.35, signatureLineHeight = signatureSize * 1.34
  let signatureTracking = signatureSize * 0.085; ctx.font = getCanvasFont("Cinzel", signatureSize); const signature = normalizedPage ? `@${normalizedPage.toUpperCase()}` : ""
  if (signature && trackedWidth(ctx, signature, signatureTracking) > maxWidth) signatureTracking = signatureSize * 0.045
  const signatureLines = signature ? wrapText(ctx, signature, maxWidth, signatureTracking) : []
  const quoteGap = quoteLines.length && authorLines.length ? quoteSize * 0.58 : 0
  const dividerHeight = signatureLines.length ? Math.max(10, quoteSize * 0.28) : 0
  const dividerWidth = signatureLines.length ? Math.min(maxWidth * 0.34, Math.max(maxWidth * 0.3, quoteSize * 3.8)) : 0
  const dividerGap = signatureLines.length && (quoteLines.length || authorLines.length) ? quoteSize * 0.5 : 0, signatureGap = signatureLines.length ? quoteSize * 0.3 : 0
  const blockHeight = quoteLines.length * quoteLineHeight + quoteGap + authorLines.length * authorLineHeight + dividerGap + dividerHeight + signatureGap + signatureLines.length * signatureLineHeight
  let blockTop = (height - blockHeight) / 2; if (config.position === "top") blockTop = safeY; if (config.position === "bottom") blockTop = height - safeY - blockHeight
  const blockBottom = blockTop + blockHeight, x = config.alignment === "left" ? safeX : config.alignment === "right" ? width - safeX : width / 2
  return { quoteSize, quoteLines, quoteLineHeight, authorSize, authorLines, authorLineHeight, authorTracking, signatureSize, signatureLines, signatureLineHeight, signatureTracking,
    dividerHeight, dividerWidth, quoteGap, dividerGap, signatureGap, blockHeight, blockTop, blockBottom, x, maxWidth, fits: blockTop >= safeY - 0.5 && blockBottom <= height - safeY + 0.5 }
}
function measureComposition(ctx: CanvasRenderingContext2D, width: number, height: number, config: TextConfig) { let metrics = calculateMetrics(ctx, width, height, config, 1); for (let scale = 0.94; !metrics.fits && scale >= 0.56; scale -= 0.06) metrics = calculateMetrics(ctx, width, height, config, scale); return metrics }

function drawOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, config: TextConfig, metrics: Metrics) {
  const padding = Math.max(metrics.quoteSize * 0.9, height * 0.035), top = Math.max(0, metrics.blockTop - padding), bottom = Math.min(height, metrics.blockBottom + padding), bandHeight = Math.max(1, bottom - top), fade = Math.min(0.28, Math.max(0.08, padding / bandHeight))
  const gradient = ctx.createLinearGradient(0, top, 0, bottom), color = `rgba(0, 0, 0, ${config.overlayOpacity})`; gradient.addColorStop(0, "rgba(0, 0, 0, 0)"); gradient.addColorStop(fade, color); gradient.addColorStop(1 - fade, color); gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); ctx.fillStyle = gradient; ctx.fillRect(0, top, width, bandHeight)
}
function overlaps(a: WatermarkRect, b: WatermarkRect) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }
function drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string, watermark: WatermarkRect | null) {
  const unit = Math.min(width, height), inset = unit * 0.052, corner = unit * 0.105, opening = unit * 0.02, pad = unit * 0.018
  const blocked = watermark ? { x: watermark.x - pad, y: watermark.y - pad, width: watermark.width + pad * 2, height: watermark.height + pad * 2 } : null
  const corners = [{ sx: 1, sy: 1, x: inset, y: inset }, { sx: -1, sy: 1, x: width - inset, y: inset }, { sx: 1, sy: -1, x: inset, y: height - inset }, { sx: -1, sy: -1, x: width - inset, y: height - inset }]
  ctx.save(); ctx.strokeStyle = accent; ctx.lineCap = "square"
  for (const c of corners) {
    const bounds = { x: c.sx > 0 ? c.x : c.x - corner, y: c.sy > 0 ? c.y : c.y - corner, width: corner, height: corner }; if (blocked && overlaps(bounds, blocked)) continue
    ctx.globalAlpha = 0.62; ctx.lineWidth = Math.max(1, unit * 0.00135); ctx.beginPath(); ctx.moveTo(c.x + c.sx * corner, c.y); ctx.lineTo(c.x + c.sx * opening, c.y); ctx.lineTo(c.x, c.y + c.sy * opening); ctx.lineTo(c.x, c.y + c.sy * corner); ctx.stroke()
    const echoInset = unit * 0.012, echo = corner * 0.48; ctx.globalAlpha = 0.36; ctx.lineWidth = Math.max(0.75, unit * 0.00085); ctx.beginPath(); ctx.moveTo(c.x + c.sx * echo, c.y + c.sy * echoInset); ctx.lineTo(c.x + c.sx * (opening + echoInset), c.y + c.sy * echoInset); ctx.lineTo(c.x + c.sx * echoInset, c.y + c.sy * (opening + echoInset)); ctx.lineTo(c.x + c.sx * echoInset, c.y + c.sy * echo); ctx.stroke()
  }
  ctx.restore()
}
function drawTrackedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, alignment: CanvasTextAlign) {
  const characters = Array.from(text), width = trackedWidth(ctx, text, tracking); let cursor = alignment === "center" ? x - width / 2 : alignment === "right" ? x - width : x; ctx.textAlign = "left"
  characters.forEach((character, index) => { ctx.fillText(character, cursor, y); cursor += ctx.measureText(character).width + (index < characters.length - 1 ? tracking : 0) })
}
function drawDivider(ctx: CanvasRenderingContext2D, metrics: Metrics, color: string, y: number, alignment: CanvasTextAlign) {
  const width = metrics.dividerWidth, diamond = Math.max(6, metrics.dividerHeight * 0.5); let center = metrics.x; if (alignment === "left") center += width / 2; if (alignment === "right") center -= width / 2
  const innerGap = diamond * 1.15, accentY = y + diamond * 0.72, innerArm = width * 0.28; ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = "square"
  ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(1, metrics.quoteSize * 0.017); ctx.beginPath(); ctx.moveTo(center - width / 2, y); ctx.lineTo(center - innerGap, y); ctx.moveTo(center + innerGap, y); ctx.lineTo(center + width / 2, y); ctx.moveTo(center, y - diamond); ctx.lineTo(center + diamond, y); ctx.lineTo(center, y + diamond); ctx.lineTo(center - diamond, y); ctx.closePath(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(center, y - diamond * 0.24); ctx.lineTo(center + diamond * 0.24, y); ctx.lineTo(center, y + diamond * 0.24); ctx.lineTo(center - diamond * 0.24, y); ctx.closePath(); ctx.fill()
  ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(0.75, metrics.quoteSize * 0.009); ctx.beginPath(); ctx.moveTo(center - innerGap, accentY); ctx.lineTo(center - innerArm, accentY); ctx.moveTo(center + innerGap, accentY); ctx.lineTo(center + innerArm, accentY); ctx.stroke(); ctx.restore()
}

export function renderTextOnCanvas(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, config: TextConfig, watermarkConfig?: WatermarkConfig): CompositionRenderResult {
  const hasComposition = Boolean(config.content.trim() || config.author.trim() || config.pageName.trim()); ctx.save()
  if (config.showFrame) drawFrame(ctx, canvasWidth, canvasHeight, config.accentColor, watermarkConfig ? getWatermarkRect(canvasWidth, canvasHeight, watermarkConfig) : null)
  if (!hasComposition) { ctx.restore(); return { fits: true, warning: null } }
  const metrics = measureComposition(ctx, canvasWidth, canvasHeight, config); if (config.showOverlay) drawOverlay(ctx, canvasWidth, canvasHeight, config, metrics); ctx.textAlign = config.alignment; ctx.textBaseline = "top"; let y = metrics.blockTop
  if (metrics.quoteLines.length) { ctx.font = getCanvasFont(config.fontFamily, metrics.quoteSize); ctx.fillStyle = config.color; ctx.shadowColor = "rgba(0, 0, 0, 0.72)"; ctx.shadowBlur = metrics.quoteSize * 0.1; ctx.shadowOffsetY = metrics.quoteSize * 0.045; metrics.quoteLines.forEach((line, index) => ctx.fillText(line, metrics.x, y + index * metrics.quoteLineHeight)); y += metrics.quoteLines.length * metrics.quoteLineHeight }
  if (metrics.authorLines.length) { y += metrics.quoteGap; ctx.font = getCanvasFont("Cinzel", metrics.authorSize); ctx.fillStyle = config.color; ctx.globalAlpha = 0.9; metrics.authorLines.forEach((line, index) => drawTrackedText(ctx, line, metrics.x, y + index * metrics.authorLineHeight, metrics.authorTracking, config.alignment)); y += metrics.authorLines.length * metrics.authorLineHeight }
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.globalAlpha = 1
  if (metrics.signatureLines.length) { y += metrics.dividerGap; drawDivider(ctx, metrics, config.accentColor, y + metrics.dividerHeight / 2, config.alignment); y += metrics.dividerHeight + metrics.signatureGap; ctx.font = getCanvasFont("Cinzel", metrics.signatureSize); ctx.fillStyle = config.accentColor; ctx.globalAlpha = 0.94; metrics.signatureLines.forEach((line, index) => drawTrackedText(ctx, line, metrics.x, y + index * metrics.signatureLineHeight, metrics.signatureTracking, config.alignment)) }
  ctx.restore(); return { fits: metrics.fits, warning: metrics.fits ? null : "This composition is too long to fit safely. Shorten the text or reduce the font size." }
}
