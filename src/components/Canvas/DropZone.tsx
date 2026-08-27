import { useRef, useState, type ChangeEvent, type DragEvent } from "react"

interface DropZoneProps {
  onImageLoad: (file: File) => void
}

function DropZone({ onImageLoad }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onImageLoad(file)
    event.target.value = ""
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onImageLoad(file)
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group flex aspect-square w-full max-w-[600px] cursor-pointer flex-col items-center justify-center rounded-xl border transition-all duration-300 ${
        isDragging
          ? "border-[#c8a44e] bg-[rgba(200,164,78,0.04)]"
          : "border-[#2a2721] bg-transparent hover:border-[#3d3830] hover:bg-[#1a181408]"
      }`}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isDragging ? "#c8a44e" : "#6b6559"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-300"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p
        className={`mt-4 text-sm transition-colors duration-300 ${
          isDragging ? "text-[#c8a44e]" : "text-[#6b6559]"
        }`}
      >
        Drop image or click to browse
      </p>
      <p className="mt-1 text-xs text-[#5a5449]">JPG, PNG, WebP</p>
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

export default DropZone
