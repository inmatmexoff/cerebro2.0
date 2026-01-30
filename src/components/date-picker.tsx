"use client"

import * as React from "react"
import AirDatepicker from 'air-datepicker'
import localeEs from 'air-datepicker/locale/es'

import { cn } from "@/lib/utils"

export function DatePicker({ value, onChange, id }: { value: Date | null, onChange: (date: Date | null) => void, id?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dpInstanceRef = React.useRef<AirDatepicker|null>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      dpInstanceRef.current = new AirDatepicker(inputRef.current, {
        locale: localeEs,
        autoClose: true,
        onSelect: ({ date }) => {
          onChange(date as Date | null);
        },
      });
    }
    return () => {
      dpInstanceRef.current?.destroy();
      dpInstanceRef.current = null;
    };
  }, [onChange]);

  const dateFormat = React.useCallback((d: Date | Date[]) => {
    if (!d || Array.isArray(d)) {
      return '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;

  }, []);
  
  React.useEffect(() => {
    const dp = dpInstanceRef.current;
    if (!dp) return;
    
    dp.update({ dateFormat });

    if (value) {
      const selectedDate = dp.selectedDates[0];
      if (!selectedDate || selectedDate.getTime() !== value.getTime()) {
        dp.selectDate(value, true);
      }
    } else {
      dp.clear();
    }
  }, [value, dateFormat]);

  React.useEffect(() => {
    if (inputRef.current && !value) {
      inputRef.current.value = '';
    }
  }, [value]);

  return (
    <input
      id={id}
      ref={inputRef}
      readOnly
      placeholder="Seleccionar fecha"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-muted-foreground",
        "cursor-pointer"
      )}
    />
  )
}
