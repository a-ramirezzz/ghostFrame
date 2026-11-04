// Stable public facade: consumers do not need to know how measurement, layout,
// and destination drawing are divided internally.
export {
  applyDestinationMapping,
  drawBaseImage,
  drawComposition,
  drawWatermark,
  getDestinationMapping,
} from "./compositionDrawing"
export { getLogicalCompositionSize, layoutComposition } from "./compositionLayout"
export {
  getCanvasFont,
  prepareCompositionFonts,
  splitGraphemes,
  splitGraphemesFallback,
} from "./compositionText"
export { COMPOSITION_FIT_ERROR, LOGICAL_COMPOSITION_WIDTH } from "./compositionTypes"
export type {
  CompositionLayout,
  DestinationMapping,
  Rect,
  TextLine,
  TextRun,
} from "./compositionTypes"
