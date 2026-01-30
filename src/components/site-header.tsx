'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react";
import { SidebarTrigger } from "./ui/sidebar";

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-x-4">
        <SidebarTrigger className="bg-transparent text-foreground hover:bg-transparent h-12 w-12 [&_svg]:h-6 [&_svg]:w-6" />
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button>
        <Download className="mr-2 h-4 w-4" />
        <span>Exportar</span>
      </Button>
    </header>
  )
}
