import { useCallback, useState } from "react"
import type { ExportConfig } from "../types"
import { exportImage, type ExportParams } from "../utils/exportImage"
import { downloadBlob } from "../utils/downloadFile"

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  resolution: "low",
  format: "image/jpeg",
  quality: 0.92,
}

function useExport() {
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG)
  const [isExporting, setIsExporting] = useState(false)

  const updateExportConfig = useCallback((partial: Partial<ExportConfig>) => {
    setExportConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  const performExport = useCallback(
    async (params: Omit<ExportParams, "resolution" | "format" | "quality">) => {
      setIsExporting(true)
      try {
        const { resolution, format, quality } = exportConfig
        const blob = await exportImage({ ...params, resolution, format, quality })
        const extension = format === "image/jpeg" ? "jpg" : "png"
        const fileName = `ghostframe_${resolution}_${Date.now()}.${extension}`
        downloadBlob(blob, fileName)
      } catch (error) {
        console.error(error)
      } finally {
        setIsExporting(false)
      }
    },
    [exportConfig],
  )

  return { exportConfig, isExporting, updateExportConfig, performExport }
}

export default useExport
