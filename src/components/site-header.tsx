'use client'

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, ArrowDownCircle } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="flex justify-between items-center mb-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="w-16 h-16">
            <Menu className="w-12 h-12 text-gray-800" strokeWidth={2.5} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
            {/* Navbar content goes here */}
        </SheetContent>
      </Sheet>
      <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
      <Button
        variant="ghost"
        size="icon"
        className="text-primary border-2 border-primary rounded-full w-12 h-12"
      >
        <ArrowDownCircle className="w-8 h-8" />
      </Button>
    </header>
  )
}
