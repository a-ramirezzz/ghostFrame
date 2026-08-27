import { useEffect, useRef } from "react"
import type { TextConfig } from "../../types"
import { renderTextOnCanvas } from "../../utils/renderText"

interface ImageCanvasProps {
  image: HTMLImageElement | null
  textConfig: TextConfig
}

function ImageCanvas({ image, textConfig }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let cancelled = false

    ;(async () => {
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight

      const scaledFontSize = (textConfig.fontSize / 600) * canvas.width
      await document.fonts.load(`${scaledFontSize}px "${textConfig.fontFamily}"`)
      await document.fonts.ready

      if (cancelled) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      renderTextOnCanvas(ctx, canvas.width, canvas.height, textConfig)
    })()

    return () => {
      cancelled = true
    }
  }, [image, textConfig])

  if (!image) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
    />
  )
}

export default ImageCanvas
