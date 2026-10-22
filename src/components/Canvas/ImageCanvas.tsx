import { useEffect, useRef, useState } from "react"
import type { FilterConfig, TextConfig, WatermarkConfig } from "../../types"
import { applyFilter } from "../../utils/filters"
import { getCanvasFont, renderTextOnCanvas } from "../../utils/renderText"
import { renderWatermarkOnCanvas } from "../../utils/renderWatermark"

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

function ImageCanvas({ image, textConfig, watermarkConfig, filterConfig, zoom, onLayoutWarning, onRenderError }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [renderError, setRenderError] = useState<string | null>(null)
  const [isShowingPreviousImage, setIsShowingPreviousImage] = useState(false)
  const [retryId, setRetryId] = useState(0)
  const renderIdRef = useRef(0)
  const lastRenderedImageRef = useRef<HTMLImageElement | null>(null)

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

  useEffect(() => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const loadedImage = image
    const renderId = ++renderIdRef.current
    let cancelled = false

    const renderCanvas = async () => {
      const renderCanvas = document.createElement("canvas")
      renderCanvas.width = loadedImage.naturalWidth
      renderCanvas.height = loadedImage.naturalHeight
      const renderCtx = renderCanvas.getContext("2d")
      if (!renderCtx) throw new Error("Canvas is unavailable")

      const scaledFontSize = (textConfig.fontSize / 600) * renderCanvas.width
      await document.fonts.load(getCanvasFont(textConfig.fontFamily, scaledFontSize))
      await document.fonts.load(getCanvasFont("Cinzel", scaledFontSize * 0.5))
      await document.fonts.ready

      if (cancelled) return

      // Step 1: draw the base image
      renderCtx.drawImage(loadedImage, 0, 0, renderCanvas.width, renderCanvas.height)

      // Step 2: apply the selected filter to the drawn pixels.
      // applyFilter walks every pixel, so this can get slow on very large
      // images. If this becomes a bottleneck, consider moving the pixel
      // work to an OffscreenCanvas inside a Web Worker.
      if (filterConfig.active !== "none") {
        if (cancelled) return
        const imageData = renderCtx.getImageData(0, 0, renderCanvas.width, renderCanvas.height)
        const filteredData = applyFilter(imageData, filterConfig.active, filterConfig.intensity)
        renderCtx.putImageData(filteredData, 0, 0)
      }

      if (cancelled) return

      // Steps 3 & 4: overlay + text (renderTextOnCanvas draws the overlay
      // first, then the text, on top of the filtered image)
      const result = renderTextOnCanvas(renderCtx, renderCanvas.width, renderCanvas.height, textConfig, watermarkConfig)

      // Step 5: watermark
      renderWatermarkOnCanvas(renderCtx, renderCanvas.width, renderCanvas.height, watermarkConfig)

      if (cancelled) return
      canvas.width = renderCanvas.width
      canvas.height = renderCanvas.height
      const visibleCtx = canvas.getContext("2d")
      if (!visibleCtx) throw new Error("Canvas is unavailable")
      visibleCtx.drawImage(renderCanvas, 0, 0)
      if (cancelled || renderId !== renderIdRef.current) return
      lastRenderedImageRef.current = loadedImage
      setRenderError(null)
      setIsShowingPreviousImage(false)
      onRenderError?.(null)
      onLayoutWarning?.(result.warning)
    }

    void renderCanvas().catch(() => {
      if (cancelled || renderId !== renderIdRef.current) return
      setRenderError("The preview could not be updated. Try again.")
      setIsShowingPreviousImage(Boolean(lastRenderedImageRef.current && lastRenderedImageRef.current !== loadedImage))
      onRenderError?.("The preview could not be updated. Try again.")
    })

    return () => {
      cancelled = true
    }
  }, [image, textConfig, watermarkConfig, filterConfig, onLayoutWarning, onRenderError, retryId])

  if (!image) {
    return <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-auto" />
  }

  const availableWidth = containerSize.width - CONTAINER_PADDING
  const availableHeight = containerSize.height - CONTAINER_PADDING
  const scaleX = availableWidth / image.naturalWidth
  const scaleY = availableHeight / image.naturalHeight
  const fitScale = Math.min(scaleX, scaleY, 1)
  const displayWidth = image.naturalWidth * fitScale * zoom
  const displayHeight = image.naturalHeight * fitScale * zoom

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-auto">
      <canvas
        ref={canvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          borderRadius: "6px",
        }}
      />
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
