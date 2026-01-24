'use client'

import { Button } from "@/components/ui/button"
import { FaBars } from "react-icons/fa6";
import { FiDownloadCloud } from "react-icons/fi";

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-x-4">
        <Button variant="ghost" size="icon" className="h-24 w-24 hover:bg-transparent">
            <FaBars className="h-16 w-16 text-gray-600" />
        </Button>
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button className="h-24 w-24 bg-[#BABE65] hover:bg-[#A9AD5A] rounded-2xl">
        <FiDownloadCloud className="h-16 w-16 text-gray-700" />
      </Button>
    </header>
  )
}
