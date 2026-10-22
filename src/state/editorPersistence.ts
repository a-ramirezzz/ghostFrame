import { AVAILABLE_FILTERS, AVAILABLE_FONTS, type ExportConfig, type FilterConfig, type TextConfig, type WatermarkConfig } from "../types"
import { DEFAULT_EXPORT_CONFIG, DEFAULT_FILTER_CONFIG, DEFAULT_TEXT_CONFIG, DEFAULT_WATERMARK_CONFIG } from "./editorDefaults"

export const EDITOR_STORAGE_KEY = "ghostframe.editor"
export const LEGACY_PAGE_NAME_KEY = "ghostframe_pageName"
export const EDITOR_SCHEMA_VERSION = 1

export function getLocalStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage } catch { return null }
}

export interface EditorSnapshot {
  version: 1
  text: TextConfig
  filter: FilterConfig
  watermark: Omit<WatermarkConfig, "image">
  export: ExportConfig
}

export interface LoadedEditorSnapshot {
  snapshot: EditorSnapshot
  restored: boolean
  unsupportedVersion: boolean
  storageUnavailable: boolean
  legacyMigrationPending: boolean
}

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
const string = (source: Record<string, unknown> | null, key: string, fallback: string) =>
  source && own(source, key) && typeof source[key] === "string" ? source[key] as string : fallback
const boolean = (source: Record<string, unknown> | null, key: string, fallback: boolean) =>
  source && own(source, key) && typeof source[key] === "boolean" ? source[key] as boolean : fallback
const number = (source: Record<string, unknown> | null, key: string, fallback: number, min: number, max: number) => {
  const value = source?.[key]
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : fallback
}
const member = <T extends string>(source: Record<string, unknown> | null, key: string, values: readonly T[], fallback: T) =>
  source && typeof source[key] === "string" && values.includes(source[key] as T) ? source[key] as T : fallback
const color = (source: Record<string, unknown> | null, key: string, fallback: string) => {
  const value = source?.[key]
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

export function defaultEditorSnapshot(): EditorSnapshot {
  return {
    version: EDITOR_SCHEMA_VERSION,
    text: { ...DEFAULT_TEXT_CONFIG },
    filter: { ...DEFAULT_FILTER_CONFIG },
    watermark: { ...DEFAULT_WATERMARK_CONFIG },
    export: { ...DEFAULT_EXPORT_CONFIG },
  }
}

export function validateEditorSnapshot(value: unknown): EditorSnapshot | null {
  const root = object(value)
  if (!root || root.version !== EDITOR_SCHEMA_VERSION) return null
  const defaults = defaultEditorSnapshot()
  const text = object(root.text), filter = object(root.filter), watermark = object(root.watermark), output = object(root.export)
  return {
    version: EDITOR_SCHEMA_VERSION,
    text: {
      content: string(text, "content", defaults.text.content), author: string(text, "author", defaults.text.author),
      pageName: string(text, "pageName", defaults.text.pageName),
      fontFamily: member(text, "fontFamily", AVAILABLE_FONTS.map(({ name }) => name), defaults.text.fontFamily),
      fontSize: number(text, "fontSize", defaults.text.fontSize, 16, 72), color: color(text, "color", defaults.text.color),
      position: member(text, "position", ["top", "center", "bottom"], defaults.text.position),
      alignment: member(text, "alignment", ["left", "center", "right"], defaults.text.alignment),
      showOverlay: boolean(text, "showOverlay", defaults.text.showOverlay),
      overlayOpacity: number(text, "overlayOpacity", defaults.text.overlayOpacity, 0.1, 0.9),
      accentColor: color(text, "accentColor", defaults.text.accentColor), showFrame: boolean(text, "showFrame", defaults.text.showFrame),
    },
    filter: {
      active: member(filter, "active", AVAILABLE_FILTERS.map(({ name }) => name), defaults.filter.active),
      intensity: number(filter, "intensity", defaults.filter.intensity, 0, 1),
    },
    watermark: {
      opacity: number(watermark, "opacity", defaults.watermark.opacity, 0.05, 0.5),
      size: number(watermark, "size", defaults.watermark.size, 5, 30),
      position: member(watermark, "position", ["bottom-right", "bottom-left", "top-right", "top-left", "center"], defaults.watermark.position),
    },
    export: {
      resolution: member(output, "resolution", ["low", "medium", "high"], defaults.export.resolution),
      format: member(output, "format", ["image/jpeg", "image/png"], defaults.export.format),
      quality: number(output, "quality", defaults.export.quality, 0.5, 1),
    },
  }
}

export function serializeEditorSnapshot(snapshot: EditorSnapshot) { return JSON.stringify(snapshot) }

export function loadEditorSnapshot(storage: Pick<Storage, "getItem"> | null = getLocalStorage()): LoadedEditorSnapshot {
  const fallback = defaultEditorSnapshot()
  if (!storage) return { snapshot: fallback, restored: false, unsupportedVersion: false, storageUnavailable: true, legacyMigrationPending: false }
  try {
    const raw = storage.getItem(EDITOR_STORAGE_KEY)
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw)
        const root = object(parsed)
        if (root && typeof root.version === "number" && root.version > EDITOR_SCHEMA_VERSION)
          return { snapshot: fallback, restored: false, unsupportedVersion: true, storageUnavailable: false, legacyMigrationPending: false }
        const validated = validateEditorSnapshot(parsed)
        if (validated) return { snapshot: validated, restored: true, unsupportedVersion: false, storageUnavailable: false, legacyMigrationPending: false }
      } catch { /* Recover a legacy page name below. */ }
    }
    const legacy = storage.getItem(LEGACY_PAGE_NAME_KEY)
    if (legacy !== null) {
      fallback.text.pageName = legacy
      return { snapshot: fallback, restored: true, unsupportedVersion: false, storageUnavailable: false, legacyMigrationPending: true }
    }
    return { snapshot: fallback, restored: false, unsupportedVersion: false, storageUnavailable: false, legacyMigrationPending: false }
  } catch {
    return { snapshot: fallback, restored: false, unsupportedVersion: false, storageUnavailable: true, legacyMigrationPending: false }
  }
}

export function writeEditorSnapshot(storage: Pick<Storage, "setItem">, snapshot: EditorSnapshot) {
  storage.setItem(EDITOR_STORAGE_KEY, serializeEditorSnapshot(snapshot))
}
