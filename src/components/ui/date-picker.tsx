"use client"

import * as React from "react"
import AirDatepicker from 'air-datepicker'
import localeEs from 'air-datepicker/locale/es'

import { cn } from "@/lib/utils"

export function DatePicker({ value, onChange, id }: { value: Date | null, onChange: (date: Date | null) => void, id?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dpInstanceRef = React.useRef<AirDatepicker|null>(null);
  const onChangeRef = React.useRef(onChange);

  onChangeRef.current = onChange;

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
    if (inputRef.current) {
      dpInstanceRef.current = new AirDatepicker(inputRef.current, {
        locale: localeEs,
        autoClose: true,
        onSelect: ({ date }) => {
          onChangeRef.current(date as Date | null);
        },
        dateFormat: dateFormat,
      });
    }
    return () => {
      dpInstanceRef.current?.destroy();
      dpInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFormat]);
  
  React.useEffect(() => {
    const dp = dpInstanceRef.current;
    if (!dp) return;
    
    if (value) {
      const selectedDate = dp.selectedDates[0];
      if (!selectedDate || selectedDate.getTime() !== value.getTime()) {
        dp.selectDate(value, true);
      }
    } else {
       if (dp.selectedDates.length > 0) {
           dp.clear();
        }
    }
  }, [value]);

  return (
    <input
      id={id}
      ref={inputRef}
      readOnly
      placeholder="Seleccionar fecha"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-muted-foreground",
        "cursor-pointer"
      )}
    />
  )
}
