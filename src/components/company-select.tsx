"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CompanySelect({ value, onValueChange }: { value?: string, onValueChange: (value: string) => void }) {
  return (
    <div className="w-full">
        <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger>
            <SelectValue placeholder="Seleccionar empresa" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            <SelectItem value="inmatmex">Inmatmex</SelectItem>
            <SelectItem value="tal-comercializadora">TAL COMERCIALIZADORA</SelectItem>
            <SelectItem value="do-meska">DO MESKA</SelectItem>
        </SelectContent>
        </Select>
    </div>
  )
}
