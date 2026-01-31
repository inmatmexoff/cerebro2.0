'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react";
import { SidebarTrigger } from "./ui/sidebar";

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-6 sm:mb-8">
      <div className="flex items-center gap-x-2">
        <SidebarTrigger className="bg-transparent text-foreground hover:bg-transparent h-8 w-8 [&_svg]:h-5 [&_svg]:w-5" />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button size="sm" className="w-9 px-0 sm:w-auto sm:px-3">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">Exportar</span>
      </Button>
    </header>
  )
}
