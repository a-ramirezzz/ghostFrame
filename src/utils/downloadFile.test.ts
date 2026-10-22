import { describe, expect, it, vi } from "vitest"
import { downloadBlob } from "./downloadFile"

describe("downloadBlob", () => {
  it("removes its anchor immediately and revokes the deferred object URL", () => {
    vi.useFakeTimers()
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const remove = vi.spyOn(HTMLAnchorElement.prototype, "remove")
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    downloadBlob(new Blob(["image"]), "ghostframe.png")
    expect(click).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:download")
  })
})
