import SidebarSection from "./SidebarSection"

function Layout() {
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
            <p className="text-sm text-gray-500">Upload your base image</p>
          </SidebarSection>

          <SidebarSection title="Text">
            <p className="text-sm text-gray-500">Configure your quote text</p>
          </SidebarSection>

          <SidebarSection title="Filters">
            <p className="text-sm text-gray-500">Apply visual filters</p>
          </SidebarSection>

          <SidebarSection title="Watermark">
            <p className="text-sm text-gray-500">Add your logo</p>
          </SidebarSection>

          <SidebarSection title="Export">
            <p className="text-sm text-gray-500">Download your creation</p>
          </SidebarSection>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#111111] p-8">
        <div className="flex aspect-square w-full max-w-[600px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-600">
          <span className="text-6xl">📷</span>
          <p className="mt-4 text-sm text-gray-400">
            Drop your image here or click to upload
          </p>
        </div>
      </main>
    </div>
  )
}

export default Layout
