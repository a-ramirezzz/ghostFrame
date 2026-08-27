import { useEffect, useState, type ChangeEvent } from "react"
import { AVAILABLE_FILTERS } from "../../types"
import type { FilterConfig, FilterName } from "../../types"
import { applyFilter } from "../../utils/filters"

interface FilterPanelProps {
  filterConfig: FilterConfig
  onSelectFilter: (name: FilterName) => void
  onIntensityChange: (value: number) => void
  previewImage: HTMLImageElement | null
}

const THUMB_SIZE = 80

function generateThumbnail(image: HTMLImageElement, filterName: FilterName): string {
  const canvas = document.createElement("canvas")
  canvas.width = THUMB_SIZE
  canvas.height = THUMB_SIZE

  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  ctx.drawImage(image, 0, 0, THUMB_SIZE, THUMB_SIZE)

  if (filterName !== "none") {
    const imageData = ctx.getImageData(0, 0, THUMB_SIZE, THUMB_SIZE)
    const filtered = applyFilter(imageData, filterName, 1.0)
    ctx.putImageData(filtered, 0, 0)
  }

  return canvas.toDataURL()
}

function FilterPanel({
  filterConfig,
  onSelectFilter,
  onIntensityChange,
  previewImage,
}: FilterPanelProps) {
  const [thumbnails, setThumbnails] = useState<Record<FilterName, string>>(
    {} as Record<FilterName, string>,
  )

  useEffect(() => {
    if (!previewImage) {
      setThumbnails({} as Record<FilterName, string>)
      return
    }

    const next = {} as Record<FilterName, string>
    for (const filter of AVAILABLE_FILTERS) {
      next[filter.name] = generateThumbnail(previewImage, filter.name)
    }
    setThumbnails(next)
  }, [previewImage])

  const handleIntensityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onIntensityChange(Number(event.target.value))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_FILTERS.map((filter) => {
          const isSelected = filterConfig.active === filter.name
          const thumbnail = thumbnails[filter.name]

          return (
            <button
              key={filter.name}
              type="button"
              onClick={() => onSelectFilter(filter.name)}
              className="flex cursor-pointer flex-col gap-1"
            >
              <div
                className={`aspect-square overflow-hidden rounded-md transition ${
                  isSelected
                    ? "ring-2 ring-blue-500"
                    : "ring-1 ring-gray-700 hover:ring-gray-500"
                }`}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={filter.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[#1a1a1a]" />
                )}
              </div>
              <span className="text-center text-xs text-gray-300">{filter.label}</span>
            </button>
          )
        })}
      </div>

      {filterConfig.active !== "none" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Intensity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={filterConfig.intensity}
            onChange={handleIntensityChange}
            className="w-full accent-blue-500"
          />
          <span className="w-8 text-right text-xs text-gray-300">
            {Math.round(filterConfig.intensity * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default FilterPanel
