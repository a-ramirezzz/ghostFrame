import { useEffect, useRef } from "react"

interface ImageCanvasProps {
  image: HTMLImageElement | null
}

function ImageCanvas({ image }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    ctx.drawImage(image, 0, 0)
  }, [image])

  if (!image) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
    />
  )
}

export default ImageCanvas
