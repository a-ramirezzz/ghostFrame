import { useEffect, useRef, useState } from "react"
import type { FilterConfig, TextConfig, WatermarkConfig } from "../../types"
import { applyFilter } from "../../utils/filters"
import { drawBaseImage, drawComposition, drawWatermark, layoutComposition, prepareCompositionFonts } from "../../utils/composition"
import type { CompositionLayout } from "../../utils/composition"
import { getPreviewSize } from "../../utils/previewSizing"

interface ImageCanvasProps {
  image: HTMLImageElement | null
  textConfig: TextConfig
  watermarkConfig: WatermarkConfig
  filterConfig: FilterConfig
  zoom: number
  onLayoutWarning?: (warning: string | null) => void
  onRenderError?: (error: string | null) => void
}

const CONTAINER_PADDING = 40

interface BackgroundCache {
  image: HTMLImageElement
  width: number
  height: number
  filter: FilterConfig["active"]
  intensity: number
  canvas: HTMLCanvasElement
}

interface LayoutKey {
  aspectRatio: number
  content: string
  author: string
  pageName: string
  fontFamily: string
  fontSize: number
  alignment: TextConfig["alignment"]
  position: TextConfig["position"]
  showOverlay: boolean
  showFrame: boolean
  hasWatermark: boolean
  watermarkWidth: number
  watermarkHeight: number
  watermarkSize: number
  watermarkPosition: WatermarkConfig["position"]
}

interface LayoutCache { key: LayoutKey; layout: CompositionLayout }

function effectiveFilter(config: FilterConfig): Pick<BackgroundCache, "filter" | "intensity"> {
  return config.active === "none" || config.intensity <= 0
    ? { filter: "none", intensity: 0 }
    : { filter: config.active, intensity: config.intensity }
}

function createLayoutKey(image: HTMLImageElement, text: TextConfig, watermark: WatermarkConfig): LayoutKey {
  return {
    aspectRatio: image.naturalWidth / image.naturalHeight,
    content: text.content,
    author: text.author,
    pageName: text.pageName,
    fontFamily: text.fontFamily,
    fontSize: text.fontSize,
    alignment: text.alignment,
    position: text.position,
    showOverlay: text.showOverlay,
    showFrame: text.showFrame,
    hasWatermark: watermark.image !== null,
    watermarkWidth: watermark.image?.naturalWidth ?? 0,
    watermarkHeight: watermark.image?.naturalHeight ?? 0,
    watermarkSize: watermark.size,
    watermarkPosition: watermark.position,
  }
}

function keysMatch(left: LayoutKey, right: LayoutKey): boolean {
  return (Object.keys(left) as Array<keyof LayoutKey>).every((key) => left[key] === right[key])
}

