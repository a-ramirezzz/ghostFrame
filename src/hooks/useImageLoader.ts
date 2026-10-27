import { useCallback, useEffect, useRef, useState } from "react"
import type { GhostFrameState } from "../types"
import { MAIN_IMAGE_TYPES } from "../utils/imageLoading"
import { prepareImageAsset, type ImageAssetPreparation, type PreparedImageAsset } from "../utils/imageAsset"

function stripExtension(name: string) { const dot = name.lastIndexOf("."); return dot > 0 ? name.slice(0, dot) : name }

function useImageLoader() {
  const [state, setState] = useState<GhostFrameState>({ originalImage: null, fileName: "" })
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const currentRef = useRef<PreparedImageAsset | null>(null)
  const pendingRef = useRef<ImageAssetPreparation | null>(null)
  const mountedRef = useRef(true)

  const commitPrepared = useCallback((prepared: PreparedImageAsset) => {
    requestIdRef.current += 1
    pendingRef.current?.cancel(); pendingRef.current = null
    const previous = currentRef.current; currentRef.current = prepared
    setState({ originalImage: prepared.image, fileName: stripExtension(prepared.file.name) })
    setSourceFile(prepared.file); setIsLoading(false); setError(null)
    if (previous) window.setTimeout(previous.dispose, 0)
  }, [])

  const loadImage = useCallback((file: File) => {
    pendingRef.current?.cancel(); pendingRef.current = null
    const requestId = ++requestIdRef.current
    setError(null); setIsLoading(true)
    try {
      const pending = prepareImageAsset(file, MAIN_IMAGE_TYPES, (failure) => {
        if (mountedRef.current && requestId === requestIdRef.current) { setIsLoading(false); setError(failure.message) }
      })
      pendingRef.current = pending
      void pending.then((prepared) => {
      if (pendingRef.current === pending) pendingRef.current = null
      if (!mountedRef.current || requestId !== requestIdRef.current) { prepared.dispose(); return }
      commitPrepared(prepared)
      }).catch((caught: unknown) => {
      if (pendingRef.current === pending) pendingRef.current = null
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false); setError(caught instanceof Error ? caught.message : "This image could not be opened.")
      }
      })
    } catch (caught) { setIsLoading(false); setError(caught instanceof Error ? caught.message : "This image could not be opened.") }
  }, [commitPrepared])

  const cancelPending = useCallback(() => { requestIdRef.current += 1; pendingRef.current?.cancel(); pendingRef.current = null; setIsLoading(false) }, [])
  const clearImage = useCallback(() => {
    requestIdRef.current += 1; pendingRef.current?.cancel(); pendingRef.current = null; currentRef.current?.dispose(); currentRef.current = null
    setIsLoading(false); setError(null); setSourceFile(null); setState({ originalImage: null, fileName: "" })
  }, [])
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; requestIdRef.current += 1; pendingRef.current?.cancel(); pendingRef.current = null; currentRef.current?.dispose(); currentRef.current = null } }, [])

  return { originalImage: state.originalImage, fileName: state.fileName, sourceFile, loadImage, clearImage,
    commitPrepared, cancelPending, isLoading, error, dismissError: () => setError(null) }
}

export default useImageLoader
