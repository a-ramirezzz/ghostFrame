import DropZone from "../Canvas/DropZone"
import ImageCanvas from "../Canvas/ImageCanvas"
import ExportPanel from "../ExportPanel/ExportPanel"
import FilterPanel from "../FilterPanel/FilterPanel"
import TextEditor from "../TextEditor/TextEditor"
import WatermarkEditor from "../WatermarkLayer/WatermarkEditor"
import useExport from "../../hooks/useExport"
import useFilterConfig from "../../hooks/useFilterConfig"
import useImageLoader from "../../hooks/useImageLoader"
import useTextConfig from "../../hooks/useTextConfig"
import useWatermarkConfig from "../../hooks/useWatermarkConfig"
import useZoom from "../../hooks/useZoom"
import ImageControls from "./ImageControls"
import SidebarSection from "./SidebarSection"

function Layout() {
  const { originalImage, fileName, loadImage } = useImageLoader()
  const { textConfig, updateTextConfig } = useTextConfig()
  const { watermarkConfig, loadWatermark, removeWatermark, updateWatermarkConfig } =
    useWatermarkConfig()
  const { filterConfig, setFilter, setIntensity } = useFilterConfig()
  const { exportConfig, isExporting, updateExportConfig, performExport } = useExport()
  const { zoom, zoomIn, zoomOut, resetZoom } = useZoom()

  const handleWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      if (event.deltaY < 0) zoomIn()
      else zoomOut()
    }
  }

  const handleExport = () => {
    if (!originalImage) return
    performExport({ originalImage, filterConfig, textConfig, watermarkConfig })
  }

  return (
    <div className="relative flex h-screen bg-[#0c0b09]">
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, #c8a44e40, transparent)" }}
      />

      <aside
        className="sidebar-scroll w-80 shrink-0 overflow-y-auto bg-[#12110e] p-4"
        style={{ boxShadow: "inset -8px 0 16px -8px rgba(0,0,0,0.3)" }}
      >
        <div className="mb-4 pb-4">
          <h1 className="flex items-center gap-3 text-base font-semibold tracking-wide">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(200, 164, 78, 0.3))' }}>
              <path d="M12 2C7.58 2 4 5.58 4 10v10.5c0 .83 1.01 1.24 1.59.65l1.41-1.4 1.41 1.4c.39.39 1.02.39 1.41 0L12 19.74l2.18 2.41c.39.39 1.02.39 1.41 0l1.41-1.4 1.41 1.4c.58.59 1.59.18 1.59-.65V10c0-4.42-3.58-8-8-8z" fill="#c8a44e"/>
              <circle cx="9.5" cy="11" r="1.5" fill="#0c0b09"/>
              <circle cx="14.5" cy="11" r="1.5" fill="#0c0b09"/>
            </svg>
            <span className="text-[#e8e2d6]">Ghost</span>
            <span className="text-[#c8a44e]">Frame</span>
          </h1>
          <div
            className="mt-4 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, #2a2721, #c8a44e20, #2a2721, transparent)",
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SidebarSection title="Image">
            <ImageControls
              image={originalImage}
              fileName={fileName}
              onImageLoad={loadImage}
            />
          </SidebarSection>

          <SidebarSection title="Text">
            <TextEditor textConfig={textConfig} updateTextConfig={updateTextConfig} />
          </SidebarSection>

          <SidebarSection title="Filters">
            <FilterPanel
              filterConfig={filterConfig}
              onSelectFilter={setFilter}
              onIntensityChange={setIntensity}
              previewImage={originalImage}
            />
          </SidebarSection>

          <SidebarSection title="Watermark">
            <WatermarkEditor
              watermarkConfig={watermarkConfig}
              loadWatermark={loadWatermark}
              removeWatermark={removeWatermark}
              updateWatermarkConfig={updateWatermarkConfig}
            />
          </SidebarSection>

          <SidebarSection title="Export">
            <ExportPanel
              exportConfig={exportConfig}
              isExporting={isExporting}
              onUpdateConfig={updateExportConfig}
              onExport={handleExport}
              hasImage={originalImage !== null}
            />
          </SidebarSection>
        </div>
      </aside>

      <main
        className="relative flex h-screen flex-1 items-center justify-center overflow-hidden bg-[#0c0b09]"
        onWheel={handleWheel}
      >
        {originalImage ? (
          <ImageCanvas
            image={originalImage}
            textConfig={textConfig}
            watermarkConfig={watermarkConfig}
            filterConfig={filterConfig}
            zoom={zoom}
          />
        ) : (
          <DropZone onImageLoad={loadImage} />
        )}

        {originalImage && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#2a2721] bg-[#1a1814] px-2 py-1 shadow-lg">
            <button
              type="button"
              onClick={zoomOut}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#9a9484] transition-all duration-200 hover:bg-[#221f1a] hover:text-[#e8e2d6]"
            >
              −
            </button>
            <span
              onClick={resetZoom}
              className="w-12 cursor-pointer text-center text-xs text-[#9a9484] transition hover:text-[#c8a44e]"
            >
              {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#9a9484] transition-all duration-200 hover:bg-[#221f1a] hover:text-[#e8e2d6]"
            >
              +
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default Layout
