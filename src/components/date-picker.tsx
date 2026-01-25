"use client"

import * as React from "react"
import AirDatepicker from 'air-datepicker'
import localeEs from 'air-datepicker/locale/es'
import { useSidebar } from "@/components/ui/sidebar"

import { cn } from "@/lib/utils"

export function DatePicker() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dpInstance = React.useRef<AirDatepicker|null>(null);
  const [date, setDate] = React.useState<Date | null>(null);
  const { state } = useSidebar();

  React.useEffect(() => {
    const dateFormat = (d: Date | Date[]) => {
      if (!d || Array.isArray(d)) {
        return '';
      }

      if (state === 'expanded') {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      } else {
        const day = d.getDate();
        const month = localeEs.months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} de ${month} de ${year}`;
      }
    };
    
    if (inputRef.current) {
      if (!dpInstance.current) {
        dpInstance.current = new AirDatepicker(inputRef.current, {
            locale: localeEs,
            autoClose: true,
            dateFormat: dateFormat,
            onSelect: ({date: newDate}) => {
                setDate(newDate as Date);
            }
        });
      } else {
        dpInstance.current.update({ dateFormat });
        if (date) {
            inputRef.current.value = dateFormat(date);
        }
      }
    }
  }, [state]);

  React.useEffect(() => {
    if (dpInstance.current && inputRef.current) {
        if(date) {
            inputRef.current.value = dpInstance.current.opts.dateFormat(date) as string;
        } else {
            inputRef.current.value = '';
        }
    }
  }, [date]);

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
