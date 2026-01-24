'use client'

import { Button } from "@/components/ui/button"
import { FaBars } from "react-icons/fa6";
import { FiDownloadCloud } from "react-icons/fi";

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-x-4">
        <Button variant="ghost" className="hover:bg-transparent">
          <FaBars size={32} className="text-primary" />
        </Button>
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button variant="outline" size="icon">
        <FiDownloadCloud size={20} className="text-gray-700" />
      </Button>
    </header>
  )
}
