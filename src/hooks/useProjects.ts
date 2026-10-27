import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ExportConfig, FilterConfig, TextConfig, WatermarkConfig } from "../types"
import { prepareImageAsset, type ImageAssetPreparation, type PreparedImageAsset } from "../utils/imageAsset"
import { MAIN_IMAGE_TYPES, WATERMARK_TYPES } from "../utils/imageLoading"
import { defaultEditorSnapshot, type EditorSnapshot } from "../state/editorPersistence"
import { deleteProject, listProjects, readProject, saveProject, type ProjectRecord, type ProjectSummary } from "../state/projectStorage"

interface ProjectEditor { textConfig: TextConfig; filterConfig: FilterConfig; watermarkConfig: WatermarkConfig; exportConfig: ExportConfig; sourceFile: File | null; watermarkFile: File | null }
interface ApplyTarget {
  commitImage: (asset: PreparedImageAsset) => void; commitWatermark: (asset: PreparedImageAsset | null) => void
  replaceText: (value: TextConfig) => void; replaceFilter: (value: FilterConfig) => void
  replaceWatermark: (value: Omit<WatermarkConfig, "image">) => void; replaceExport: (value: ExportConfig) => void
  cancelImage: () => void; cancelWatermark: () => void; clearPreviewMessages: () => void
}
const snapshotOf = (data: ProjectEditor): EditorSnapshot => ({ version: 1, text: { ...data.textConfig }, filter: { ...data.filterConfig }, watermark: { opacity: data.watermarkConfig.opacity, size: data.watermarkConfig.size, position: data.watermarkConfig.position }, export: { ...data.exportConfig } })
const fileIds = new WeakMap<File, number>(); let nextFileId = 1
const fileIdentity = (file: File | null) => { if (!file) return null; let id = fileIds.get(file); if (!id) { id = nextFileId++; fileIds.set(file, id) }; return id }
const signature = (name: string, data: ProjectEditor) => JSON.stringify({ name: name.trim(), editor: snapshotOf(data), source: fileIdentity(data.sourceFile), watermark: fileIdentity(data.watermarkFile) })
const pristineSignature = JSON.stringify({ name: "", editor: defaultEditorSnapshot(), source: null, watermark: null })
const newId = () => globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}-${Math.random().toString(36).slice(2)}`
const message = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

export default function useProjects(data: ProjectEditor, target: ApplyTarget, mutationsBlocked: boolean) {
  const [projectName, setProjectNameState] = useState(""); const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null); const [baseline, setBaseline] = useState(pristineSignature)
  const [status, setStatus] = useState("Projects stay only in this browser. Clearing site data may remove them.")
  const [refreshError, setRefreshError] = useState<string | null>(null); const [isBusy, setIsBusy] = useState(false); const [isOpening, setIsOpening] = useState(false)
  const operationRef = useRef(0); const refreshRef = useRef(0); const mountedRef = useRef(false); const lockRef = useRef<number | null>(null)
  const latestRef = useRef({ data, projectName }); const preparationsRef = useRef<ImageAssetPreparation[]>([])
  useLayoutEffect(() => { latestRef.current = { data, projectName } }, [data, projectName])
  const currentSignature = useMemo(() => signature(projectName, data), [data, projectName]); const isDirty = currentSignature !== baseline
  const eligible = useCallback(() => mountedRef.current && lockRef.current === null && !mutationsBlocked, [mutationsBlocked])

  const refresh = useCallback(async () => {
    const request = ++refreshRef.current
    try { const items = await listProjects(); if (mountedRef.current && request === refreshRef.current) { setProjects(items); setRefreshError(null) } }
    catch (error) { if (mountedRef.current && request === refreshRef.current) setRefreshError(message(error, "Saved projects are unavailable.")) }
  }, [])
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- IndexedDB bootstrap must begin after commit; refresh rejects stale completion.
    mountedRef.current = true; void refresh()
    return () => { mountedRef.current = false; operationRef.current += 1; refreshRef.current += 1; lockRef.current = null; for (const preparation of preparationsRef.current) preparation.cancel(); preparationsRef.current = [] }
  }, [refresh])
  const setProjectName = useCallback((name: string) => { if (mountedRef.current && !isOpening) setProjectNameState(name) }, [isOpening])

  const save = useCallback(async (asNew = false) => {
    if (!eligible()) return
    const captured = latestRef.current; const name = captured.projectName.trim()
    if (!captured.data.sourceFile) { setStatus("Select a valid main image before saving a project."); return }
    if (!name) { setStatus("Enter a project name before saving."); return }
    const operation = ++operationRef.current; lockRef.current = operation; setIsBusy(true); setStatus("Saving project…")
    const id = asNew || !activeId ? newId() : activeId; const existing = !asNew && activeId ? projects.find((item) => item.id === activeId) : undefined; const now = new Date().toISOString()
    const capturedSignature = signature(name, captured.data)
    const record: ProjectRecord = { id, version: 1, name, createdAt: existing?.createdAt ?? now, updatedAt: now, editor: snapshotOf(captured.data), source: captured.data.sourceFile, sourceFileName: captured.data.sourceFile.name, watermark: captured.data.watermarkFile, watermarkFileName: captured.data.watermarkFile?.name ?? null }
    try {
      const committed = await saveProject(record)
      if (!mountedRef.current || lockRef.current !== operation) return
      setActiveId(id); setBaseline(capturedSignature); setProjects((items) => [{ id, name, createdAt: committed.createdAt, updatedAt: committed.updatedAt }, ...items.filter((item) => item.id !== id)])
      setStatus(signature(latestRef.current.projectName, latestRef.current.data) === capturedSignature ? "Project saved." : "Project saved. You have newer unsaved changes."); void refresh()
    } catch (error) { if (mountedRef.current && lockRef.current === operation) setStatus(message(error, "The project could not be saved.")) }
    finally { if (lockRef.current === operation) { lockRef.current = null; if (mountedRef.current) setIsBusy(false) } }
  }, [activeId, eligible, projects, refresh])

  const open = useCallback(async (id: string) => {
    if (!eligible()) return
    if (isDirty && !window.confirm("Open another project and discard your unsaved changes?")) return
    const beforeOpen = signature(latestRef.current.projectName, latestRef.current.data); const operation = ++operationRef.current
    lockRef.current = operation; setIsBusy(true); setIsOpening(true); setStatus("Opening project…")
    let main: PreparedImageAsset | null = null; let logo: PreparedImageAsset | null = null
    try {
      const record = await readProject(id); if (!mountedRef.current || lockRef.current !== operation) return
      const sourceFile = new File([record.source], record.sourceFileName, { type: record.source.type }); const logoFile = record.watermark ? new File([record.watermark], record.watermarkFileName!, { type: record.watermark.type }) : null
      const mainTask = prepareImageAsset(sourceFile, MAIN_IMAGE_TYPES)
      let logoTask: ImageAssetPreparation | null = null
      try { logoTask = logoFile ? prepareImageAsset(logoFile, WATERMARK_TYPES) : null }
      catch (error) { mainTask.cancel(); await mainTask.catch(() => undefined); throw error }
      preparationsRef.current = logoTask ? [mainTask, logoTask] : [mainTask]
      const coordinatedMain = mainTask.catch((error) => { logoTask?.cancel(); throw error })
      const coordinatedLogo = logoTask ? logoTask.catch((error) => { mainTask.cancel(); throw error }) : Promise.resolve(null)
      const prepared = await Promise.allSettled([coordinatedMain, coordinatedLogo, document.fonts.ready]); preparationsRef.current = []
      if (prepared[0].status === "fulfilled") main = prepared[0].value; if (prepared[1].status === "fulfilled") logo = prepared[1].value
      const failure = prepared.find((item) => item.status === "rejected"); if (failure?.status === "rejected") throw failure.reason
      if (!main) throw new Error("This saved project has no valid main image.")
      if (!mountedRef.current || lockRef.current !== operation) { main.dispose(); logo?.dispose(); return }
      const intervening = signature(latestRef.current.projectName, latestRef.current.data) !== beforeOpen
      if (intervening && !window.confirm("Your editor changed while the project was opening. Discard those newer changes?")) { main.dispose(); logo?.dispose(); main = null; logo = null; setStatus("Project open cancelled. Your current work is unchanged."); return }
      target.cancelImage(); target.cancelWatermark(); target.replaceText(record.editor.text); target.replaceFilter(record.editor.filter); target.replaceWatermark(record.editor.watermark); target.replaceExport(record.editor.export)
      target.commitImage(main); target.commitWatermark(logo); target.clearPreviewMessages()
      const applied: ProjectEditor = { textConfig: record.editor.text, filterConfig: record.editor.filter, watermarkConfig: { ...record.editor.watermark, image: logo?.image ?? null }, exportConfig: record.editor.export, sourceFile, watermarkFile: logoFile }
      setProjectNameState(record.name); setActiveId(record.id); setBaseline(signature(record.name, applied)); setStatus("Project opened."); main = null; logo = null
    } catch (error) { main?.dispose(); logo?.dispose(); if (mountedRef.current && lockRef.current === operation) setStatus(message(error, "The project could not be opened. Your current work is unchanged.")) }
    finally { preparationsRef.current = []; if (lockRef.current === operation) { lockRef.current = null; if (mountedRef.current) { setIsBusy(false); setIsOpening(false) } } }
  }, [eligible, isDirty, target])

  const remove = useCallback(async (id: string) => {
    if (!eligible() || !window.confirm("Delete this saved project? This cannot be undone.")) return
    const operation = ++operationRef.current; lockRef.current = operation; setIsBusy(true); setStatus("Deleting project…")
    try { await deleteProject(id); if (!mountedRef.current || lockRef.current !== operation) return; if (activeId === id) { setActiveId(null); setBaseline(pristineSignature) }; setProjects((items) => items.filter((item) => item.id !== id)); setStatus("Project deleted. The current composition remains open."); void refresh() }
    catch (error) { if (mountedRef.current && lockRef.current === operation) setStatus(message(error, "The project could not be deleted.")) }
    finally { if (lockRef.current === operation) { lockRef.current = null; if (mountedRef.current) setIsBusy(false) } }
  }, [activeId, eligible, refresh])
  const detach = useCallback(() => { if (!eligible()) return; setActiveId(null); setBaseline(pristineSignature); setStatus("Editor detached from the saved project.") }, [eligible])
  return { projectName, setProjectName, projects, activeId, isDirty, isBusy, isOpening, status: refreshError ? `${status} Project list refresh failed: ${refreshError}` : status, refreshError, retryList: refresh, save, open, remove, detach }
}
