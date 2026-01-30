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

export function CompanySelect({ value, onValueChange }: { value?: string, onValueChange: (value: string) => void }) {
  return (
    <div className="w-full">
        <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger>
            <SelectValue placeholder="Seleccionar empresa" />
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
