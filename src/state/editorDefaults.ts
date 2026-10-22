import type { ExportConfig, FilterConfig, TextConfig, WatermarkConfig } from "../types"

export const DEFAULT_TEXT_CONFIG: TextConfig = {
  content: "",
  author: "",
  pageName: "",
  fontFamily: "Playfair Display",
  fontSize: 32,
  color: "#F2EBDD",
  position: "center",
  alignment: "center",
  showOverlay: true,
  overlayOpacity: 0.5,
  accentColor: "#C8A44E",
  showFrame: false,
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = { active: "none", intensity: 1 }

export const DEFAULT_WATERMARK_CONFIG: Omit<WatermarkConfig, "image"> = {
  opacity: 0.2,
  size: 15,
  position: "bottom-right",
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  resolution: "low",
  format: "image/jpeg",
  quality: 0.92,
}
