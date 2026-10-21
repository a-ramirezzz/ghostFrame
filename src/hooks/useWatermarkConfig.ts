import { useCallback, useEffect, useRef, useState } from "react"
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
  const currentUrlRef = useRef<string | null>(null)
  const pendingUrlRef = useRef<string | null>(null)
  const loadIdRef = useRef(0)

  const revokeUrl = (url: string | null) => {
    if (url) URL.revokeObjectURL(url)
  }

  const loadWatermark = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return
    }

    const loadId = ++loadIdRef.current
    revokeUrl(pendingUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    pendingUrlRef.current = objectUrl
    const img = new Image()

    const fail = () => {
      if (loadId !== loadIdRef.current) return
      pendingUrlRef.current = null
      revokeUrl(objectUrl)
    }

    img.onload = async () => {
      try {
        await img.decode()
      } catch {
        fail()
        return
      }
      if (loadId !== loadIdRef.current || pendingUrlRef.current !== objectUrl) return
      pendingUrlRef.current = null
      revokeUrl(currentUrlRef.current)
      currentUrlRef.current = objectUrl
      setWatermarkConfig((prev) => ({ ...prev, image: img }))
    }
    img.onerror = fail
    img.src = objectUrl
  }, [])

  const removeWatermark = useCallback(() => {
    loadIdRef.current += 1
    revokeUrl(pendingUrlRef.current)
    revokeUrl(currentUrlRef.current)
    pendingUrlRef.current = null
    currentUrlRef.current = null
    setWatermarkConfig((prev) => ({ ...prev, image: null }))
  }, [])

  useEffect(() => () => {
    loadIdRef.current += 1
    revokeUrl(pendingUrlRef.current)
    revokeUrl(currentUrlRef.current)
    pendingUrlRef.current = null
    currentUrlRef.current = null
  }, [])

  const updateWatermarkConfig = useCallback((partial: Partial<WatermarkConfig>) => {
    setWatermarkConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  return { watermarkConfig, loadWatermark, removeWatermark, updateWatermarkConfig }
}

export default useWatermarkConfig
