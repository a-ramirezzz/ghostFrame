import {
  IMAGE_DECODE_ERROR,
  validateImageDimensions,
  validateImageFile,
} from "./imageLoading"

export interface PreparedImageAsset {
  file: File
  image: HTMLImageElement
  objectUrl: string
  dispose: () => void
}

export interface ImageAssetPreparation extends Promise<PreparedImageAsset> {
  cancel: () => void
}

const normalizedFailure = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return error
  return error instanceof Error && error.message && error.name !== "EncodingError" ? error : new Error(IMAGE_DECODE_ERROR)
}

export function prepareImageAsset(file: File, acceptedTypes: readonly string[], onFailure?: (error: Error) => void): ImageAssetPreparation {
  const validationError = validateImageFile(file, acceptedTypes)
  if (validationError) throw new Error(validationError)

  let objectUrl: string
  try { objectUrl = URL.createObjectURL(file) }
  catch { throw new Error(IMAGE_DECODE_ERROR) }
  let disposed = false
  let settled = false
  let image: HTMLImageElement | null = null
  let rejectPreparation: ((reason: Error) => void) | null = null
  const dispose = () => {
    if (!disposed) URL.revokeObjectURL(objectUrl)
    disposed = true
  }
  const detach = () => {
    if (!image) return
    image.onload = null
    image.onerror = null
  }
  const fail = (error: unknown, notify = true) => {
    if (settled) return
    settled = true
    detach()
    dispose()
    const failure = normalizedFailure(error)
    if (notify) onFailure?.(failure)
    rejectPreparation?.(failure)
  }
  const prepared = new Promise<PreparedImageAsset>((resolve, reject) => {
    rejectPreparation = reject
    try { image = new Image() }
    catch (error) { fail(error); return }
    image.onload = () => {
      const loadedImage = image!
      let decoding: Promise<void>
      try { decoding = loadedImage.decode() }
      catch (error) { fail(error); return }
      void decoding.then(() => {
        if (settled) return
        const dimensionError = validateImageDimensions(loadedImage)
        if (dimensionError) { fail(new Error(dimensionError)); return }
        settled = true
        detach()
        resolve({ file, image: loadedImage, objectUrl, dispose })
      }, fail)
    }
    image.onerror = () => fail(new Error(IMAGE_DECODE_ERROR))
    try { image.src = objectUrl }
    catch (error) { fail(error) }
  }) as ImageAssetPreparation
  prepared.cancel = () => {
    if (settled) return
    fail(new DOMException("Image preparation was cancelled.", "AbortError"), false)
  }
  return prepared
}
