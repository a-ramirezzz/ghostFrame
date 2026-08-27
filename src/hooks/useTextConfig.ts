import { useCallback, useState } from "react"
import type { TextConfig } from "../types"

const DEFAULT_TEXT_CONFIG: TextConfig = {
  content: "",
  author: "",
  fontFamily: "Cinzel",
  fontSize: 32,
  color: "#ffffff",
  position: "center",
  alignment: "center",
  showOverlay: true,
  overlayOpacity: 0.5,
}

function useTextConfig() {
  const [textConfig, setTextConfig] = useState<TextConfig>(DEFAULT_TEXT_CONFIG)

  const updateTextConfig = useCallback((partial: Partial<TextConfig>) => {
    setTextConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  return { textConfig, updateTextConfig }
}

export default useTextConfig
