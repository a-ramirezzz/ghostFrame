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
import ImageControls from "./ImageControls"
import SidebarSection from "./SidebarSection"

function Layout() {
  const { originalImage, fileName, loadImage } = useImageLoader()
  const { textConfig, updateTextConfig } = useTextConfig()
  const { watermarkConfig, loadWatermark, removeWatermark, updateWatermarkConfig } =
    useWatermarkConfig()
  const { filterConfig, setFilter, setIntensity } = useFilterConfig()
  const { exportConfig, isExporting, updateExportConfig, performExport } = useExport()

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
          <h1 className="text-base font-semibold tracking-wide">
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

      <main className="flex flex-1 items-center justify-center bg-[#0c0b09] p-8">
        {originalImage ? (
          <div
            className="overflow-hidden rounded-md"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
          >
            <ImageCanvas
              image={originalImage}
              textConfig={textConfig}
              watermarkConfig={watermarkConfig}
              filterConfig={filterConfig}
            />
          </div>
        ) : (
          <DropZone onImageLoad={loadImage} />
        )}
      </main>
    </div>
  )
}

export default Layout