function ImageCanvas({ image, textConfig, watermarkConfig, filterConfig, zoom, onLayoutWarning, onRenderError }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [renderError, setRenderError] = useState<string | null>(null)
  const [isShowingPreviousImage, setIsShowingPreviousImage] = useState(false)
  const [retryId, setRetryId] = useState(0)
  const renderIdRef = useRef(0)
  const lastRenderedImageRef = useRef<HTMLImageElement | null>(null)
  const backgroundCacheRef = useRef<BackgroundCache | null>(null)
  const layoutCacheRef = useRef<LayoutCache | null>(null)
  const scheduledFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    renderIdRef.current += 1
    if (scheduledFrameRef.current !== null) cancelAnimationFrame(scheduledFrameRef.current)
    scheduledFrameRef.current = null
    backgroundCacheRef.current = null
    layoutCacheRef.current = null
    lastRenderedImageRef.current = null
  }, [])

  useEffect(() => {
    if (!image) return

    const loadedImage = image
    const renderId = ++renderIdRef.current
    let cancelled = false

    const renderCanvas = async () => {
      const ownsRequest = () => !cancelled && renderId === renderIdRef.current
      const previewSize = getPreviewSize(loadedImage.naturalWidth, loadedImage.naturalHeight)
      const layoutKey = createLayoutKey(loadedImage, textConfig, watermarkConfig)
      let layout = layoutCacheRef.current?.key && keysMatch(layoutCacheRef.current.key, layoutKey)
        ? layoutCacheRef.current.layout
        : null

      if (!layout) {
        await prepareCompositionFonts(textConfig)
        if (!ownsRequest()) return
        const measureCanvas = document.createElement("canvas")
        const measureCtx = measureCanvas.getContext("2d")
        if (!measureCtx) throw new Error("Canvas is unavailable")
        layout = layoutComposition(measureCtx, loadedImage.naturalWidth, loadedImage.naturalHeight, textConfig, watermarkConfig)
        if (!ownsRequest()) return
        layoutCacheRef.current = { key: layoutKey, layout }
      }

      const filter = effectiveFilter(filterConfig)
      let background = backgroundCacheRef.current
      const backgroundMatches = background
        && background.image === loadedImage
        && background.width === previewSize.width
        && background.height === previewSize.height
        && background.filter === filter.filter
        && background.intensity === filter.intensity

      if (!backgroundMatches) {
        const backgroundCanvas = document.createElement("canvas")
        backgroundCanvas.width = previewSize.width
        backgroundCanvas.height = previewSize.height
        const backgroundCtx = backgroundCanvas.getContext("2d")
        if (!backgroundCtx) throw new Error("Canvas is unavailable")
        drawBaseImage(backgroundCtx, previewSize.width, previewSize.height, layout, loadedImage)
        if (filter.filter !== "none") {
          const imageData = backgroundCtx.getImageData(0, 0, previewSize.width, previewSize.height)
          const filteredData = applyFilter(imageData, filter.filter, filter.intensity)
          backgroundCtx.putImageData(filteredData, 0, 0)
        }
        if (!ownsRequest()) return
        background = { image: loadedImage, ...previewSize, ...filter, canvas: backgroundCanvas }
        backgroundCacheRef.current = background
      }

      if (!ownsRequest()) return
      if (!background) throw new Error("Preview background is unavailable")
      const compositionCanvas = document.createElement("canvas")
      compositionCanvas.width = previewSize.width
      compositionCanvas.height = previewSize.height
      const compositionCtx = compositionCanvas.getContext("2d")
      if (!compositionCtx) throw new Error("Canvas is unavailable")
      compositionCtx.drawImage(background.canvas, 0, 0)
      drawComposition(compositionCtx, previewSize.width, previewSize.height, layout, textConfig)
      drawWatermark(compositionCtx, previewSize.width, previewSize.height, layout, watermarkConfig)

      if (!ownsRequest()) return
      const canvas = canvasRef.current
      if (!canvas) return
      const visibleCtx = canvas.getContext("2d")
      if (!visibleCtx) throw new Error("Canvas is unavailable")
      canvas.width = previewSize.width
      canvas.height = previewSize.height
      visibleCtx.drawImage(compositionCanvas, 0, 0)
      lastRenderedImageRef.current = loadedImage
      setRenderError(null)
      setIsShowingPreviousImage(false)
      onRenderError?.(null)
      onLayoutWarning?.(layout.warning)
    }

    scheduledFrameRef.current = requestAnimationFrame(() => {
      scheduledFrameRef.current = null
      void renderCanvas().catch(() => {
        if (cancelled || renderId !== renderIdRef.current) return
        setRenderError("The preview could not be updated. Try again.")
        setIsShowingPreviousImage(Boolean(lastRenderedImageRef.current && lastRenderedImageRef.current !== loadedImage))
        onRenderError?.("The preview could not be updated. Try again.")
      })
    })

    return () => {
      cancelled = true
      if (scheduledFrameRef.current !== null) {
        cancelAnimationFrame(scheduledFrameRef.current)
        scheduledFrameRef.current = null
      }
    }
  }, [image, textConfig, watermarkConfig, filterConfig, onLayoutWarning, onRenderError, retryId])

  if (!image) {
    return <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-auto" />
  }

  const availableWidth = Math.max(0, containerSize.width - CONTAINER_PADDING)
  const availableHeight = Math.max(0, containerSize.height - CONTAINER_PADDING)
  const scaleX = availableWidth / image.naturalWidth
  const scaleY = availableHeight / image.naturalHeight
  const fitScale = Math.min(scaleX, scaleY, 1)
  const displayWidth = image.naturalWidth * fitScale * zoom
  const displayHeight = image.naturalHeight * fitScale * zoom

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-auto">
      <div className="flex items-center justify-center" style={{ minWidth: "100%", minHeight: "100%", width: displayWidth + CONTAINER_PADDING, height: displayHeight + CONTAINER_PADDING }}>
        <canvas
          ref={canvasRef}
          style={{
            width: displayWidth,
            height: displayHeight,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            borderRadius: "6px",
            flex: "none",
          }}
        />
      </div>
      {renderError && (
        <div
          role="alert"
          className="absolute top-4 left-1/2 max-w-md -translate-x-1/2 rounded-md border border-[#6f3932] bg-[#1a1814] px-3 py-2 text-xs text-[#e3a39a] shadow-lg"
        >
          <span>{renderError}</span>
          {isShowingPreviousImage && (
            <span className="ml-1 text-[#9a9484]">The displayed preview is from the previous image.</span>
          )}
          <button
            type="button"
            onClick={() => setRetryId((value) => value + 1)}
            className="ml-2 text-[#c8a44e] transition hover:text-[#d4b35c]"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageCanvas
