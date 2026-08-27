import { useCallback, useState } from "react"
import type { FilterConfig, FilterName } from "../types"

const DEFAULT_FILTER_CONFIG: FilterConfig = {
  active: "none",
  intensity: 1.0,
}

function useFilterConfig() {
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(DEFAULT_FILTER_CONFIG)

  const setFilter = useCallback((name: FilterName) => {
    setFilterConfig((prev) => ({ ...prev, active: name }))
  }, [])

  const setIntensity = useCallback((value: number) => {
    setFilterConfig((prev) => ({ ...prev, intensity: value }))
  }, [])

  return { filterConfig, setFilter, setIntensity }
}

export default useFilterConfig
