import type { TextConfig, WatermarkConfig } from "../types"

export const LOGICAL_COMPOSITION_WIDTH = 600
export const COMPOSITION_FIT_ERROR = "This composition does not fit within the image. Shorten the text or reduce its size."

const FONT_WEIGHTS: Record<string, number> = { "Playfair Display": 700, Montserrat: 700, Lora: 400, Cinzel: 400, Raleway: 300 }
export interface Rect { x: number; y: number; width: number; height: number }
export interface TextRun { text: string; advance: number }
export interface TextLine { text: string; width: number; runs?: TextRun[] }
export interface DestinationMapping { scale: number; offsetX: number; offsetY: number }
interface TextSection { font: string; size: number; lineHeight: number; tracking: number; lines: TextLine[] }
interface DividerLayout { width: number; height: number; diamond: number; centerX: number; y: number }
interface FrameCorner { x: number; y: number; sx: 1 | -1; sy: 1 | -1; visible: boolean }
export interface CompositionLayout {
  logicalWidth: number; logicalHeight: number; fits: boolean; warning: string | null
  x: number; alignment: CanvasTextAlign; blockTop: number; blockBottom: number
  quote: TextSection; author: TextSection; signature: TextSection
  quoteY: number; authorY: number; signatureY: number; divider: DividerLayout | null
  overlay: { top: number; bottom: number; fade: number } | null
  frame: { unit: number; inset: number; corner: number; opening: number; corners: FrameCorner[] } | null
  watermark: Rect | null
}

export function getCanvasFont(fontFamily: string, size: number): string { return `${FONT_WEIGHTS[fontFamily] ?? 400} ${size}px "${fontFamily}"` }
export async function prepareCompositionFonts(config: TextConfig): Promise<void> {
  const requests = new Set([getCanvasFont(config.fontFamily, config.fontSize), getCanvasFont("Cinzel", config.fontSize * 0.48), getCanvasFont("Cinzel", config.fontSize * 0.35)])
  await Promise.all(Array.from(requests, (font) => document.fonts.load(font)))
  await document.fonts.ready
}
export function getLogicalCompositionSize(sourceWidth: number, sourceHeight: number) {
  if (![sourceWidth, sourceHeight].every((value) => Number.isFinite(value) && value > 0)) throw new Error("Invalid image dimensions")
  return { width: LOGICAL_COMPOSITION_WIDTH, height: LOGICAL_COMPOSITION_WIDTH * sourceHeight / sourceWidth }
}

