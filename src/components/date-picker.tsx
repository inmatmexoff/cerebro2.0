"use client"

import * as React from "react"
import AirDatepicker from 'air-datepicker'
import localeEs from 'air-datepicker/locale/es'
import { useSidebar } from "@/components/ui/sidebar"

import { cn } from "@/lib/utils"

export function DatePicker({ value, onChange }: { value: Date | null, onChange: (date: Date | null) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dpInstance = React.useRef<AirDatepicker|null>(null);
  const { state } = useSidebar();

  const dateFormat = React.useCallback((d: Date | Date[]) => {
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
  }, [state]);
  
  React.useEffect(() => {
    if (inputRef.current) {
        if (!dpInstance.current) {
            dpInstance.current = new AirDatepicker(inputRef.current, {
                locale: localeEs,
                autoClose: true,
                onSelect: ({date}) => {
                    onChange(date as Date | null);
                }
            });
        }
        
        dpInstance.current.update({ dateFormat });

        if (value) {
            dpInstance.current.selectDate(value, true);
        } else {
            dpInstance.current.clear();
        }
    }
  }, [value, onChange, dateFormat]);

  React.useEffect(() => {
    if (inputRef.current && !value) {
      inputRef.current.value = '';
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      readOnly
      placeholder="&nbsp;"
      className={cn(
        "bg-black/20 text-white border-none rounded-full text-center h-10 w-full justify-center font-normal hover:bg-black/30 hover:text-white cursor-pointer",
        !value && "text-white/80"
      )}
    />
  )
}
