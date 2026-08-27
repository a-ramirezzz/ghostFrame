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
            <span className="truncate text-sm text-gray-300">{fileName}</span>
            <button
              type="button"
              onClick={handleClick}
              className="shrink-0 cursor-pointer rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-300 transition hover:border-gray-400"
            >
              Change
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {image.naturalWidth} × {image.naturalHeight}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full cursor-pointer rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-400"
        >
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
