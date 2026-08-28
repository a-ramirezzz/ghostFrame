import { useState } from "react"

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

function useZoom() {
  const [zoom, setZoom] = useState(1)

  const zoomIn = () => {
    setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))
  }

  const zoomOut = () => {
    setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  return { zoom, zoomIn, zoomOut, resetZoom }
}

export default useZoom
