import DropZone from "../Canvas/DropZone"
import ImageCanvas from "../Canvas/ImageCanvas"
import FilterPanel from "../FilterPanel/FilterPanel"
import TextEditor from "../TextEditor/TextEditor"
import WatermarkEditor from "../WatermarkLayer/WatermarkEditor"
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

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-[#2a2a2a] bg-[#141414] p-4">
        <div className="mb-4 border-b border-[#2a2a2a] pb-4">
          <h1 className="text-lg font-bold text-white">
            <span className="mr-2">👻</span>
            GhostFrame
          </h1>
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
            <p className="text-sm text-gray-500">Download your creation</p>
          </SidebarSection>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#111111] p-8">
        {originalImage ? (
          <ImageCanvas
            image={originalImage}
            textConfig={textConfig}
            watermarkConfig={watermarkConfig}
            filterConfig={filterConfig}
          />
        ) : (
          <DropZone onImageLoad={loadImage} />
        )}
      </main>
    </div>
  )
}

export default Layout
