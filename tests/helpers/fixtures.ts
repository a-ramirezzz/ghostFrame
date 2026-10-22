import { vi } from "vitest"
import type { TextConfig, WatermarkConfig } from "../../src/types"

export const textConfig: TextConfig = {
  content: "La calma es poder.", author: "Séneca", pageName: "estoicismo",
  fontFamily: "Lora", fontSize: 32, color: "#ffffff", position: "center",
  alignment: "center", showOverlay: true, overlayOpacity: 0.5,
  accentColor: "#c8a44e", showFrame: true,
}

export const watermarkConfig: WatermarkConfig = {
  image: null, opacity: 0.2, size: 15, position: "bottom-right",
}

export function image(width = 1200, height = 800, src = "blob:test"): HTMLImageElement {
  return { naturalWidth: width, naturalHeight: height, src } as HTMLImageElement
}

export function context() {
  const gradient = { addColorStop: vi.fn() }
  return {
    font: "", textAlign: "left", textBaseline: "top", fillStyle: "", strokeStyle: "",
    shadowColor: "", shadowBlur: 0, shadowOffsetY: 0, globalAlpha: 1, lineWidth: 1,
    lineCap: "butt", measureText: vi.fn((value: string) => ({ width: Array.from(value).length * 10 })),
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), rect: vi.fn(),
    clip: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), fillText: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    fillRect: vi.fn(), createLinearGradient: vi.fn(() => gradient),
    getImageData: vi.fn(() => new ImageData(new Uint8ClampedArray(4), 1, 1)),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}
