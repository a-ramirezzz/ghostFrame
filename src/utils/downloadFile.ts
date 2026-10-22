export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  try {
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
  } finally {
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}
