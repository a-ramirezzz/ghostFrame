import { StrictMode } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ImageCanvas from "./ImageCanvas"
import { context, image, textConfig, watermarkConfig } from "../../../tests/helpers/fixtures"
import type { FilterConfig } from "../../types"

interface TextDraw { text: string; fillStyle: string | CanvasGradient | CanvasPattern }

class FrameScheduler {
  private nextId = 1
  readonly callbacks = new Map<number, FrameRequestCallback>()
  request = (callback: FrameRequestCallback) => { const id = this.nextId++; this.callbacks.set(id, callback); return id }
  cancel = (id: number) => { this.callbacks.delete(id) }
  async flush() {
    const pending = Array.from(this.callbacks.entries())
    for (const [id] of pending) this.callbacks.delete(id)
    await act(async () => { for (const [, callback] of pending) callback(performance.now()); await Promise.resolve() })
  }
}

let scheduler: FrameScheduler
let contexts: CanvasRenderingContext2D[]
let canvasContexts: Map<HTMLCanvasElement, CanvasRenderingContext2D>
let textDraws: TextDraw[]
let resizeCallbacks: ResizeObserverCallback[]

const filter: FilterConfig = { active: "noir", intensity: 1 }
const props = { image: image(6000, 4000), textConfig, watermarkConfig, filterConfig: filter, zoom: 1 }
const count = (method: "getImageData" | "measureText" | "putImageData") => contexts.reduce((sum, ctx) => sum + vi.mocked(ctx[method]).mock.calls.length, 0)

