"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({ placeholder }: { placeholder: string }) {
  const [date, setDate] = React.useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "bg-black/20 text-white placeholder:text-white/80 border-none rounded-full text-center h-12 flex-1 justify-center font-normal hover:bg-black/30 hover:text-white",
            !date && "text-white/80"
          )}
        >
          {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: es }) : <span>{placeholder}</span>}
          <CalendarIcon className="ml-2 h-4 w-4 text-white/80" />
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
