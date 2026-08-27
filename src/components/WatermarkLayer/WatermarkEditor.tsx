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
                "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)",
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
            className="cursor-pointer self-start text-xs text-red-400 transition hover:text-red-300"
          >
            Remove
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Opacity</span>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={watermarkConfig.opacity}
              onChange={handleOpacityChange}
              className="w-full accent-blue-500"
            />
            <span className="w-8 text-right text-xs text-gray-300">
              {Math.round(watermarkConfig.opacity * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Size</span>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={watermarkConfig.size}
              onChange={handleSizeChange}
              className="w-full accent-blue-500"
            />
            <span className="w-8 text-right text-xs text-gray-300">
              {watermarkConfig.size}%
            </span>
          </div>

          <div>
            <span className="mb-1 block text-xs text-gray-400">Position</span>
            <div className="grid w-fit grid-cols-3 grid-rows-3 gap-1.5">
              {POSITIONS.map((position) => (
                <button
                  key={position.value}
                  type="button"
                  onClick={() => updateWatermarkConfig({ position: position.value })}
                  style={{ gridArea: position.area }}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition ${
                    watermarkConfig.position === position.value
                      ? "bg-blue-600"
                      : "border border-gray-700 bg-[#1a1a1a]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      watermarkConfig.position === position.value
                        ? "bg-white"
                        : "bg-gray-500"
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
            className="w-full cursor-pointer rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-400"
          >
            Upload Logo (PNG)
          </button>
          <p className="text-xs text-gray-500">
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
