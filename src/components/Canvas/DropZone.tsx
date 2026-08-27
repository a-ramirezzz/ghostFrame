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
      className={`flex aspect-square w-full max-w-[600px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed transition-colors duration-150 ${
        isDragging ? "border-blue-500" : "border-gray-600"
      }`}
    >
      <span className="text-6xl">📷</span>
      <p className="mt-4 text-sm text-gray-400">
        Drop your image here or click to upload
      </p>
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
