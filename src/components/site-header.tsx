'use client'

import { Button } from "@/components/ui/button"
import { Download, Menu } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-x-4">
        <Button variant="ghost" size="icon" className="h-14 w-14 hover:bg-transparent">
            <Menu className="h-12 w-12 text-gray-600" />
        </Button>
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button variant="ghost" size="icon" className="h-12 w-12">
        <Download className="h-10 w-10 text-gray-600" />
      </Button>
    </header>
  )
}
