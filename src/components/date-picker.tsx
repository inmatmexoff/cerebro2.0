"use client"

import * as React from "react"
import AirDatepicker from 'air-datepicker'
import localeEs from 'air-datepicker/locale/es'

import { cn } from "@/lib/utils"

export function DatePicker() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dpInstance = React.useRef<AirDatepicker|null>(null);
  const [date, setDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (inputRef.current && !dpInstance.current) {
        dpInstance.current = new AirDatepicker(inputRef.current, {
            locale: localeEs,
            autoClose: true,
            dateFormat: (date) => {
              if (!date || Array.isArray(date)) {
                return '';
              }
              const day = date.getDate();
              const month = localeEs.months[date.getMonth()];
              const year = date.getFullYear();
              return `${day} de ${month} de ${year}`;
            },
            onSelect: ({date}) => {
                setDate(date as Date);
            }
        });
    }

    // Cleanup function
    return () => {
        if (dpInstance.current) {
            dpInstance.current.destroy();
            dpInstance.current = null;
        }
    }
  }, []);

  return (
    <input
      ref={inputRef}
      readOnly
      placeholder="&nbsp;"
      className={cn(
        "bg-black/20 text-white border-none rounded-full text-center h-10 w-full justify-center font-normal hover:bg-black/30 hover:text-white cursor-pointer",
        !date && "text-white/80"
      )}
    />
  )
}
