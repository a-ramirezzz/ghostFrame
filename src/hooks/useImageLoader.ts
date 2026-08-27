import { useCallback, useState } from "react"
import type { GhostFrameState } from "../types"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function stripExtension(name: string) {
  const lastDot = name.lastIndexOf(".")
  return lastDot > 0 ? name.slice(0, lastDot) : name
}

function useImageLoader() {
  const [state, setState] = useState<GhostFrameState>({
    originalImage: null,
    fileName: "",
  })

  const loadImage = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      setState({
        originalImage: img,
        fileName: stripExtension(file.name),
      })
    }

    img.src = objectUrl
  }, [])

  const clearImage = useCallback(() => {
    setState({ originalImage: null, fileName: "" })
  }, [])

  return {
    originalImage: state.originalImage,
    fileName: state.fileName,
    loadImage,
    clearImage,
  }
}

export default useImageLoader
