"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker() {
  const [date, setDate] = React.useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "bg-black/20 text-white border-none rounded-full text-center h-10 w-full justify-center font-normal hover:bg-black/30 hover:text-white",
            !date && "text-white/80"
          )}
        >
          {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: es }) : <span>&nbsp;</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}
