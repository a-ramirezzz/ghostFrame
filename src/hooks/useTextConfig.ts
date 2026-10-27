import { useCallback, useState } from "react"
import type { TextConfig } from "../types"
import { DEFAULT_TEXT_CONFIG } from "../state/editorDefaults"

function useTextConfig(initial = DEFAULT_TEXT_CONFIG) {
  const [textConfig, setTextConfig] = useState<TextConfig>(initial)

  const updateTextConfig = useCallback((partial: Partial<TextConfig>) => {
    setTextConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  const resetTextConfig = useCallback(() => setTextConfig({ ...DEFAULT_TEXT_CONFIG }), [])
  const replaceTextConfig = useCallback((value: TextConfig) => setTextConfig({ ...value }), [])
  return { textConfig, updateTextConfig, replaceTextConfig, resetTextConfig }
}

export default useTextConfig
