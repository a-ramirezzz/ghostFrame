import type { ReactNode } from "react"

interface SidebarSectionProps {
  title: string
  children: ReactNode
}

function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-medium tracking-wider text-[#9a9484]">
        <span className="mr-2 inline-block h-3 w-1 rounded-full bg-[#c8a44e] opacity-40" />
        {title}
      </h2>
      {children}
    </div>
  )
}

export default SidebarSection
