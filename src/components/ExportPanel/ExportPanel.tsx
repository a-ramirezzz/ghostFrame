import type { ChangeEvent } from "react"
import type { ExportConfig, ExportResolution } from "../../types"
import { RESOLUTION_PRESETS } from "../../types"
import { getExportSize } from "../../utils/exportSizing"

interface ExportPanelProps {
  exportConfig: ExportConfig
  isExporting: boolean
  onUpdateConfig: (partial: Partial<ExportConfig>) => void
  onExport: () => void
  hasImage: boolean
  isBlocked: boolean
  error: string | null
  onDismissError: () => void
  image: HTMLImageElement | null
}

const RESOLUTIONS: ExportResolution[] = ["low", "medium", "high"]

function ExportPanel({
  exportConfig,
  isExporting,
  onUpdateConfig,
  onExport,
  hasImage,
  isBlocked,
  error,
  onDismissError,
  image,
}: ExportPanelProps) {
  const handleQualityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateConfig({ quality: Number(event.target.value) })
  }

  const isDisabled = !hasImage || isExporting || isBlocked
  let output: ReturnType<typeof getExportSize> | null = null
  let sizingError: string | null = null
  if (image) {
    try {
      output = getExportSize(image.naturalWidth, image.naturalHeight, exportConfig.resolution)
    } catch {
      sizingError = "Choose a valid image and resolution before exporting."
    }
  }
  const exportDisabled = isDisabled || Boolean(sizingError)
  const isUpscaled = Boolean(output && image && (output.width > image.naturalWidth || output.height > image.naturalHeight))

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Export resolution</legend>
        {RESOLUTIONS.map((resolution) => {
          const preset = RESOLUTION_PRESETS[resolution]
          const isSelected = exportConfig.resolution === resolution

          return (
            <label
              key={resolution}
              className={`resolution-card flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 transition-all duration-200 ${
                isSelected
                  ? "border-[rgba(200,164,78,0.3)] bg-[rgba(200,164,78,0.08)]"
                  : "border-[#2a2721] bg-[#1a1814] hover:border-[#3d3830]"
              }`}
            >
              <input type="radio" name="export-resolution" value={resolution} checked={isSelected}
                onChange={() => onUpdateConfig({ resolution })} className="sr-only" />
              <div>
                <div className={`text-sm font-medium ${isSelected ? "text-[#c8a44e]" : "text-[#e8e2d6]"}`}>
                  {preset.label}
                </div>
                <div className="text-xs text-[#9a9484]">{preset.description}</div>
              </div>
              <div className="text-xs text-[#6b6559]">
                Max {preset.width} × {preset.height}
              </div>
            </label>
          )
        })}
      </fieldset>

      <div className="rounded-md border border-[#2a2721] bg-[#15130f] p-3" aria-live="polite">
        {output ? <>
          <p className="font-semibold text-[#e8e2d6]">Output: {output.width} × {output.height} px · {exportConfig.format === "image/png" ? "PNG" : "JPG"}</p>
          <p className="mt-1 text-xs text-[#9a9484]">Preserves your image’s proportions.</p>
          {isUpscaled && <p className="mt-1 text-xs text-[#d4b35c]">This output is larger than the source image. Upscaling does not add detail.</p>}
        </> : <p className="text-xs text-[#9a9484]">Upload an image to see the actual output dimensions.</p>}
        {sizingError && <p role="alert" className="mt-1 text-xs text-[#e3a39a]">{sizingError}</p>}
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
          <label htmlFor="export-quality" className="text-xs text-[#9a9484]">Quality</label>
          <input
            id="export-quality"
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
        disabled={exportDisabled}
        title={!hasImage ? "Upload an image first" : undefined}
        className={`rounded-lg py-3 text-sm font-semibold text-[#0c0b09] transition-all duration-200 ${
          exportDisabled
            ? "cursor-not-allowed bg-[#c8a44e] opacity-40"
            : isExporting
              ? "bg-[#c8a44e] opacity-70"
              : "bg-[#c8a44e] hover:bg-[#d4b35c]"
        }`}
      >
        {isExporting ? <span className="animate-pulse">Exporting...</span> : "Export Image ↓"}
      </button>

      {error && (
        <div role="alert" className="flex items-start gap-2 text-xs text-[#e3a39a]">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} aria-label="Dismiss export error" className="text-[#c8a44e]">×</button>
        </div>
      )}

      <p className="flex items-center gap-1 text-xs text-[#5a5449]">
        <span>🔒</span>
        Images are exported without metadata
      </p>
    </div>
  )
}

export default ExportPanel
