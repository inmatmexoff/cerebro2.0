"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function CompanySelect() {
  const [value, setValue] = React.useState<string>()

  return (
    <div className="flex-1">
        <Select onValueChange={setValue} value={value}>
        <SelectTrigger
            className={cn(
              "bg-black/20 border-none rounded-full h-12 w-full px-4 font-normal hover:bg-black/30 focus-visible:ring-0 focus-visible:ring-offset-0",
              !value ? "text-white/80" : "text-white"
            )}
        >
            <SelectValue placeholder="Empresa" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="mtm">MTM</SelectItem>
            <SelectItem value="tal">TAL</SelectItem>
            <SelectItem value="domeska">DOMESKA</SelectItem>
            <SelectItem value="hogarden">HOGARDEN</SelectItem>
            <SelectItem value="palo-de-rosa">PALO DE ROSA</SelectItem>
        </SelectContent>
        </Select>
    </div>
  )
}
