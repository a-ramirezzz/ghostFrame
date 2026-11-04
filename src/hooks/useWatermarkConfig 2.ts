import { useCallback, useEffect, useRef, useState } from "react"
import type { WatermarkConfig } from "../types"
import { DEFAULT_WATERMARK_CONFIG } from "../state/editorDefaults"
import { IMAGE_DECODE_ERROR, WATERMARK_TYPES, validateImageDimensions, validateImageFile } from "../utils/imageLoading"

function useWatermarkConfig(initial = DEFAULT_WATERMARK_CONFIG) {
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(
    { ...initial, image: null },
  )
  const currentUrlRef = useRef<string | null>(null)
  const pendingUrlRef = useRef<string | null>(null)
  const loadIdRef = useRef(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revokeUrl = (url: string | null) => {
    if (url) URL.revokeObjectURL(url)
  }

  const loadWatermark = useCallback((file: File) => {
    const loadId = ++loadIdRef.current
    revokeUrl(pendingUrlRef.current)
    pendingUrlRef.current = null
    setError(null)
    const validationError = validateImageFile(file, WATERMARK_TYPES)
    if (validationError) {
      setIsLoading(false)
      setError(validationError)
      return
    }

    setIsLoading(true)
    let objectUrl: string | null = null
    let cleanedUp = false
    let settled = false

    const fail = (message = IMAGE_DECODE_ERROR) => {
      if (settled) return
      if (!cleanedUp) {
        cleanedUp = true
        if (pendingUrlRef.current === objectUrl) pendingUrlRef.current = null
        revokeUrl(objectUrl)
      }
      settled = true
      if (loadId !== loadIdRef.current) return
      setIsLoading(false)
      setError(message)
    }

    try {
      objectUrl = URL.createObjectURL(file)
      pendingUrlRef.current = objectUrl
      const img = new Image()

      img.onload = async () => {
        try {
          await img.decode()
        } catch {
          fail()
          return
        }
        if (loadId !== loadIdRef.current || pendingUrlRef.current !== objectUrl) return
        const dimensionError = validateImageDimensions(img)
        if (dimensionError) {
          fail(dimensionError)
          return
        }
        pendingUrlRef.current = null
        settled = true
        const previousUrl = currentUrlRef.current
        currentUrlRef.current = objectUrl
        setWatermarkConfig((prev) => ({ ...prev, image: img }))
        // Let React replace the thumbnail before releasing the URL it currently displays.
        if (previousUrl) window.setTimeout(() => revokeUrl(previousUrl), 0)
        setIsLoading(false)
        setError(null)
      }
      img.onerror = () => fail()
      img.src = objectUrl
    } catch {
      fail()
    }
  }, [])

  const removeWatermark = useCallback(() => {
    loadIdRef.current += 1
    revokeUrl(pendingUrlRef.current)
    revokeUrl(currentUrlRef.current)
    pendingUrlRef.current = null
    currentUrlRef.current = null
    setWatermarkConfig((prev) => ({ ...prev, image: null }))
    setIsLoading(false)
    setError(null)
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

  const resetWatermarkConfig = useCallback(() => {
    setWatermarkConfig((prev) => ({ ...DEFAULT_WATERMARK_CONFIG, image: prev.image }))
  }, [])

  return { watermarkConfig, loadWatermark, removeWatermark, updateWatermarkConfig, resetWatermarkConfig, isLoading, error, dismissError: () => setError(null) }
}

export default useWatermarkConfig
