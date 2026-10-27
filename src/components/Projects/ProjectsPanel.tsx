import type { ProjectSummary } from "../../state/projectStorage"

interface Props {
  name: string; onNameChange: (name: string) => void; projects: ProjectSummary[]; activeId: string | null
  dirty: boolean; busy: boolean; blocked: boolean; status: string
  refreshError: string | null; onRetryList: () => void
  onSave: () => void; onSaveAsNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void
}

export default function ProjectsPanel(props: Props) {
  const disabled = props.busy || props.blocked
  return <div className="flex flex-col gap-3">
    <label className="flex flex-col gap-1 text-xs text-[#9a9484]">Project name
      <input aria-label="Project name" value={props.name} onChange={(event) => props.onNameChange(event.target.value)} disabled={disabled}
        className="rounded border border-[#2a2721] bg-[#1a1814] px-2 py-1.5 text-sm text-[#e8e2d6] disabled:opacity-40" />
    </label>
    <div className="flex gap-3">
      <button type="button" onClick={props.onSave} disabled={disabled} className="text-xs text-[#c8a44e] disabled:opacity-40">Save project</button>
      {props.activeId && <button type="button" onClick={props.onSaveAsNew} disabled={disabled} className="text-xs text-[#c8a44e] disabled:opacity-40">Save as new</button>}
    </div>
    <p aria-live="polite" className="text-xs text-[#9a9484]">{props.busy ? props.status : props.dirty ? `Unsaved changes. ${props.status}` : props.status}</p>
    {props.refreshError && <button type="button" onClick={props.onRetryList} disabled={props.busy} className="w-fit text-xs text-[#c8a44e] disabled:opacity-40">Retry project list</button>}
    <ul aria-label="Saved projects" className="flex flex-col gap-2">
      {props.projects.map((project) => <li key={project.id} className="rounded border border-[#2a2721] p-2">
        <div className="truncate text-sm text-[#e8e2d6]">{project.name}{project.id === props.activeId ? " (open)" : ""}</div>
        <time dateTime={project.updatedAt} className="text-[11px] text-[#6b6559]">{new Date(project.updatedAt).toLocaleDateString()}</time>
        <div className="mt-1 flex gap-3">
          <button type="button" onClick={() => props.onOpen(project.id)} disabled={disabled} aria-label={`Open ${project.name}`} className="text-xs text-[#c8a44e] disabled:opacity-40">Open</button>
          <button type="button" onClick={() => props.onDelete(project.id)} disabled={disabled} aria-label={`Delete ${project.name}`} className="text-xs text-[#c45b4f] disabled:opacity-40">Delete</button>
        </div>
      </li>)}
    </ul>
    <p className="text-[11px] leading-relaxed text-[#6b6559]">Browser-local projects are not a backup. Clearing site data or browser eviction can remove them.</p>
  </div>
}
