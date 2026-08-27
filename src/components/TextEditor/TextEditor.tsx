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
        <span className="mb-1 block text-xs text-gray-400">Quote</span>
        <textarea
          value={textConfig.content}
          onChange={handleContentChange}
          placeholder="Write your stoic quote..."
          rows={4}
          className="w-full resize-none rounded-md border border-gray-700 bg-[#1a1a1a] p-2 text-sm text-white transition focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs text-gray-400">Attribution</span>
        <input
          type="text"
          value={textConfig.author}
          onChange={handleAuthorChange}
          placeholder="Author (e.g., Marco Aurelio)"
          className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none"
        />
      </div>

      <select
        value={textConfig.fontFamily}
        onChange={handleFontChange}
        className="w-full rounded-md border border-gray-700 bg-[#1a1a1a] p-2 text-sm text-white"
      >
        {AVAILABLE_FONTS.map((font) => (
          <option key={font.name} value={font.name}>
            {font.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Size</span>
        <input
          type="range"
          min={16}
          max={72}
          step={2}
          value={textConfig.fontSize}
          onChange={handleFontSizeChange}
          className="w-full accent-blue-500"
        />
        <span className="w-8 text-right text-xs text-gray-300">
          {textConfig.fontSize}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Color</span>
        <input
          type="color"
          value={textConfig.color}
          onChange={handleColorChange}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs text-gray-400">Position</span>
        <div className="flex gap-2">
          {POSITIONS.map((position) => (
            <button
              key={position.value}
              type="button"
              onClick={() => updateTextConfig({ position: position.value })}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                textConfig.position === position.value
                  ? "bg-blue-600 text-white"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs text-gray-400">Alignment</span>
        <div className="flex gap-2">
          {ALIGNMENTS.map((alignment) => (
            <button
              key={alignment.value}
              type="button"
              onClick={() => updateTextConfig({ alignment: alignment.value })}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                textConfig.alignment === alignment.value
                  ? "bg-blue-600 text-white"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}
            >
              {alignment.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Dark overlay</span>
        <div
          role="switch"
          aria-checked={textConfig.showOverlay}
          onClick={() => updateTextConfig({ showOverlay: !textConfig.showOverlay })}
          className={`relative h-5 w-10 cursor-pointer rounded-full transition ${
            textConfig.showOverlay ? "bg-blue-600" : "bg-gray-600"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
              textConfig.showOverlay ? "left-5" : "left-0.5"
            }`}
          />
        </div>
      </div>

      {textConfig.showOverlay && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Overlay opacity</span>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={textConfig.overlayOpacity}
            onChange={handleOverlayOpacityChange}
            className="w-full accent-blue-500"
          />
          <span className="w-8 text-right text-xs text-gray-300">
            {Math.round(textConfig.overlayOpacity * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default TextEditor
