'use client'

import { Button } from "@/components/ui/button"
import { FaBars } from "react-icons/fa6";
import { FiDownloadCloud } from "react-icons/fi";

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-x-4">
      <Button
  variant="ghost"
  className="hover:bg-transparent [&_svg]:!w-auto [&_svg]:!h-auto"
>
  <FaBars className="text-[40px] text-[#137547]" />
</Button>

        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <Button
  variant="ghost"
  size="icon"
  className="hover:bg-transparent w-20 h-20 [&_svg]:!w-auto [&_svg]:!h-auto"
>
  <FiDownloadCloud className="text-[40px] text-[#137547]" />
</Button>


    </header>
  )
}