describe("ImageCanvas caching and scheduling", () => {
  beforeEach(() => {
    scheduler = new FrameScheduler(); contexts = []; canvasContexts = new Map(); textDraws = []; resizeCallbacks = []
    vi.stubGlobal("requestAnimationFrame", vi.fn(scheduler.request))
    vi.stubGlobal("cancelAnimationFrame", vi.fn(scheduler.cancel))
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { resizeCallbacks.push(callback) }
      observe() {}
      disconnect() {}
    })
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      const existing = canvasContexts.get(this)
      if (existing) return existing
      const ctx = context()
      vi.mocked(ctx.fillText).mockImplementation((value) => textDraws.push({ text: String(value), fillStyle: ctx.fillStyle }))
      contexts.push(ctx); canvasContexts.set(this, ctx); return ctx
    })
    Object.defineProperty(document, "fonts", { configurable: true, value: { load: vi.fn(() => Promise.resolve([])), ready: Promise.resolve() } })
  })

  it("commits color and text updates while reusing the filtered background appropriately", async () => {
    const view = render(<ImageCanvas {...props} />); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!
    const firstCommits = vi.mocked(visible.drawImage).mock.calls.length, firstReads = count("getImageData"), firstMeasures = count("measureText")
    view.rerender(<ImageCanvas {...props} textConfig={{ ...textConfig, color: "#ff0000" }} />); await scheduler.flush()
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(firstCommits + 1)
    expect(textDraws.some((draw) => draw.text === textConfig.content && draw.fillStyle === "#ff0000")).toBe(true)
    expect(count("getImageData")).toBe(firstReads); expect(count("measureText")).toBe(firstMeasures)
    view.rerender(<ImageCanvas {...props} textConfig={{ ...textConfig, content: "Texto nuevo" }} />); await scheduler.flush()
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(firstCommits + 2)
    expect(textDraws.some((draw) => draw.text === "Texto nuevo")).toBe(true)
    expect(count("getImageData")).toBe(firstReads); expect(count("measureText")).toBeGreaterThan(firstMeasures)
  })

  it("commits filter and watermark updates with the expected cache reuse", async () => {
    const view = render(<ImageCanvas {...props} />); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!
    const firstCommits = vi.mocked(visible.drawImage).mock.calls.length, firstMeasures = count("measureText"), firstWrites = count("putImageData")
    view.rerender(<ImageCanvas {...props} filterConfig={{ active: "mist", intensity: 1 }} />); await scheduler.flush()
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(firstCommits + 1)
    expect(count("putImageData")).toBeGreaterThan(firstWrites); expect(count("measureText")).toBe(firstMeasures)
    const logo = image(100, 80, "blob:logo"), beforeLogoCommit = vi.mocked(visible.drawImage).mock.calls.length, beforeLogoReads = count("getImageData")
    view.rerender(<ImageCanvas {...props} filterConfig={{ active: "mist", intensity: 1 }} watermarkConfig={{ ...watermarkConfig, image: logo }} />); await scheduler.flush()
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(beforeLogoCommit + 1)
    expect(contexts.some((ctx) => vi.mocked(ctx.drawImage).mock.calls.some((args) => args[0] === logo))).toBe(true)
    expect(count("getImageData")).toBe(beforeLogoReads); expect(count("measureText")).toBeGreaterThan(firstMeasures)
  })

  it("zero intensity and no filter render without pixel filtering", async () => {
    const view = render(<ImageCanvas {...props} filterConfig={{ active: "mist", intensity: 0 }} />); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!, commits = vi.mocked(visible.drawImage).mock.calls.length
    expect(count("getImageData")).toBe(0)
    view.rerender(<ImageCanvas {...props} filterConfig={{ active: "none", intensity: 1 }} />); await scheduler.flush()
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(commits + 1); expect(count("getImageData")).toBe(0)
  })

  it("uses image identity in the background cache and ignores zoom and observed container changes", async () => {
    const view = render(<ImageCanvas {...props} />); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!
    const commits = vi.mocked(visible.drawImage).mock.calls.length, reads = count("getImageData"), measures = count("measureText")
    view.rerender(<ImageCanvas {...props} zoom={1.5} />)
    Object.defineProperties(canvas.parentElement!, { clientWidth: { configurable: true, value: 900 }, clientHeight: { configurable: true, value: 700 } })
    act(() => resizeCallbacks[0]([], {} as ResizeObserver))
    expect(scheduler.callbacks.size).toBe(0); expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(commits)
    expect(count("getImageData")).toBe(reads); expect(count("measureText")).toBe(measures)
    view.rerender(<ImageCanvas {...props} image={image(6000, 4000, "blob:same-name")} />); await scheduler.flush()
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(commits + 1); expect(count("getImageData")).toBeGreaterThan(reads)
  })

  it("publishes only the latest of multiple updates queued before one frame", async () => {
    const warning = vi.fn(), view = render(<ImageCanvas {...props} onLayoutWarning={warning} />)
    view.rerender(<ImageCanvas {...props} textConfig={{ ...textConfig, content: "intermediate" }} onLayoutWarning={warning} />)
    view.rerender(<ImageCanvas {...props} textConfig={{ ...textConfig, content: "latest" }} onLayoutWarning={warning} />)
    expect(scheduler.callbacks.size).toBe(1); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!
    expect(textDraws.some((draw) => draw.text === "latest")).toBe(true); expect(textDraws.some((draw) => draw.text === "intermediate")).toBe(false)
    expect(vi.mocked(visible.drawImage)).toHaveBeenCalledOnce(); expect(warning).toHaveBeenCalledOnce()
  })

  it("prevents obsolete font-waiting work from publishing after a newer request succeeds", async () => {
    let rejectOld!: (reason: unknown) => void, fontCalls = 0
    const oldFont = new Promise<FontFace[]>((_resolve, reject) => { rejectOld = reject })
    Object.defineProperty(document, "fonts", { configurable: true, value: { load: vi.fn(() => ++fontCalls <= 3 ? oldFont : Promise.resolve([])), ready: Promise.resolve() } })
    const warning = vi.fn(), error = vi.fn(), view = render(<ImageCanvas {...props} onLayoutWarning={warning} onRenderError={error} />)
    await scheduler.flush()
    view.rerender(<ImageCanvas {...props} textConfig={{ ...textConfig, content: "latest" }} onLayoutWarning={warning} onRenderError={error} />); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!, commits = vi.mocked(visible.drawImage).mock.calls.length
    expect(textDraws.some((draw) => draw.text === "latest")).toBe(true)
    rejectOld(new Error("obsolete font failure")); await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(commits); expect(error).toHaveBeenCalledTimes(1); expect(error).toHaveBeenLastCalledWith(null)
    expect(warning).toHaveBeenCalledTimes(1); expect(screen.queryByRole("alert")).toBeNull()
  })

  it("preserves the successful canvas on failure and retry recovers", async () => {
    const view = render(<StrictMode><ImageCanvas {...props} /></StrictMode>); expect(scheduler.callbacks.size).toBe(1); await scheduler.flush()
    const canvas = view.container.querySelector("canvas") as HTMLCanvasElement, visible = canvasContexts.get(canvas)!, successfulCommits = vi.mocked(visible.drawImage).mock.calls.length
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementationOnce(() => null)
    view.rerender(<StrictMode><ImageCanvas {...props} textConfig={{ ...textConfig, content: "failure" }} /></StrictMode>); await scheduler.flush()
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be updated/); expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(successfulCommits)
    fireEvent.click(screen.getByRole("button", { name: "Retry" })); await scheduler.flush()
    expect(screen.queryByRole("alert")).toBeNull(); expect(vi.mocked(visible.drawImage).mock.calls.length).toBe(successfulCommits + 1)
  })

  it("StrictMode cleanup leaves one active callback and unmount prevents later publication", async () => {
    const warning = vi.fn(), error = vi.fn(), view = render(<StrictMode><ImageCanvas {...props} onLayoutWarning={warning} onRenderError={error} /></StrictMode>)
    expect(scheduler.callbacks.size).toBe(1); view.unmount(); expect(scheduler.callbacks.size).toBe(0); await scheduler.flush()
    expect(contexts).toHaveLength(0); expect(warning).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled()
  })
})
