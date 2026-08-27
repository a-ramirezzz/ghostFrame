import { useRef, type ChangeEvent } from "react"

interface ImageControlsProps {
  image: HTMLImageElement | null
  fileName: string
  onImageLoad: (file: File) => void
}

function ImageControls({ image, fileName, onImageLoad }: ImageControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onImageLoad(file)
    event.target.value = ""
  }

  return (
    <div>
      {image ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-[#e8e2d6]">{fileName}</span>
            <button
              type="button"
              onClick={handleClick}
              className="shrink-0 cursor-pointer text-xs text-[#c8a44e] transition hover:text-[#d4b35c]"
            >
              Change
            </button>
          </div>
          <p className="mt-1 text-xs text-[#6b6559]">
            {image.naturalWidth} × {image.naturalHeight}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#2a2721] bg-[#1a1814] px-4 py-2 text-sm text-[#9a9484] transition-all duration-200 hover:border-[#3d3830] hover:bg-[#221f1a] hover:text-[#e8e2d6]"
        >
          <span className="mr-2">+</span>
          Select Image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

export default ImageControls
