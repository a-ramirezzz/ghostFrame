import type { ChangeEvent } from "react"
import { AVAILABLE_FONTS, type TextConfig } from "../../types"

interface TextEditorProps {
  textConfig: TextConfig
  updateTextConfig: (partial: Partial<TextConfig>) => void
}

const POSITIONS: { value: TextConfig["position"]; label: string }[] = [
  { value: "top", label: "↑" },
  { value: "center", label: "⬌" },
  { value: "bottom", label: "↓" },
]

const ALIGNMENTS: { value: TextConfig["alignment"]; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
]

function TextEditor({ textConfig, updateTextConfig }: TextEditorProps) {
  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateTextConfig({ content: event.target.value })
  }

  const handleAuthorChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateTextConfig({ author: event.target.value })
  }

  const handleFontChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateTextConfig({ fontFamily: event.target.value })
  }

  const handleFontSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateTextConfig({ fontSize: Number(event.target.value) })
  }

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateTextConfig({ color: event.target.value })
  }

  const handleOverlayOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateTextConfig({ overlayOpacity: Number(event.target.value) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1 block text-xs text-[#9a9484]">Quote</span>
        <textarea
          value={textConfig.content}
          onChange={handleContentChange}
          placeholder="Write your stoic quote..."
          rows={4}
          className="w-full resize-none rounded-md border border-[#2a2721] bg-[#1a1814] p-2 text-sm text-[#e8e2d6] placeholder-[#5a5449] transition-all duration-200 focus:border-[#c8a44e] focus:outline-none focus:[box-shadow:0_0_0_2px_rgba(200,164,78,0.1)]"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs text-[#9a9484]">Attribution</span>
        <input
          type="text"
          value={textConfig.author}
          onChange={handleAuthorChange}
          placeholder="Author (e.g., Marco Aurelio)"
          className="w-full rounded-md border border-[#2a2721] bg-[#1a1814] px-3 py-2 text-sm text-[#e8e2d6] placeholder-[#5a5449] transition-all duration-200 focus:border-[#c8a44e] focus:outline-none focus:[box-shadow:0_0_0_2px_rgba(200,164,78,0.1)]"
        />
      </div>

      <select
        value={textConfig.fontFamily}
        onChange={handleFontChange}
        className="select-ghost w-full rounded-md border border-[#2a2721] bg-[#1a1814] p-2 text-sm text-[#e8e2d6] transition-all duration-200 focus:border-[#c8a44e] focus:outline-none focus:[box-shadow:0_0_0_2px_rgba(200,164,78,0.1)]"
      >
        {AVAILABLE_FONTS.map((font) => (
          <option key={font.name} value={font.name}>
            {font.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[#9a9484]">Size</span>
        <input
          type="range"
          min={16}
          max={72}
          step={2}
          value={textConfig.fontSize}
          onChange={handleFontSizeChange}
          className="w-full"
        />
        <span className="w-8 text-right text-xs text-[#e8e2d6]">
          {textConfig.fontSize}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#9a9484]">Color</span>
        <input
          type="color"
          value={textConfig.color}
          onChange={handleColorChange}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs text-[#9a9484]">Position</span>
        <div className="flex gap-2">
          {POSITIONS.map((position) => (
            <button
              key={position.value}
              type="button"
              onClick={() => updateTextConfig({ position: position.value })}
              className={`rounded-md border px-3 py-1.5 text-xs transition-all duration-200 ${
                textConfig.position === position.value
                  ? "border-[rgba(200,164,78,0.35)] bg-[rgba(200,164,78,0.12)] text-[#c8a44e]"
                  : "border-[#2a2721] bg-[#1a1814] text-[#9a9484] hover:border-[#3d3830] hover:bg-[#221f1a] hover:text-[#e8e2d6]"
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs text-[#9a9484]">Alignment</span>
        <div className="flex gap-2">
          {ALIGNMENTS.map((alignment) => (
            <button
              key={alignment.value}
              type="button"
              onClick={() => updateTextConfig({ alignment: alignment.value })}
              className={`rounded-md border px-3 py-1.5 text-xs transition-all duration-200 ${
                textConfig.alignment === alignment.value
                  ? "border-[rgba(200,164,78,0.35)] bg-[rgba(200,164,78,0.12)] text-[#c8a44e]"
                  : "border-[#2a2721] bg-[#1a1814] text-[#9a9484] hover:border-[#3d3830] hover:bg-[#221f1a] hover:text-[#e8e2d6]"
              }`}
            >
              {alignment.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#9a9484]">Dark overlay</span>
        <div
          role="switch"
          aria-checked={textConfig.showOverlay}
          onClick={() => updateTextConfig({ showOverlay: !textConfig.showOverlay })}
          className={`relative h-5 w-10 cursor-pointer rounded-full transition-all duration-200 ${
            textConfig.showOverlay ? "bg-[#c8a44e]" : "bg-[#2a2721]"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${
              textConfig.showOverlay ? "left-5 bg-[#12110e]" : "left-0.5 bg-[#6b6559]"
            }`}
          />
        </div>
      </div>

      {textConfig.showOverlay && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9a9484]">Overlay opacity</span>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={textConfig.overlayOpacity}
            onChange={handleOverlayOpacityChange}
            className="w-full"
          />
          <span className="w-8 text-right text-xs text-[#e8e2d6]">
            {Math.round(textConfig.overlayOpacity * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default TextEditor
