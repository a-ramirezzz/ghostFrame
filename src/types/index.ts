export interface GhostFrameState {
  originalImage: HTMLImageElement | null
  fileName: string
}

export interface TextConfig {
  content: string
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