export function splitGraphemesFallback(text: string): string[] {
  const result: string[] = [], combining = /\p{Mark}/u
  let joinNext = false
  let regionalIndicators = 0
  for (const point of Array.from(text)) {
    const codePoint = point.codePointAt(0) ?? 0
    const variationOrModifier = codePoint === 0xfe0e || codePoint === 0xfe0f || (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
    const regionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
    if (result.length && (combining.test(point) || variationOrModifier || joinNext || point === "\u200d" || (regionalIndicator && regionalIndicators % 2 === 1))) result[result.length - 1] += point
    else result.push(point)
    joinNext = point === "\u200d"
    regionalIndicators = regionalIndicator ? regionalIndicators + 1 : 0
  }
  return result
}
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null
export function splitGraphemes(text: string): string[] { return segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : splitGraphemesFallback(text) }

function createTrackedMeasurer(ctx: CanvasRenderingContext2D) {
  const advanceCache = new Map<string, number>(), graphemeCache = new Map<string, string[]>()
  const graphemes = (text: string) => { const cached = graphemeCache.get(text); if (cached) return cached; const value = splitGraphemes(text); graphemeCache.set(text, value); return value }
  const advance = (value: string) => { const key = `${ctx.font}\u0000${value}`, cached = advanceCache.get(key); if (cached !== undefined) return cached; const measured = ctx.measureText(value).width; advanceCache.set(key, measured); return measured }
  const line = (text: string, tracking: number): TextLine => {
    if (tracking === 0) return { text, width: advance(text) }
    const runs = graphemes(text).map((part) => ({ text: part, advance: advance(part) }))
    return { text, runs, width: runs.reduce((sum, run) => sum + run.advance, 0) + Math.max(0, runs.length - 1) * tracking }
  }
  const width = (text: string, tracking: number) => line(text, tracking).width
  return { graphemes, line, width }
}
type Measurer = ReturnType<typeof createTrackedMeasurer>
function splitLongToken(token: string, maxWidth: number, tracking: number, measure: Measurer) {
  const parts: string[] = []; let part = ""
  for (const grapheme of measure.graphemes(token)) { const candidate = part + grapheme; if (part && measure.width(candidate, tracking) > maxWidth) { parts.push(part); part = grapheme } else part = candidate }
  if (part) parts.push(part); return parts
}
function wrapText(text: string, maxWidth: number, tracking: number, measure: Measurer): TextLine[] {
  const lines: TextLine[] = []
  for (const paragraph of text.split("\n")) {
    if (!paragraph) { lines.push(measure.line("", tracking)); continue }
    let line = ""
    for (const word of paragraph.split(/\s+/u).filter(Boolean)) {
      const pieces = measure.width(word, tracking) > maxWidth ? splitLongToken(word, maxWidth, tracking, measure) : [word]
      for (const piece of pieces) { const candidate = line ? `${line} ${piece}` : piece; if (line && measure.width(candidate, tracking) > maxWidth) { lines.push(measure.line(line, tracking)); line = piece } else line = candidate }
    }
    lines.push(measure.line(line, tracking))
  }
  return lines
}
function getWatermarkRect(width: number, height: number, config: WatermarkConfig): Rect | null {
  const image = config.image
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null
  const diameter = config.size / 100 * width
  if (!Number.isFinite(diameter) || diameter <= 0) return null
  let x = width * 0.04, y = height * 0.04
  if (config.position.includes("right")) x = width - diameter - width * 0.04
  if (config.position.includes("bottom")) y = height - diameter - height * 0.04
  if (config.position === "center") { x = (width - diameter) / 2; y = (height - diameter) / 2 }
  return { x, y, width: diameter, height: diameter }
}
function overlaps(a: Rect, b: Rect) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }

