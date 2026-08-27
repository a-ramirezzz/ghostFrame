import type { FilterName } from "../types"

function clamp(value: number): number {
  return Math.min(255, Math.max(0, value))
}

function adjustBrightness(value: number, amount: number): number {
  return clamp(value + amount)
}

function adjustContrast(value: number, contrast: number): number {
  return clamp(((value / 255 - 0.5) * contrast + 0.5) * 255)
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      case bn:
        h = (rn - gn) / d + 4
        break
    }

    h *= 60
  }

  return [h, s, l]
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = l * 255
    return [v, v, v]
  }

  const hn = h / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const r = hueToRgb(p, q, hn + 1 / 3)
  const g = hueToRgb(p, q, hn)
  const b = hueToRgb(p, q, hn - 1 / 3)

  return [r * 255, g * 255, b * 255]
}

function applyStoicDark(data: Uint8ClampedArray, width: number, height: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)

    let r = adjustContrast(data[i], 1.3)
    let g = adjustContrast(data[i + 1], 1.3)
    let b = adjustContrast(data[i + 2], 1.3)

    r = adjustBrightness(r, -8)
    b = adjustBrightness(b, 15)

    r = adjustBrightness(r, -20)
    g = adjustBrightness(g, -20)
    b = adjustBrightness(b, -20)

    const dx = (x - width / 2) / (width / 2)
    const dy = (y - height / 2) / (height / 2)
    const distance = Math.sqrt(dx * dx + dy * dy)
    const vignette = 1 - distance * 0.4

    data[i] = clamp(r * vignette)
    data[i + 1] = clamp(g * vignette)
    data[i + 2] = clamp(b * vignette)
  }
}

function applyMarble(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    const [r, g, b] = hslToRgb(h, s * 0.3, l)

    data[i] = clamp(adjustBrightness(r, 15) + 10)
    data[i + 1] = clamp(adjustBrightness(g, 8) + 10)
    data[i + 2] = clamp(adjustBrightness(b, -10) + 10)
  }
}

function applyGoldenHour(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    let r = adjustBrightness(data[i], 20)
    let g = adjustBrightness(data[i + 1], 10)
    let b = adjustBrightness(data[i + 2], -15)

    r = adjustBrightness(r, 15)
    g = adjustBrightness(g, 15)
    b = adjustBrightness(b, 15)

    r = adjustContrast(r, 1.1)
    g = adjustContrast(g, 1.1)
    b = adjustContrast(b, 1.1)

    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (luminance < 128) {
      r = adjustBrightness(r, 8)
      g = adjustBrightness(g, 4)
    }

    data[i] = clamp(r)
    data[i + 1] = clamp(g)
    data[i + 2] = clamp(b)
  }
}

function applyNoir(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

    let r = adjustContrast(gray, 1.4)
    let g = adjustContrast(gray, 1.4)
    let b = adjustContrast(gray, 1.4)

    r = adjustBrightness(r, -10)
    g = adjustBrightness(g, -10)
    b = adjustBrightness(b, -10)

    data[i] = clamp(r)
    data[i + 1] = clamp(g)
    data[i + 2] = clamp(b)
  }
}

function applyMist(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    let [r, g, b] = hslToRgb(h, s * 0.5, l)

    r = adjustBrightness(r, 25)
    g = adjustBrightness(g, 25)
    b = adjustBrightness(b, 25)

    r = adjustContrast(r, 0.85)
    g = adjustContrast(g, 0.85)
    b = adjustContrast(b, 0.85)

    r = r + (255 - r) * 0.15
    g = g + (255 - g) * 0.15
    b = b + (255 - b) * 0.15

    data[i] = clamp(r)
    data[i + 1] = clamp(g)
    data[i + 2] = clamp(b)
  }
}

export function applyFilter(
  imageData: ImageData,
  filterName: FilterName,
  intensity: number,
): ImageData {
  const clone = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  )

  if (filterName === "none") {
    return clone
  }

  const original = imageData.data
  const filtered = clone.data

  switch (filterName) {
    case "stoic-dark":
      applyStoicDark(filtered, imageData.width, imageData.height)
      break
    case "marble":
      applyMarble(filtered)
      break
    case "golden-hour":
      applyGoldenHour(filtered)
      break
    case "noir":
      applyNoir(filtered)
      break
    case "mist":
      applyMist(filtered)
      break
  }

  for (let i = 0; i < filtered.length; i += 4) {
    filtered[i] = clamp(original[i] + (filtered[i] - original[i]) * intensity)
    filtered[i + 1] = clamp(original[i + 1] + (filtered[i + 1] - original[i + 1]) * intensity)
    filtered[i + 2] = clamp(original[i + 2] + (filtered[i + 2] - original[i + 2]) * intensity)
  }

  return clone
}
