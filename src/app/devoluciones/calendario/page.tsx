'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

    useEffect(() => {
        const fetchReturnDates = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

                const { data: returnsData, error } = await supabasePROD
                    .from('devoluciones_ml')
                    .select('fecha_status')
                    .not('fecha_status', 'is', null)
                    .gte('fecha_status', oneMonthAgo.toISOString());

                if (error) {
                    throw error;
                }

                if (returnsData) {
                    const counts: { [key: string]: number } = returnsData.reduce((acc, curr) => {
                        if(curr.fecha_status) {
                            const date = new Date(curr.fecha_status);
                            const day = date.toISOString().split('T')[0];
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
    
    const daysWithReturns = React.useMemo(() => {
        return data.map(d => new Date(d.day + 'T12:00:00Z'));
    }, [data]);
    
    const returnsForSelectedDay = selectedDate ? data.find(d => d.day === selectedDate.toISOString().split('T')[0])?.count : 0;

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
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="ml-4">Cargando datos del calendario...</p>
                                </div>
                            ) : error ? (
                                <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                                    {error}
                                </div>
                            ) : (
                                <>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="rounded-md border"
                                        modifiers={{ hasReturns: daysWithReturns }}
                                        modifiersClassNames={{ hasReturns: 'has-returns' }}
                                    />
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
                    <style jsx global>{\`
                        .has-returns {
                            position: relative;
                        }
                        .has-returns::after {
                            content: '';
                            position: absolute;
                            bottom: 4px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background-color: hsl(var(--primary));
                        }
                        .rdp-day_selected.has-returns::after {
                            background-color: hsl(var(--primary-foreground));
                        }
                    \`}</style>
                </main>
            </div>
        </div>
    );
}