function calculateLayout(ctx: CanvasRenderingContext2D, height: number, config: TextConfig, watermarkConfig: WatermarkConfig, fitScale: number): CompositionLayout {
  const width = LOGICAL_COMPOSITION_WIDTH, quoteSize = config.fontSize * fitScale
  const safeX = Math.max(width * 0.075, Math.min(width, height) * 0.055), safeY = Math.max(height * 0.065, Math.min(width, height) * 0.055), maxWidth = width - safeX * 2
  const measure = createTrackedMeasurer(ctx)
  ctx.font = getCanvasFont(config.fontFamily, quoteSize)
  const quote: TextSection = { font: config.fontFamily, size: quoteSize, lineHeight: quoteSize * 1.28, tracking: 0, lines: config.content.trim() ? wrapText(config.content, maxWidth, 0, measure) : [] }
  const authorSize = quoteSize * 0.48
  ctx.font = getCanvasFont("Cinzel", authorSize)
  const author: TextSection = { font: "Cinzel", size: authorSize, lineHeight: authorSize * 1.35, tracking: authorSize * 0.08, lines: config.author.trim() ? wrapText(config.author.trim(), maxWidth, authorSize * 0.08, measure) : [] }
  const signatureSize = quoteSize * 0.35, normalizedPage = config.pageName.trim().replace(/^@+/, ""), signatureText = normalizedPage ? `@${normalizedPage.toUpperCase()}` : ""
  ctx.font = getCanvasFont("Cinzel", signatureSize)
  let signatureTracking = signatureSize * 0.085
  if (signatureText && measure.width(signatureText, signatureTracking) > maxWidth) signatureTracking = signatureSize * 0.045
  const signature: TextSection = { font: "Cinzel", size: signatureSize, lineHeight: signatureSize * 1.34, tracking: signatureTracking, lines: signatureText ? wrapText(signatureText, maxWidth, signatureTracking, measure) : [] }
  const quoteGap = quote.lines.length && author.lines.length ? quoteSize * 0.58 : 0, dividerHeight = signature.lines.length ? Math.max(10, quoteSize * 0.28) : 0
  const dividerWidth = signature.lines.length ? Math.min(maxWidth * 0.34, Math.max(maxWidth * 0.3, quoteSize * 3.8)) : 0
  const dividerGap = signature.lines.length && (quote.lines.length || author.lines.length) ? quoteSize * 0.5 : 0, signatureGap = signature.lines.length ? quoteSize * 0.3 : 0
  const blockHeight = quote.lines.length * quote.lineHeight + quoteGap + author.lines.length * author.lineHeight + dividerGap + dividerHeight + signatureGap + signature.lines.length * signature.lineHeight
  let blockTop = (height - blockHeight) / 2
  if (config.position === "top") blockTop = safeY
  if (config.position === "bottom") blockTop = height - safeY - blockHeight
  const blockBottom = blockTop + blockHeight, x = config.alignment === "left" ? safeX : config.alignment === "right" ? width - safeX : width / 2
  const fits = blockTop >= safeY - 0.5 && blockBottom <= height - safeY + 0.5
  let y = blockTop; const quoteY = y; y += quote.lines.length * quote.lineHeight; if (author.lines.length) y += quoteGap; const authorY = y; y += author.lines.length * author.lineHeight
  let divider: DividerLayout | null = null
  if (signature.lines.length) { y += dividerGap; let centerX = x; if (config.alignment === "left") centerX += dividerWidth / 2; if (config.alignment === "right") centerX -= dividerWidth / 2; divider = { width: dividerWidth, height: dividerHeight, diamond: Math.max(6, dividerHeight * 0.5), centerX, y: y + dividerHeight / 2 }; y += dividerHeight + signatureGap }
  const signatureY = y, padding = Math.max(quoteSize * 0.9, height * 0.035), overlayTop = Math.max(0, blockTop - padding), overlayBottom = Math.min(height, blockBottom + padding), bandHeight = Math.max(1, overlayBottom - overlayTop)
  const watermark = getWatermarkRect(width, height, watermarkConfig), unit = Math.min(width, height), inset = unit * 0.052, corner = unit * 0.105, opening = unit * 0.02, pad = unit * 0.018
  const blocked = watermark ? { x: watermark.x - pad, y: watermark.y - pad, width: watermark.width + pad * 2, height: watermark.height + pad * 2 } : null
  const corners: FrameCorner[] = [{ sx: 1, sy: 1, x: inset, y: inset, visible: true }, { sx: -1, sy: 1, x: width - inset, y: inset, visible: true }, { sx: 1, sy: -1, x: inset, y: height - inset, visible: true }, { sx: -1, sy: -1, x: width - inset, y: height - inset, visible: true }]
  for (const item of corners) { const bounds = { x: item.sx > 0 ? item.x : item.x - corner, y: item.sy > 0 ? item.y : item.y - corner, width: corner, height: corner }; item.visible = !blocked || !overlaps(bounds, blocked) }
  return { logicalWidth: width, logicalHeight: height, fits, warning: fits ? null : COMPOSITION_FIT_ERROR, x, alignment: config.alignment, blockTop, blockBottom, quote, author, signature, quoteY, authorY, signatureY, divider, overlay: config.showOverlay && blockHeight > 0 ? { top: overlayTop, bottom: overlayBottom, fade: Math.min(0.28, Math.max(0.08, padding / bandHeight)) } : null, frame: config.showFrame ? { unit, inset, corner, opening, corners } : null, watermark }
}

