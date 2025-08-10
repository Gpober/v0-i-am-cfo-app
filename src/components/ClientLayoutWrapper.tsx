import Sidebar from "./Sidebar"
import SidebarProvider from "./SidebarProvider"

const ClientLayoutWrapper = () => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="group/hover">
        <Sidebar
          collapsible="offcanvas"
          className="group-hover/hover:translate-x-0 transition-transform duration-200 ease-in-out"
        >
          {/* existing sidebar content */}
        </Sidebar>
        <div className="fixed left-0 top-0 w-4 h-full z-50 group-hover/hover:w-0 transition-all duration-200" />
      </div>
      {/* rest of code here */}
    </SidebarProvider>
  )
}

export default ClientLayoutWrapper
