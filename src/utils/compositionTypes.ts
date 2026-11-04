export const LOGICAL_COMPOSITION_WIDTH = 600
export const COMPOSITION_FIT_ERROR =
  "This composition does not fit within the image. Shorten the text or reduce its size."

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TextRun {
  text: string
  advance: number
}

export interface TextLine {
  text: string
  width: number
  runs?: TextRun[]
}

export interface TextSection {
  font: string
  size: number
  lineHeight: number
  tracking: number
  lines: TextLine[]
}

export interface DestinationMapping {
  scale: number
  offsetX: number
  offsetY: number
}

export interface DividerLayout {
  width: number
  height: number
  diamond: number
  centerX: number
  y: number
}

export interface FrameCorner {
  x: number
  y: number
  sx: 1 | -1
  sy: 1 | -1
  visible: boolean
}

export interface CompositionLayout {
  logicalWidth: number
  logicalHeight: number
  fits: boolean
  warning: string | null
  x: number
  alignment: CanvasTextAlign
  blockTop: number
  blockBottom: number
  quote: TextSection
  author: TextSection
  signature: TextSection
  quoteY: number
  authorY: number
  signatureY: number
  divider: DividerLayout | null
  overlay: { top: number; bottom: number; fade: number } | null
  frame: {
    unit: number
    inset: number
    corner: number
    opening: number
    corners: FrameCorner[]
  } | null
  watermark: Rect | null
}
