import { useCallback, useState } from "react"
import type { WatermarkConfig } from "../types"

const ACCEPTED_TYPES = ["image/png", "image/webp"]

const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  image: null,
  opacity: 0.2,
  size: 15,
  position: "bottom-right",
}

function useWatermarkConfig() {
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(
    DEFAULT_WATERMARK_CONFIG,
  )

  const loadWatermark = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      setWatermarkConfig((prev) => ({ ...prev, image: img }))
    }

    img.src = objectUrl
  }, [])

  const removeWatermark = useCallback(() => {
    setWatermarkConfig((prev) => ({ ...prev, image: null }))
  }, [])

  const updateWatermarkConfig = useCallback((partial: Partial<WatermarkConfig>) => {
    setWatermarkConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  return { watermarkConfig, loadWatermark, removeWatermark, updateWatermarkConfig }
}

export default useWatermarkConfig
