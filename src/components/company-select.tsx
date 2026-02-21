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
            <SelectItem value="INMATMEX">Inmatmex</SelectItem>
            <SelectItem value="TAL COMERCIALIZADORA">TAL COMERCIALIZADORA</SelectItem>
            <SelectItem value="DO MESKA">DO MESKA</SelectItem>
            <SelectItem value="HOGARDEN">Hogarden</SelectItem>
            <SelectItem value="PALO DE ROSA">Palo de Rosa</SelectItem>
            <SelectItem value="MTM">MTM</SelectItem>
        </SelectContent>
        </Select>
    </div>
  )
}
