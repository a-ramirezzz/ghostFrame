import { useCallback, useState } from "react"
import type { FilterConfig, FilterName } from "../types"
import { DEFAULT_FILTER_CONFIG } from "../state/editorDefaults"

function useFilterConfig(initial = DEFAULT_FILTER_CONFIG) {
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(initial)

  const setFilter = useCallback((name: FilterName) => {
    setFilterConfig((prev) => ({ ...prev, active: name }))
  }, [])

  const setIntensity = useCallback((value: number) => {
    setFilterConfig((prev) => ({ ...prev, intensity: value }))
  }, [])

  const resetFilterConfig = useCallback(() => setFilterConfig({ ...DEFAULT_FILTER_CONFIG }), [])
  return { filterConfig, setFilter, setIntensity, resetFilterConfig }
}

export default useFilterConfig
