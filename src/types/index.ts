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

export const AVAILABLE_FONTS = [
  { name: 'Playfair Display', label: 'Playfair Display' },
  { name: 'Montserrat', label: 'Montserrat' },
  { name: 'Lora', label: 'Lora' },
  { name: 'Cinzel', label: 'Cinzel' },
  { name: 'Raleway', label: 'Raleway' },
] as const
