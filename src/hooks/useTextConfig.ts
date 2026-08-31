import { useCallback, useState } from "react"
import type { TextConfig } from "../types"

const savedPageName = localStorage.getItem('ghostframe_pageName') || ''

const DEFAULT_TEXT_CONFIG: TextConfig = {
  content: "",
  author: "",
  pageName: savedPageName,
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
    if ('pageName' in partial && partial.pageName !== undefined) {
      localStorage.setItem('ghostframe_pageName', partial.pageName)
    }
    setTextConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  return { textConfig, updateTextConfig }
}

export default useTextConfig
