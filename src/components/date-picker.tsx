"use client"

import * as React from "react"
import AirDatepicker from 'air-datepicker'
import localeEs from 'air-datepicker/locale/es'

import { cn } from "@/lib/utils"

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const localInputRef = React.useRef<HTMLInputElement | null>(null);
    const dpInstanceRef = React.useRef<AirDatepicker | null>(null);
    const onChangeRef = React.useRef(onChange);

    const combinedRef = React.useCallback((node: HTMLInputElement | null) => {
      localInputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    onChangeRef.current = onChange;

    React.useEffect(() => {
      if (localInputRef.current) {
        dpInstanceRef.current = new AirDatepicker(localInputRef.current, {
          locale: localeEs,
          autoClose: true,
          onSelect: ({ date }) => {
            onChangeRef.current(date as Date | null);
          },
        });
      }
      return () => {
        dpInstanceRef.current?.destroy();
        dpInstanceRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

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
      if (localInputRef.current && !value) {
        localInputRef.current.value = '';
      }
    }, [value]);

    return (
      <input
        ref={combinedRef}
        readOnly
        placeholder="Seleccionar fecha"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          "cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