export function layoutComposition(ctx: CanvasRenderingContext2D, sourceWidth: number, sourceHeight: number, config: TextConfig, watermarkConfig: WatermarkConfig): CompositionLayout {
  const { height } = getLogicalCompositionSize(sourceWidth, sourceHeight)
  let layout = calculateLayout(ctx, height, config, watermarkConfig, 1)
  for (let scale = 0.94; !layout.fits && scale >= 0.56; scale -= 0.06) layout = calculateLayout(ctx, height, config, watermarkConfig, scale)
  return layout
}
function drawTrackedText(ctx: CanvasRenderingContext2D, line: TextLine, x: number, y: number, tracking: number, alignment: CanvasTextAlign) {
  const runs = line.runs ?? []
  let cursor = alignment === "center" ? x - line.width / 2 : alignment === "right" ? x - line.width : x
  ctx.textAlign = "left"
  runs.forEach((run, index) => { ctx.fillText(run.text, cursor, y); cursor += run.advance + (index < runs.length - 1 ? tracking : 0) })
}
function drawLines(ctx: CanvasRenderingContext2D, section: TextSection, x: number, y: number, alignment: CanvasTextAlign) {
  ctx.font = getCanvasFont(section.font, section.size)
  section.lines.forEach((line, index) => { if (section.tracking) drawTrackedText(ctx, line, x, y + index * section.lineHeight, section.tracking, alignment); else { ctx.textAlign = alignment; ctx.fillText(line.text, x, y + index * section.lineHeight) } })
}
function drawFrame(ctx: CanvasRenderingContext2D, layout: CompositionLayout, accent: string) {
  const frame = layout.frame; if (!frame) return
  ctx.save()
  try {
    ctx.strokeStyle = accent; ctx.lineCap = "square"
    for (const c of frame.corners) { if (!c.visible) continue; ctx.globalAlpha = 0.62; ctx.lineWidth = Math.max(1, frame.unit * 0.00135); ctx.beginPath(); ctx.moveTo(c.x + c.sx * frame.corner, c.y); ctx.lineTo(c.x + c.sx * frame.opening, c.y); ctx.lineTo(c.x, c.y + c.sy * frame.opening); ctx.lineTo(c.x, c.y + c.sy * frame.corner); ctx.stroke(); const echoInset = frame.unit * 0.012, echo = frame.corner * 0.48; ctx.globalAlpha = 0.36; ctx.lineWidth = Math.max(0.75, frame.unit * 0.00085); ctx.beginPath(); ctx.moveTo(c.x + c.sx * echo, c.y + c.sy * echoInset); ctx.lineTo(c.x + c.sx * (frame.opening + echoInset), c.y + c.sy * echoInset); ctx.lineTo(c.x + c.sx * echoInset, c.y + c.sy * (frame.opening + echoInset)); ctx.lineTo(c.x + c.sx * echoInset, c.y + c.sy * echo); ctx.stroke() }
  } finally {
    ctx.restore()
  }
}
function drawDivider(ctx: CanvasRenderingContext2D, layout: CompositionLayout, color: string) {
  const d = layout.divider; if (!d) return
  const center = d.centerX, width = d.width, diamond = d.diamond, y = d.y, innerGap = diamond * 1.15, accentY = y + diamond * 0.72, innerArm = width * 0.28
  ctx.save()
  try {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = "square"; ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(1, layout.quote.size * 0.017)
    ctx.beginPath(); ctx.moveTo(center - width / 2, y); ctx.lineTo(center - innerGap, y); ctx.moveTo(center + innerGap, y); ctx.lineTo(center + width / 2, y); ctx.moveTo(center, y - diamond); ctx.lineTo(center + diamond, y); ctx.lineTo(center, y + diamond); ctx.lineTo(center - diamond, y); ctx.closePath(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(center, y - diamond * 0.24); ctx.lineTo(center + diamond * 0.24, y); ctx.lineTo(center, y + diamond * 0.24); ctx.lineTo(center - diamond * 0.24, y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(0.75, layout.quote.size * 0.009)
    ctx.beginPath(); ctx.moveTo(center - innerGap, accentY); ctx.lineTo(center - innerArm, accentY); ctx.moveTo(center + innerGap, accentY); ctx.lineTo(center + innerArm, accentY); ctx.stroke()
  } finally {
    ctx.restore()
  }
}
export function getDestinationMapping(destinationWidth: number, destinationHeight: number, logicalWidth: number, logicalHeight: number): DestinationMapping {
  // Integer export dimensions can differ slightly from the authoritative source
  // aspect ratio. Centered cover fills the canvas uniformly and crops only that
  // rounding remainder, so images, circles, type, and ornaments share one map.
  const scale = Math.max(destinationWidth / logicalWidth, destinationHeight / logicalHeight)
  return { scale, offsetX: (destinationWidth - logicalWidth * scale) / 2, offsetY: (destinationHeight - logicalHeight * scale) / 2 }
}
export function applyDestinationMapping(ctx: CanvasRenderingContext2D, mapping: DestinationMapping): void {
  ctx.translate(mapping.offsetX, mapping.offsetY)
  ctx.scale(mapping.scale, mapping.scale)
}
export function drawBaseImage(ctx: CanvasRenderingContext2D, destinationWidth: number, destinationHeight: number, layout: CompositionLayout, image: CanvasImageSource): void {
  const mapping = getDestinationMapping(destinationWidth, destinationHeight, layout.logicalWidth, layout.logicalHeight)
  ctx.save()
  try {
    ctx.beginPath(); ctx.rect(0, 0, destinationWidth, destinationHeight); ctx.clip()
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
    if (layout.overlay) { const { top, bottom, fade } = layout.overlay, gradient = ctx.createLinearGradient(0, top, 0, bottom), color = `rgba(0, 0, 0, ${config.overlayOpacity})`; gradient.addColorStop(0, "rgba(0, 0, 0, 0)"); gradient.addColorStop(fade, color); gradient.addColorStop(1 - fade, color); gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); ctx.fillStyle = gradient; ctx.fillRect(0, top, layout.logicalWidth, bottom - top) }
    ctx.textBaseline = "top"
    if (layout.quote.lines.length) { ctx.fillStyle = config.color; ctx.shadowColor = "rgba(0, 0, 0, 0.72)"; ctx.shadowBlur = layout.quote.size * 0.1 * mapping.scale; ctx.shadowOffsetY = layout.quote.size * 0.045 * mapping.scale; drawLines(ctx, layout.quote, layout.x, layout.quoteY, layout.alignment) }
    if (layout.author.lines.length) { ctx.fillStyle = config.color; ctx.globalAlpha = 0.9; drawLines(ctx, layout.author, layout.x, layout.authorY, layout.alignment) }
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.globalAlpha = 1; drawDivider(ctx, layout, config.accentColor)
    if (layout.signature.lines.length) { ctx.fillStyle = config.accentColor; ctx.globalAlpha = 0.94; drawLines(ctx, layout.signature, layout.x, layout.signatureY, layout.alignment) }
  } finally {
    ctx.restore()
  }
}
export function drawWatermark(ctx: CanvasRenderingContext2D, destinationWidth: number, destinationHeight: number, layout: CompositionLayout, config: WatermarkConfig): void {
  if (!config.image || !layout.watermark) return
  const rect = layout.watermark, sourceSize = Math.min(config.image.naturalWidth, config.image.naturalHeight)
  const mapping = getDestinationMapping(destinationWidth, destinationHeight, layout.logicalWidth, layout.logicalHeight)
  ctx.save()
  try {
    applyDestinationMapping(ctx, mapping); ctx.globalAlpha = config.opacity; ctx.beginPath(); ctx.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(config.image, (config.image.naturalWidth - sourceSize) / 2, (config.image.naturalHeight - sourceSize) / 2, sourceSize, sourceSize, rect.x, rect.y, rect.width, rect.height)
  } finally {
    ctx.restore()
  }
}
