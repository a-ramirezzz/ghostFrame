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
              className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 transition-all duration-200 ${
                isSelected
                  ? "border-[rgba(200,164,78,0.3)] bg-[rgba(200,164,78,0.08)]"
                  : "border-[#2a2721] bg-[#1a1814] hover:border-[#3d3830]"
              }`}
            >
              <div>
                <div className={`text-sm font-medium ${isSelected ? "text-[#c8a44e]" : "text-[#e8e2d6]"}`}>
                  {preset.label}
                </div>
                <div className="text-xs text-[#9a9484]">{preset.description}</div>
              </div>
              <div className="text-xs text-[#6b6559]">
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
          className={`w-1/2 rounded-l-md border py-1.5 text-xs transition-all duration-200 ${
            exportConfig.format === "image/jpeg"
              ? "border-[rgba(200,164,78,0.35)] bg-[rgba(200,164,78,0.12)] text-[#c8a44e]"
              : "border-[#2a2721] bg-[#1a1814] text-[#9a9484] hover:border-[#3d3830] hover:bg-[#221f1a] hover:text-[#e8e2d6]"
          }`}
        >
          JPG
        </button>
        <button
          type="button"
          onClick={() => onUpdateConfig({ format: "image/png" })}
          className={`w-1/2 rounded-r-md border py-1.5 text-xs transition-all duration-200 ${
            exportConfig.format === "image/png"
              ? "border-[rgba(200,164,78,0.35)] bg-[rgba(200,164,78,0.12)] text-[#c8a44e]"
              : "border-[#2a2721] bg-[#1a1814] text-[#9a9484] hover:border-[#3d3830] hover:bg-[#221f1a] hover:text-[#e8e2d6]"
          }`}
        >
          PNG
        </button>
      </div>

      {exportConfig.format === "image/jpeg" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9a9484]">Quality</span>
          <input
            type="range"
            min={0.5}
            max={1.0}
            step={0.05}
            value={exportConfig.quality}
            onChange={handleQualityChange}
            className="w-full"
          />
          <span className="w-8 text-right text-xs text-[#e8e2d6]">
            {Math.round(exportConfig.quality * 100)}%
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onExport}
        disabled={isDisabled}
        title={!hasImage ? "Upload an image first" : undefined}
        className={`rounded-lg py-3 text-sm font-semibold text-[#0c0b09] transition-all duration-200 ${
          isDisabled
            ? "cursor-not-allowed bg-[#c8a44e] opacity-40"
            : isExporting
              ? "bg-[#c8a44e] opacity-70"
              : "bg-[#c8a44e] hover:bg-[#d4b35c]"
        }`}
      >
        {isExporting ? <span className="animate-pulse">Exporting...</span> : "Export Image ↓"}
      </button>

      <p className="flex items-center gap-1 text-xs text-[#5a5449]">
        <span>🔒</span>
        Images are exported without metadata
      </p>
    </div>
  )
}

export default ExportPanel
