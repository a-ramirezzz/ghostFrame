import { useEffect, useRef } from "react"
import type { FilterConfig, TextConfig, WatermarkConfig } from "../../types"
import { applyFilter } from "../../utils/filters"
import { renderTextOnCanvas } from "../../utils/renderText"
import { renderWatermarkOnCanvas } from "../../utils/renderWatermark"

interface ImageCanvasProps {
  image: HTMLImageElement | null
  textConfig: TextConfig
  watermarkConfig: WatermarkConfig
  filterConfig: FilterConfig
}

function ImageCanvas({ image, textConfig, watermarkConfig, filterConfig }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  if (!image) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
    />
  )
}

export default ImageCanvas
