import { useCallback, useEffect, useRef, useState } from "react"
import type { GhostFrameState } from "../types"
import {
  IMAGE_DECODE_ERROR,
  MAIN_IMAGE_TYPES,
  validateImageDimensions,
  validateImageFile,
} from "../utils/imageLoading"

function stripExtension(name: string) {
  const lastDot = name.lastIndexOf(".")
  return lastDot > 0 ? name.slice(0, lastDot) : name
}

function useImageLoader() {
  const [state, setState] = useState<GhostFrameState>({
    originalImage: null,
    fileName: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const currentUrlRef = useRef<string | null>(null)
  const pendingUrlRef = useRef<string | null>(null)

  const revoke = (url: string | null) => {
    if (url) URL.revokeObjectURL(url)
  }

  const loadImage = useCallback((file: File) => {
    const requestId = ++requestIdRef.current
    revoke(pendingUrlRef.current)
    pendingUrlRef.current = null
    setError(null)
    const validationError = validateImageFile(file, MAIN_IMAGE_TYPES)
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
        revoke(objectUrl)
      }
      settled = true
      if (requestId !== requestIdRef.current) return
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
        if (requestId !== requestIdRef.current || pendingUrlRef.current !== objectUrl) return
        const dimensionError = validateImageDimensions(img)
        if (dimensionError) {
          fail(dimensionError)
          return
        }
        pendingUrlRef.current = null
        settled = true
        revoke(currentUrlRef.current)
        currentUrlRef.current = objectUrl
        setState({
          originalImage: img,
          fileName: stripExtension(file.name),
        })
        setIsLoading(false)
        setError(null)
      }
      img.onerror = () => fail()
      img.src = objectUrl
    } catch {
      fail()
    }
  }, [])

  const clearImage = useCallback(() => {
    requestIdRef.current += 1
    revoke(pendingUrlRef.current)
    revoke(currentUrlRef.current)
    pendingUrlRef.current = null
    currentUrlRef.current = null
    setIsLoading(false)
    setError(null)
    setState({ originalImage: null, fileName: "" })
  }, [])

  useEffect(() => () => {
    requestIdRef.current += 1
    revoke(pendingUrlRef.current)
    revoke(currentUrlRef.current)
  }, [])

  return {
    originalImage: state.originalImage,
    fileName: state.fileName,
    loadImage,
    clearImage,
    isLoading,
    error,
    dismissError: () => setError(null),
  }
}

export default useImageLoader
