import { describe, expect, it } from "vitest"
import { applyFilter } from "./filters"

describe("filters", () => {
  const fixture = () => new ImageData(new Uint8ClampedArray([100, 150, 200, 17, 20, 40, 60, 231]), 2, 1)
  it("does not mutate its input and preserves alpha", () => {
    const input = fixture(), before = Array.from(input.data)
    const output = applyFilter(input, "noir", 1)
    expect(Array.from(input.data)).toEqual(before)
    expect([output.data[3], output.data[7]]).toEqual([17, 231])
  })
  it("intensity zero preserves all pixels", () => expect(Array.from(applyFilter(fixture(), "mist", 0).data)).toEqual(Array.from(fixture().data)))
  it("applies noir to a hand-calculated neutral fixture", () => {
    const input = new ImageData(new Uint8ClampedArray([100, 100, 100, 99]), 1, 1)
    // The luminance coefficients sum to 0.9999999999999999; the independently
    // calculated channel is therefore just below 79.5 and Uint8ClampedArray rounds to 79.
    expect(Array.from(applyFilter(input, "noir", 1).data)).toEqual([79, 79, 79, 99])
  })
})
