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
import useEditorPersistence from "../../hooks/useEditorPersistence"
import { loadEditorSnapshot } from "../../state/editorPersistence"
import ImageControls from "./ImageControls"
import SidebarSection from "./SidebarSection"
import ProjectsPanel from "../Projects/ProjectsPanel"
import useProjects from "../../hooks/useProjects"
import { useCallback, useMemo, useState } from "react"

function Layout() {
  const [initialEditor] = useState(loadEditorSnapshot)
  const image = useImageLoader()
  const { originalImage, fileName, sourceFile, loadImage, isLoading: isImageLoading, error: imageError, dismissError: dismissImageError } = image
  const { textConfig, updateTextConfig, replaceTextConfig, resetTextConfig } = useTextConfig(initialEditor.snapshot.text)
  const watermark = useWatermarkConfig(initialEditor.snapshot.watermark)
  const { watermarkConfig, sourceFile: watermarkFile, loadWatermark, removeWatermark, updateWatermarkConfig, replaceWatermarkConfig, resetWatermarkConfig, isLoading: isWatermarkLoading, error: watermarkError, dismissError: dismissWatermarkError } =
    watermark
  const { filterConfig, setFilter, setIntensity, replaceFilterConfig, resetFilterConfig } = useFilterConfig(initialEditor.snapshot.filter)
  const { zoom, zoomIn, zoomOut, resetZoom } = useZoom()
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const isExportEligible = originalImage !== null && !isImageLoading && !isWatermarkLoading && previewError === null
  const { exportConfig, isExporting, error: exportError, dismissError: dismissExportError, updateExportConfig, replaceExportConfig, resetExportConfig, performExport } = useExport(isExportEligible, initialEditor.snapshot.export)
  const persistence = useEditorPersistence(initialEditor, { textConfig, filterConfig, watermarkConfig, exportConfig })
  const handleRenderError = useCallback((error: string | null) => setPreviewError(error), [])
  const projectTarget = useMemo(() => ({
    commitImage: image.commitPrepared, commitWatermark: watermark.commitPrepared,
    replaceText: replaceTextConfig, replaceFilter: replaceFilterConfig,
    replaceWatermark: replaceWatermarkConfig, replaceExport: replaceExportConfig,
    cancelImage: image.cancelPending, cancelWatermark: watermark.cancelPending,
    clearPreviewMessages: () => { setLayoutWarning(null); setPreviewError(null); dismissImageError(); dismissWatermarkError(); dismissExportError() },
  }), [dismissExportError, dismissImageError, dismissWatermarkError, image.cancelPending, image.commitPrepared, replaceExportConfig, replaceFilterConfig, replaceTextConfig, replaceWatermarkConfig, watermark.cancelPending, watermark.commitPrepared])
  const projects = useProjects({ textConfig, filterConfig, watermarkConfig, exportConfig, sourceFile, watermarkFile }, projectTarget,
    isExporting || isImageLoading || isWatermarkLoading)

  const handleWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      if (event.deltaY < 0) zoomIn()
      else zoomOut()
    }
  }

  const handleExport = () => {
    if (!isExportEligible || !originalImage || projects.isBusy) return
    performExport({ originalImage, filterConfig, textConfig, watermarkConfig })
  }

  const handleReset = () => {
    if (isExporting || projects.isBusy || !window.confirm("Reset saved text and editor settings? Your selected image and logo will stay open.")) return
    if (!persistence.clearSavedEditor()) return
    resetTextConfig()
    resetFilterConfig()
    resetWatermarkConfig()
    resetExportConfig()
    projects.detach()
    setLayoutWarning(null)
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
            <div className="w-9 h-9 rounded-full bg-[#1a1814] border border-[#2a2721] flex items-center justify-center shrink-0">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(200, 164, 78, 0.3))' }}>
                <path d="M12 2C7.58 2 4 5.58 4 10v10.5c0 .83 1.01 1.24 1.59.65l1.41-1.4 1.41 1.4c.39.39 1.02.39 1.41 0L12 19.74l2.18 2.41c.39.39 1.02.39 1.41 0l1.41-1.4 1.41 1.4c.58.59 1.59.18 1.59-.65V10c0-4.42-3.58-8-8-8z" fill="#c8a44e"/>
                <circle cx="9.5" cy="11" r="1.5" fill="#0c0b09"/>
                <circle cx="14.5" cy="11" r="1.5" fill="#0c0b09"/>
              </svg>
            </div>
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
          <SidebarSection title="Projects">
            <ProjectsPanel name={projects.projectName} onNameChange={projects.setProjectName} projects={projects.projects}
              activeId={projects.activeId} dirty={projects.isDirty} busy={projects.isBusy}
              blocked={isExporting || isImageLoading || isWatermarkLoading} status={projects.status}
              refreshError={projects.refreshError} onRetryList={() => void projects.retryList()}
              onSave={() => void projects.save()} onSaveAsNew={() => void projects.save(true)}
              onOpen={(id) => void projects.open(id)} onDelete={(id) => void projects.remove(id)} />
          </SidebarSection>

          <SidebarSection title="Image">
            <ImageControls
              image={originalImage}
              fileName={fileName}
              onImageLoad={(file) => { if (!projects.isOpening) loadImage(file) }}
              isLoading={isImageLoading}
              error={imageError}
              onDismissError={dismissImageError}
            />
          </SidebarSection>

          <SidebarSection title="Text">
            <TextEditor
              textConfig={textConfig}
              updateTextConfig={(value) => { if (!projects.isOpening) updateTextConfig(value) }}
              layoutWarning={layoutWarning}
            />
          </SidebarSection>

          <SidebarSection title="Filters">
            <FilterPanel
              filterConfig={filterConfig}
              onSelectFilter={(value) => { if (!projects.isOpening) setFilter(value) }}
              onIntensityChange={(value) => { if (!projects.isOpening) setIntensity(value) }}
              previewImage={originalImage}
            />
          </SidebarSection>

          <SidebarSection title="Watermark">
            <WatermarkEditor
              watermarkConfig={watermarkConfig}
              loadWatermark={(file) => { if (!projects.isOpening) loadWatermark(file) }}
              removeWatermark={() => { if (!projects.isOpening) removeWatermark() }}
              updateWatermarkConfig={(value) => { if (!projects.isOpening) updateWatermarkConfig(value) }}
              isLoading={isWatermarkLoading}
              error={watermarkError}
              onDismissError={dismissWatermarkError}
            />
          </SidebarSection>

          <SidebarSection title="Export">
            <ExportPanel
              exportConfig={exportConfig}
              isExporting={isExporting}
              onUpdateConfig={(value) => { if (!projects.isOpening) updateExportConfig(value) }}
              onExport={handleExport}
              hasImage={originalImage !== null}
              isBlocked={!isExportEligible || projects.isBusy}
              error={exportError}
              onDismissError={dismissExportError}
            />
          </SidebarSection>

          <div className="rounded-md border border-[#2a2721] bg-[#15130f] p-3 text-xs leading-relaxed text-[#9a9484]">
            <p role="status">
              {persistence.status === "saving" && "Saving…"}
              {persistence.status === "restored" && (originalImage || watermarkConfig.image ? "Text and settings restored." : "Text and settings restored. Select your image and logo again.")}
              {persistence.status === "saved" && "Text and settings saved locally."}
              {persistence.status === "unavailable" && "Autosave unavailable. Your current work is still open."}
              {persistence.status === "unsupported" && "This browser has a draft from a newer GhostFrame version. It was left unchanged."}
              {persistence.status === "reset" && "Editor reset. Saved text and settings were removed."}
              {persistence.status === "reset-error" && "Reset failed. Saved data was not fully removed; your current work is still open."}
              {persistence.status === "idle" && "Text and settings stay local to this browser and site."}
            </p>
            <div className="mt-2 flex gap-3">
              {persistence.status === "unavailable" && <button type="button" onClick={persistence.retry} className="text-[#c8a44e]">Retry save</button>}
              <button type="button" onClick={handleReset} disabled={isExporting || projects.isBusy} className="text-[#c8a44e] disabled:cursor-not-allowed disabled:opacity-40">Reset editor</button>
            </div>
          </div>
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
            onLayoutWarning={setLayoutWarning}
            onRenderError={handleRenderError}
          />
        ) : (
          <DropZone onImageLoad={(file) => { if (!projects.isOpening) loadImage(file) }} isLoading={isImageLoading} error={imageError} onDismissError={dismissImageError} />
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
