import { AVAILABLE_FONTS, type TextConfig } from "../types"
import type { TextLine } from "./compositionTypes"

const fontWeights = new Map<string, number>(
  AVAILABLE_FONTS.map(({ name, weight }) => [name, weight]),
)

export function getCanvasFont(fontFamily: string, size: number): string {
  return `${fontWeights.get(fontFamily) ?? 400} ${size}px "${fontFamily}"`
}

export async function prepareCompositionFonts(config: TextConfig): Promise<void> {
  const requestedFonts = new Set([
    getCanvasFont(config.fontFamily, config.fontSize),
    getCanvasFont("Cinzel", config.fontSize * 0.48),
    getCanvasFont("Cinzel", config.fontSize * 0.35),
  ])

  await Promise.all(Array.from(requestedFonts, (font) => document.fonts.load(font)))
  await document.fonts.ready
}

export function splitGraphemesFallback(text: string): string[] {
  const result: string[] = []
  const combiningMark = /\p{Mark}/u
  let joinNext = false
  let regionalIndicators = 0

  for (const point of Array.from(text)) {
    const codePoint = point.codePointAt(0) ?? 0
    const variationOrModifier =
      codePoint === 0xfe0e ||
      codePoint === 0xfe0f ||
      (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
    const regionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
    const previousIndex = result.length - 1

    if (
      previousIndex >= 0 &&
      (combiningMark.test(point) ||
        variationOrModifier ||
        joinNext ||
        point === "\u200d" ||
        (regionalIndicator && regionalIndicators % 2 === 1))
    ) {
      result[previousIndex] += point
    } else {
      result.push(point)
    }

    joinNext = point === "\u200d"
    regionalIndicators = regionalIndicator ? regionalIndicators + 1 : 0
  }

  return result
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null

export function splitGraphemes(text: string): string[] {
  return segmenter
    ? Array.from(segmenter.segment(text), ({ segment }) => segment)
    : splitGraphemesFallback(text)
}

export function createTrackedMeasurer(ctx: CanvasRenderingContext2D) {
  const advanceCache = new Map<string, number>()
  const graphemeCache = new Map<string, string[]>()

  const graphemes = (text: string): string[] => {
    const cached = graphemeCache.get(text)
    if (cached) return cached
    const value = splitGraphemes(text)
    graphemeCache.set(text, value)
    return value
  }

  const advance = (value: string): number => {
    const key = `${ctx.font}\u0000${value}`
    const cached = advanceCache.get(key)
    if (cached !== undefined) return cached
    const measured = ctx.measureText(value).width
    advanceCache.set(key, measured)
    return measured
  }

  const line = (text: string, tracking: number): TextLine => {
    if (tracking === 0) return { text, width: advance(text) }
    const runs = graphemes(text).map((part) => ({ text: part, advance: advance(part) }))
    const trackedGaps = Math.max(0, runs.length - 1) * tracking
    return {
      text,
      runs,
      width: runs.reduce((sum, run) => sum + run.advance, 0) + trackedGaps,
    }
  }

  return {
    graphemes,
    line,
    width: (text: string, tracking: number) => line(text, tracking).width,
  }
}

export type TextMeasurer = ReturnType<typeof createTrackedMeasurer>

function splitLongToken(
  token: string,
  maxWidth: number,
  tracking: number,
  measure: TextMeasurer,
): string[] {
  const parts: string[] = []
  let currentPart = ""

  for (const grapheme of measure.graphemes(token)) {
    const candidate = currentPart + grapheme
    if (currentPart && measure.width(candidate, tracking) > maxWidth) {
      parts.push(currentPart)
      currentPart = grapheme
    } else {
      currentPart = candidate
    }
  }

  if (currentPart) parts.push(currentPart)
  return parts
}

export function wrapText(
  text: string,
  maxWidth: number,
  tracking: number,
  measure: TextMeasurer,
): TextLine[] {
  const lines: TextLine[] = []

  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push(measure.line("", tracking))
      continue
    }

    let currentLine = ""
    for (const word of paragraph.split(/\s+/u).filter(Boolean)) {
      const pieces =
        measure.width(word, tracking) > maxWidth
          ? splitLongToken(word, maxWidth, tracking, measure)
          : [word]

      for (const piece of pieces) {
        const candidate = currentLine ? `${currentLine} ${piece}` : piece
        if (currentLine && measure.width(candidate, tracking) > maxWidth) {
          lines.push(measure.line(currentLine, tracking))
          currentLine = piece
        } else {
          currentLine = candidate
        }
      }
    }

    lines.push(measure.line(currentLine, tracking))
  }

  return lines
}
