import type { ReactNode } from "react"

interface SidebarSectionProps {
  title: string
  children: ReactNode
}

function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h2>
      {children}
    </div>
  )
}

export default SidebarSection
