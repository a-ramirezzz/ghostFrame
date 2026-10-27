import { useCallback, useEffect, useRef, useState } from "react"
import type { WatermarkConfig } from "../types"
import { DEFAULT_WATERMARK_CONFIG } from "../state/editorDefaults"
import { WATERMARK_TYPES } from "../utils/imageLoading"
import { prepareImageAsset, type ImageAssetPreparation, type PreparedImageAsset } from "../utils/imageAsset"

function useWatermarkConfig(initial = DEFAULT_WATERMARK_CONFIG) {
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>({ ...initial, image: null })
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const currentRef = useRef<PreparedImageAsset | null>(null)
  const pendingRef = useRef<ImageAssetPreparation | null>(null)
  const loadIdRef = useRef(0)
  const mountedRef = useRef(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const commitPrepared = useCallback((prepared: PreparedImageAsset | null) => {
    loadIdRef.current += 1
    pendingRef.current?.cancel(); pendingRef.current = null
    const previous = currentRef.current; currentRef.current = prepared
    setWatermarkConfig((prev) => ({ ...prev, image: prepared?.image ?? null }))
    setSourceFile(prepared?.file ?? null); setIsLoading(false); setError(null)
    if (previous) {
      if (prepared) window.setTimeout(previous.dispose, 0)
      else previous.dispose()
    }
  }, [])
  const loadWatermark = useCallback((file: File) => {
    pendingRef.current?.cancel(); pendingRef.current = null
    const loadId = ++loadIdRef.current
    setError(null); setIsLoading(true)
    try {
      const pending = prepareImageAsset(file, WATERMARK_TYPES, (failure) => {
        if (mountedRef.current && loadId === loadIdRef.current) { setIsLoading(false); setError(failure.message) }
      })
      pendingRef.current = pending
      void pending.then((prepared) => {
      if (pendingRef.current === pending) pendingRef.current = null
      if (!mountedRef.current || loadId !== loadIdRef.current) { prepared.dispose(); return }
      commitPrepared(prepared)
      }).catch((caught: unknown) => {
      if (pendingRef.current === pending) pendingRef.current = null
      if (mountedRef.current && loadId === loadIdRef.current) {
        setIsLoading(false); setError(caught instanceof Error ? caught.message : "This logo could not be opened.")
      }
      })
    } catch (caught) { setIsLoading(false); setError(caught instanceof Error ? caught.message : "This logo could not be opened.") }
  }, [commitPrepared])
  const cancelPending = useCallback(() => { loadIdRef.current += 1; pendingRef.current?.cancel(); pendingRef.current = null; setIsLoading(false) }, [])
  const removeWatermark = useCallback(() => commitPrepared(null), [commitPrepared])
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; loadIdRef.current += 1; pendingRef.current?.cancel(); pendingRef.current = null; currentRef.current?.dispose(); currentRef.current = null } }, [])
  const updateWatermarkConfig = useCallback((partial: Partial<WatermarkConfig>) => setWatermarkConfig((prev) => ({ ...prev, ...partial })), [])
  const replaceWatermarkConfig = useCallback((value: Omit<WatermarkConfig, "image">) => setWatermarkConfig((prev) => ({ ...value, image: prev.image })), [])
  const resetWatermarkConfig = useCallback(() => setWatermarkConfig((prev) => ({ ...DEFAULT_WATERMARK_CONFIG, image: prev.image })), [])

  return { watermarkConfig, sourceFile, loadWatermark, removeWatermark, commitPrepared, cancelPending,
    updateWatermarkConfig, replaceWatermarkConfig, resetWatermarkConfig, isLoading, error, dismissError: () => setError(null) }
}

export default useWatermarkConfig
