'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import AirDatepicker from 'air-datepicker';
import localeEs from 'air-datepicker/locale/es';

type ReturnData = {
    day: string;
    count: number;
};

export default function CalendarioDevolucionesPage() {
    const [data, setData] = useState<ReturnData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);
    const datepickerRef = useRef<AirDatepicker|null>(null);

    // Helper to get YYYY-MM-DD from a Date object, respecting local timezone
    const dateToDayString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    useEffect(() => {
        const fetchReturnDates = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch a wide range to allow for month navigation in the calendar
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const threeMonthsForward = new Date();
                threeMonthsForward.setMonth(threeMonthsForward.getMonth() + 3);

                const { data: returnsData, error } = await supabasePROD
                    .from('devoluciones_ml')
                    .select('fecha_status')
                    .not('fecha_status', 'is', null)
                    .gte('fecha_status', threeMonthsAgo.toISOString())
                    .lte('fecha_status', threeMonthsForward.toISOString());

                if (error) {
                    throw error;
                }

                if (returnsData) {
                    const counts: { [key: string]: number } = returnsData.reduce((acc, curr) => {
                        if(curr.fecha_status) {
                            const date = new Date(curr.fecha_status);
                            const day = dateToDayString(date);
                            acc[day] = (acc[day] || 0) + 1;
                        }
                        return acc;
                    }, {} as { [key: string]: number });
                    
                    const formattedData = Object.entries(counts).map(([day, count]) => ({
                        day,
                        count,
                    }));
                    setData(formattedData);
                }

            } catch (err: any) {
                setError("No se pudieron cargar las fechas de devolución.");
                toast({
                    variant: "destructive",
                    title: "Error de Carga",
                    description: err.message,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchReturnDates();
    }, [toast]);
    
    // Initialize or update air-datepicker
    useEffect(() => {
        if (calendarRef.current) {
            if (!datepickerRef.current) {
                // Initialize
                datepickerRef.current = new AirDatepicker(calendarRef.current, {
                    locale: localeEs,
                    inline: true,
                    selectedDates: [new Date()],
                    onSelect: ({ date }) => {
                        const newDate = date instanceof Date ? date : Array.isArray(date) ? date[0] : undefined;
                        setSelectedDate(newDate);
                    },
                });
            }

            // Update cells with dots whenever data changes
            datepickerRef.current.update({
                onRenderCell: ({ date, cellType }) => {
                    if (cellType === 'day') {
                        const dayString = dateToDayString(date);
                        const hasReturn = data.some(d => d.day === dayString);
                        if (hasReturn) {
                            return {
                                html: `${date.getDate()}<span class="air-datepicker-cell-decorator"></span>`
                            }
                        }
                    }
                    return false; // use default rendering
                }
            });
        }
        
        // Cleanup on unmount
        return () => {
            if (datepickerRef.current) {
                datepickerRef.current.destroy();
                datepickerRef.current = null;
            }
        }
    }, [data]);
    
    const returnsForSelectedDay = selectedDate ? data.find(d => d.day === dateToDayString(selectedDate))?.count : 0;

    return (
        <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header>
                    <Link
                        href="/devoluciones"
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Devoluciones
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Calendario de Devoluciones</h1>
                        <p className="text-muted-foreground">
                            Visualiza cuántas devoluciones se esperan recibir cada día.
                        </p>
                    </div>
                </header>
                <main>
                    <Card>
                         <CardHeader>
                            <CardTitle>Calendario</CardTitle>
                            <CardDescription>
                                Los días marcados tienen devoluciones previstas. Haz clic en un día para ver el detalle.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row items-center justify-center gap-8">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64 w-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="ml-4">Cargando datos del calendario...</p>
                                </div>
                            ) : error ? (
                                <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md w-full">
                                    {error}
                                </div>
                            ) : (
                                <>
                                    <div ref={calendarRef} className="w-full max-w-xs sm:max-w-sm [&_.air-datepicker]:w-full [&_.air-datepicker--content]:p-0"/>
                                    <div className="w-full md:w-64 text-center">
                                        {selectedDate ? (
                                            <>
                                                <p className="font-medium text-lg">
                                                    {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                                <p className="text-6xl font-bold text-primary mt-4">{returnsForSelectedDay || 0}</p>
                                                <p className="text-muted-foreground mt-2">devoluciones previstas</p>
                                            </>
                                        ) : (
                                            <p>Selecciona un día para ver los detalles.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}