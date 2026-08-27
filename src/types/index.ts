export interface GhostFrameState {
  originalImage: HTMLImageElement | null
  fileName: string
}

export interface TextConfig {
  content: string
  author: string
  fontFamily: string
  fontSize: number
  color: string
  position: 'top' | 'center' | 'bottom'
  alignment: 'left' | 'center' | 'right'
  showOverlay: boolean
  overlayOpacity: number
}

export interface WatermarkConfig {
  image: HTMLImageElement | null
  opacity: number
  size: number
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
}

export const AVAILABLE_FONTS = [
  { name: 'Playfair Display', label: 'Playfair Display' },
  { name: 'Montserrat', label: 'Montserrat' },
  { name: 'Lora', label: 'Lora' },
  { name: 'Cinzel', label: 'Cinzel' },
  { name: 'Raleway', label: 'Raleway' },
] as const

export type FilterName = 'none' | 'stoic-dark' | 'marble' | 'golden-hour' | 'noir' | 'mist'

export interface FilterConfig {
  active: FilterName
  intensity: number
}

export const AVAILABLE_FILTERS: { name: FilterName; label: string; description: string }[] = [
  { name: 'none', label: 'Original', description: 'No filter applied' },
  { name: 'stoic-dark', label: 'Stoic Dark', description: 'High contrast, cold tones, vignette' },
  { name: 'marble', label: 'Marble', description: 'Desaturated with subtle sepia' },
  { name: 'golden-hour', label: 'Golden Hour', description: 'Warm tones, soft glow' },
  { name: 'noir', label: 'Noir', description: 'Black & white, strong contrast' },
  { name: 'mist', label: 'Mist', description: 'Faded, low saturation, dreamy' },
]

export type ExportResolution = 'low' | 'medium' | 'high'

export interface ExportConfig {
  resolution: ExportResolution
  format: 'image/jpeg' | 'image/png'
  quality: number
}

export const RESOLUTION_PRESETS: Record<
  ExportResolution,
  { label: string; width: number; height: number; description: string }
> = {
  low: { label: 'Low', width: 1080, height: 1080, description: 'Feed estándar' },
  medium: { label: 'Medium', width: 1920, height: 1080, description: 'Stories / Cover' },
  high: { label: 'High', width: 2048, height: 2048, description: 'Máxima calidad' },
}
