import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import DropZone from "./DropZone"

describe("DropZone", () => {
  it("clears the file input so the same file can be selected again", () => {
    const onImageLoad = vi.fn(), file = new File(["x"], "same.png", { type: "image/png" })
    const { container } = render(<DropZone onImageLoad={onImageLoad} isLoading={false} error={null} onDismissError={vi.fn()} />)
    const input = container.querySelector("input") as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onImageLoad).toHaveBeenCalledTimes(2)
    expect(input.value).toBe("")
  })
})
