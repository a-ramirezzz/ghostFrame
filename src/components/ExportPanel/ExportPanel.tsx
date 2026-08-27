import type { ChangeEvent } from "react"
import type { ExportConfig, ExportResolution } from "../../types"
import { RESOLUTION_PRESETS } from "../../types"

interface ExportPanelProps {
  exportConfig: ExportConfig
  isExporting: boolean
  onUpdateConfig: (partial: Partial<ExportConfig>) => void
  onExport: () => void
  hasImage: boolean
}

const RESOLUTIONS: ExportResolution[] = ["low", "medium", "high"]

function ExportPanel({
  exportConfig,
  isExporting,
  onUpdateConfig,
  onExport,
  hasImage,
}: ExportPanelProps) {
  const handleQualityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateConfig({ quality: Number(event.target.value) })
  }

  const isDisabled = !hasImage || isExporting

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {RESOLUTIONS.map((resolution) => {
          const preset = RESOLUTION_PRESETS[resolution]
          const isSelected = exportConfig.resolution === resolution

          return (
            <div
              key={resolution}
              onClick={() => onUpdateConfig({ resolution })}
              className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 transition ${
                isSelected
                  ? "border-blue-500/50 bg-blue-600/20 text-blue-400"
                  : "border-gray-700 bg-[#1a1a1a] text-gray-300 hover:border-gray-500"
              }`}
            >
              <div>
                <div className="text-sm font-medium">{preset.label}</div>
                <div className="text-xs text-gray-500">{preset.description}</div>
              </div>
              <div className="text-xs text-gray-400">
                {preset.width} × {preset.height}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex overflow-hidden rounded-md">
        <button
          type="button"
          onClick={() => onUpdateConfig({ format: "image/jpeg" })}
          className={`w-1/2 rounded-l-md py-1.5 text-xs transition ${
            exportConfig.format === "image/jpeg"
              ? "bg-blue-600 text-white"
              : "bg-[#1a1a1a] text-gray-400 hover:text-white"
          }`}
        >
          JPG
        </button>
        <button
          type="button"
          onClick={() => onUpdateConfig({ format: "image/png" })}
          className={`w-1/2 rounded-r-md py-1.5 text-xs transition ${
            exportConfig.format === "image/png"
              ? "bg-blue-600 text-white"
              : "bg-[#1a1a1a] text-gray-400 hover:text-white"
          }`}
        >
          PNG
        </button>
      </div>

      {exportConfig.format === "image/jpeg" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Quality</span>
          <input
            type="range"
            min={0.5}
            max={1.0}
            step={0.05}
            value={exportConfig.quality}
            onChange={handleQualityChange}
            className="w-full accent-blue-500"
          />
          <span className="w-8 text-right text-xs text-gray-300">
            {Math.round(exportConfig.quality * 100)}%
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onExport}
        disabled={isDisabled}
        title={!hasImage ? "Upload an image first" : undefined}
        className={`rounded-md py-3 text-sm font-medium text-white transition ${
          isDisabled ? "cursor-not-allowed bg-blue-600 opacity-50" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isExporting ? <span className="animate-pulse">Exporting...</span> : "Export Image ↓"}
      </button>

      <p className="text-xs text-gray-600">Images are exported without metadata</p>
    </div>
  )
}

export default ExportPanel
