import { useEffect, useRef, useState } from "react"
import type { FilterConfig, TextConfig, WatermarkConfig } from "../../types"
import { applyFilter } from "../../utils/filters"
import { renderTextOnCanvas } from "../../utils/renderText"
import { renderWatermarkOnCanvas } from "../../utils/renderWatermark"

interface ImageCanvasProps {
  image: HTMLImageElement | null
  textConfig: TextConfig
  watermarkConfig: WatermarkConfig
  filterConfig: FilterConfig
  zoom: number
}

const CONTAINER_PADDING = 40

function ImageCanvas({ image, textConfig, watermarkConfig, filterConfig, zoom }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

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

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const loadedImage = image
    let cancelled = false

    const renderCanvas = async () => {
      canvas.width = loadedImage.naturalWidth
      canvas.height = loadedImage.naturalHeight

      const scaledFontSize = (textConfig.fontSize / 600) * canvas.width
      await document.fonts.load(`${scaledFontSize}px "${textConfig.fontFamily}"`)
      await document.fonts.ready

      if (cancelled) return

      // Step 1: draw the base image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height)

      // Step 2: apply the selected filter to the drawn pixels.
      // applyFilter walks every pixel, so this can get slow on very large
      // images. If this becomes a bottleneck, consider moving the pixel
      // work to an OffscreenCanvas inside a Web Worker.
      if (filterConfig.active !== "none") {
        if (cancelled) return
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const filteredData = applyFilter(imageData, filterConfig.active, filterConfig.intensity)
        ctx.putImageData(filteredData, 0, 0)
      }

      if (cancelled) return

      // Steps 3 & 4: overlay + text (renderTextOnCanvas draws the overlay
      // first, then the text, on top of the filtered image)
      renderTextOnCanvas(ctx, canvas.width, canvas.height, textConfig)

      // Step 5: watermark
      renderWatermarkOnCanvas(ctx, canvas.width, canvas.height, watermarkConfig)
    }

    renderCanvas()

    return () => {
      cancelled = true
    }
  }, [image, textConfig, watermarkConfig, filterConfig])

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
    <div ref={containerRef} className="flex h-full w-full items-center justify-center overflow-auto">
      <canvas
        ref={canvasRef}
        style={{
          width: displayWidth,
          height: displayHeight,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          borderRadius: "6px",
        }}
      />
    </div>
  )
}

export default ImageCanvas
