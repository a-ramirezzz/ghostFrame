import { expect, test, type Download, type Page } from "@playwright/test"

async function canvasFixture(page: Page, width: number, height: number, type = "image/png") {
  const bytes = await page.evaluate(async ({ width, height, type }) => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#42627a"; ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = "#d8b868"; ctx.fillRect(width / 4, height / 4, width / 2, height / 2)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("fixture encoding failed")), type))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }, { width, height, type })
  return Buffer.from(bytes)
}

function imageDimensions(bytes: Buffer) {
  if (bytes.subarray(1, 4).toString("ascii") === "PNG") return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue }
    const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc3) return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
    offset += 2 + length
  }
  throw new Error("Unknown image format")
}

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream()
  return Buffer.concat(await stream.toArray())
}

async function canvasOutput(page: Page) {
  return page.locator("main canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
}

async function decodedDimensions(page: Page, bytes: Buffer, type: string) {
  return page.evaluate(async ({ values, type }) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(values)], { type }))
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  }, { values: Array.from(bytes), type })
}

test.beforeEach(async ({ page }) => {
  const errors: Error[] = []; page.on("pageerror", (error) => errors.push(error))
  await page.goto("/")
  ;(page as Page & { unexpectedErrors?: Error[] }).unexpectedErrors = errors
})

test.afterEach(async ({ page }) => {
  expect((page as Page & { unexpectedErrors?: Error[] }).unexpectedErrors).toEqual([])
})

test("uploads, composes with a logo, and exports valid PNG and JPEG dimensions", async ({ page }) => {
  await expect.poll(() => page.evaluate(async () => {
    await document.fonts.ready
    const checks = await Promise.all([
      document.fonts.load('700 32px "Playfair Display"'),
      document.fonts.load('400 16px "Cinzel"'),
    ])
    return checks.every((faces) => faces.length > 0)
  })).toBe(true)
  const source = await canvasFixture(page, 1200, 800)
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: "paisaje.png", mimeType: "image/png", buffer: source })
  await expect(page.locator("main canvas")).toHaveAttribute("width", "1200")
  const initialOutput = await canvasOutput(page)
  await page.getByLabel("Quote", { exact: true }).fill("La serenidad nace de elegir bien nuestros pensamientos.")
  await page.getByLabel("Attribution").fill("Marco Aurelio")
  await expect.poll(() => canvasOutput(page)).not.toBe(initialOutput)
  const textOutput = await canvasOutput(page)
  const logo = await canvasFixture(page, 64, 64)
  await page.locator('input[type="file"]').nth(1).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logo })
  await expect(page.getByAltText("Watermark preview")).toBeVisible()
  await expect.poll(() => canvasOutput(page)).not.toBe(textOutput)

  await page.getByRole("button", { name: "PNG", exact: true }).click()
  const pngDownload = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export Image/ }).click()]).then(([download]) => download)
  const png = await downloadBytes(pngDownload)
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  expect(imageDimensions(png)).toEqual({ width: 1080, height: 720 })
  expect(await decodedDimensions(page, png, "image/png")).toEqual({ width: 1080, height: 720 })

  await page.getByRole("button", { name: "JPG", exact: true }).click()
  const jpgDownload = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export Image/ }).click()]).then(([download]) => download)
  const jpg = await downloadBytes(jpgDownload)
  expect(jpg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
  expect(imageDimensions(jpg)).toEqual({ width: 1080, height: 720 })
  expect(await decodedDimensions(page, jpg, "image/jpeg")).toEqual({ width: 1080, height: 720 })
})

test("rejects corrupt replacement without losing the valid image", async ({ page }) => {
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: "valid.png", mimeType: "image/png", buffer: await canvasFixture(page, 20, 10) })
  await expect(page.getByText("20 × 10", { exact: true })).toBeVisible()
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") })
  await expect(page.getByRole("alert")).toContainText("could not be opened")
  await expect(page.getByText("20 × 10", { exact: true })).toBeVisible()
  await expect(page.locator("main canvas")).toHaveAttribute("width", "20")
})

test("overflow blocks download until corrected", async ({ page }) => {
  const downloads: Download[] = []
  page.on("download", (download) => downloads.push(download))
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: await canvasFixture(page, 1000, 300) })
  await page.getByLabel("Quote", { exact: true }).fill(Array.from({ length: 80 }, (_, index) => `línea ${index}`).join("\n"))
  await expect(page.getByRole("status")).toContainText("does not fit")
  await page.getByRole("button", { name: /Export Image/ }).click()
  await expect(page.getByRole("alert")).toContainText("does not fit")
  expect(downloads).toHaveLength(0)
  await page.getByLabel("Quote", { exact: true }).fill("Ahora sí cabe.")
  await expect(page.getByRole("status")).toHaveCount(0)
  await page.getByRole("button", { name: /Export Image/ }).click()
  await expect.poll(() => downloads.length).toBe(1)
})

test("preview bitmap is bounded while export uses source aspect and preset", async ({ page }) => {
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: "large.png", mimeType: "image/png", buffer: await canvasFixture(page, 4096, 2048) })
  const canvas = page.locator("main canvas")
  await expect(canvas).toHaveAttribute("width", "2048"); await expect(canvas).toHaveAttribute("height", "1024")
  await page.getByRole("button", { name: "PNG", exact: true }).click()
  const download = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export Image/ }).click()]).then(([item]) => item)
  const bytes = await downloadBytes(download)
  expect(imageDimensions(bytes)).toEqual({ width: 1080, height: 540 })
})
