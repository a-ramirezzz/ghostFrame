import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { ExportConfig } from "../types"
import { CompositionFitError, exportImage, type ExportParams } from "../utils/exportImage"
import { downloadBlob } from "../utils/downloadFile"
import { DEFAULT_EXPORT_CONFIG } from "../state/editorDefaults"

function useExport(isEligible: boolean, initial = DEFAULT_EXPORT_CONFIG) {
  const [exportConfig, setExportConfig] = useState<ExportConfig>(initial)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const exportLockRef = useRef(false)
  const lockOwnerRef = useRef<number | null>(null)
  const operationIdRef = useRef(0)
  const mountedRef = useRef(true)
  const eligibilityRef = useRef(isEligible)

  useLayoutEffect(() => {
    eligibilityRef.current = isEligible
  }, [isEligible])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      operationIdRef.current += 1
      exportLockRef.current = false
      lockOwnerRef.current = null
    }
  }, [])

  const updateExportConfig = useCallback((partial: Partial<ExportConfig>) => {
    setExportConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  const performExport = useCallback(
    async (params: Omit<ExportParams, "resolution" | "format" | "quality">) => {
      if (!mountedRef.current || !eligibilityRef.current || exportLockRef.current) return
      const operationId = ++operationIdRef.current
      exportLockRef.current = true
      lockOwnerRef.current = operationId
      setIsExporting(true)
      setError(null)
      try {
        const { resolution, format, quality } = exportConfig
        const snapshot: ExportParams = {
          originalImage: params.originalImage,
          filterConfig: { ...params.filterConfig },
          textConfig: { ...params.textConfig },
          watermarkConfig: { ...params.watermarkConfig },
          resolution,
          format,
          quality,
        }
        const blob = await exportImage(snapshot)
        if (!mountedRef.current || operationId !== operationIdRef.current) return
        const extension = format === "image/jpeg" ? "jpg" : "png"
        const fileName = `ghostframe_${resolution}_${Date.now()}.${extension}`
        downloadBlob(blob, fileName)
      } catch (caught) {
        if (mountedRef.current && operationId === operationIdRef.current) {
          setError(caught instanceof CompositionFitError
            ? caught.message
            : "The image could not be exported. Try again or choose another format.")
        }
      } finally {
        if (lockOwnerRef.current === operationId) {
          exportLockRef.current = false
          lockOwnerRef.current = null
          if (mountedRef.current && operationId === operationIdRef.current) setIsExporting(false)
        }
      }
    },
    [exportConfig],
  )

  const resetExportConfig = useCallback(() => setExportConfig({ ...DEFAULT_EXPORT_CONFIG }), [])
  const replaceExportConfig = useCallback((value: ExportConfig) => setExportConfig({ ...value }), [])
  return { exportConfig, isExporting, error, dismissError: () => setError(null), updateExportConfig, replaceExportConfig, resetExportConfig, performExport }
}

export default useExport
