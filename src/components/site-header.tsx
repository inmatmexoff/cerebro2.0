'use client'

import { Button } from "@/components/ui/button"
import { FiDownloadCloud } from "react-icons/fi";
import { SidebarTrigger } from "./ui/sidebar";

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-x-4">
        <SidebarTrigger className="bg-accent text-foreground border-2 border-primary h-12 w-12 hover:bg-accent rounded-full [&_svg]:h-6 [&_svg]:w-6" />
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-transparent w-20 h-20 [&_svg]:!w-auto [&_svg]:!h-auto"
      >
        <FiDownloadCloud style={{ color: '#137547', width: '40px', height: '40px' }}/>
      </Button>
    </header>
  )
}
