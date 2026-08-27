import { useRef, type ChangeEvent } from "react"
import type { WatermarkConfig } from "../../types"

interface WatermarkEditorProps {
  watermarkConfig: WatermarkConfig
  loadWatermark: (file: File) => void
  removeWatermark: () => void
  updateWatermarkConfig: (partial: Partial<WatermarkConfig>) => void
}

const POSITIONS: { value: WatermarkConfig["position"]; area: string }[] = [
  { value: "top-left", area: "1 / 1" },
  { value: "top-right", area: "1 / 3" },
  { value: "center", area: "2 / 2" },
  { value: "bottom-left", area: "3 / 1" },
  { value: "bottom-right", area: "3 / 3" },
]

function WatermarkEditor({
  watermarkConfig,
  loadWatermark,
  removeWatermark,
  updateWatermarkConfig,
}: WatermarkEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) loadWatermark(file)
    event.target.value = ""
  }

  const handleOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateWatermarkConfig({ opacity: Number(event.target.value) })
  }

  const handleSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateWatermarkConfig({ size: Number(event.target.value) })
  }

  return (
    <div className="flex flex-col gap-3">
      {watermarkConfig.image ? (
        <>
          <div
            className="mx-auto flex w-full items-center justify-center rounded-md p-3"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#2a2721 0% 25%, #1a1814 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          >
            <img
              src={watermarkConfig.image.src}
              alt="Watermark preview"
              className="mx-auto max-h-12 object-contain"
            />
          </div>

          <button
            type="button"
            onClick={removeWatermark}
            className="cursor-pointer self-start text-xs text-[#c45b4f] transition hover:text-[#d4695d]"
          >
            Remove
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9a9484]">Opacity</span>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={watermarkConfig.opacity}
              onChange={handleOpacityChange}
              className="w-full"
            />
            <span className="w-8 text-right text-xs text-[#e8e2d6]">
              {Math.round(watermarkConfig.opacity * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9a9484]">Size</span>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={watermarkConfig.size}
              onChange={handleSizeChange}
              className="w-full"
            />
            <span className="w-8 text-right text-xs text-[#e8e2d6]">
              {watermarkConfig.size}%
            </span>
          </div>

          <div>
            <span className="mb-1 block text-xs text-[#9a9484]">Position</span>
            <div className="grid w-fit grid-cols-3 grid-rows-3 gap-1.5">
              {POSITIONS.map((position) => (
                <button
                  key={position.value}
                  type="button"
                  onClick={() => updateWatermarkConfig({ position: position.value })}
                  style={{ gridArea: position.area }}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition-all duration-200 ${
                    watermarkConfig.position === position.value
                      ? "border-[rgba(200,164,78,0.35)] bg-[rgba(200,164,78,0.12)]"
                      : "border-[#2a2721] bg-[#1a1814] hover:border-[#3d3830]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      watermarkConfig.position === position.value
                        ? "bg-[#c8a44e]"
                        : "bg-[#6b6559]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#2a2721] bg-[#1a1814] px-4 py-2 text-sm text-[#9a9484] transition-all duration-200 hover:border-[#3d3830] hover:bg-[#221f1a] hover:text-[#e8e2d6]"
          >
            <span className="mr-2">+</span>
            Upload Logo (PNG)
          </button>
          <p className="text-xs text-[#6b6559]">
            Use a PNG with transparent background
          </p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

export default WatermarkEditor
