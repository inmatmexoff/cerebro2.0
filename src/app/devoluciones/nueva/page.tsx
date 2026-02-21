'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const devolucionSchema = z.object({
  tienda: z.string().optional(),
  num_venta: z.coerce.number().optional().nullable(),
  fecha_venta: z.date().optional().nullable(),
  fecha_llegada: z.date().optional().nullable(),
  fecha_revision: z.date().optional().nullable(),
  producto: z.string().min(1, { message: "El nombre del producto es requerido." }),
  sku: z.string().optional(),
  motivo_devolucion: z.string().optional(),
  estado_llegada: z.string().optional(),
  reporte: z.boolean().default(false),
  empaquetador: z.string().optional(),
  supervisado_por: z.string().optional(),
  error_nosotros: z.boolean().default(false),
  observaciones: z.string().optional(),
  factura: z.boolean().default(false),
  revision: z.string().optional(),
});

type DevolucionFormValues = z.infer<typeof devolucionSchema>;

export default function NuevaDevolucionPage() {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const form = useForm<DevolucionFormValues>({
        resolver: zodResolver(devolucionSchema),
        defaultValues: {
            tienda: '',
            num_venta: null,
            fecha_venta: null,
            fecha_llegada: null,
            fecha_revision: null,
            producto: '',
            sku: '',
            motivo_devolucion: '',
            estado_llegada: '',
            reporte: false,
            empaquetador: '',
            supervisado_por: '',
            error_nosotros: false,
            observaciones: '',
            factura: false,
            revision: '',
        },
    });

    async function onSubmit(values: DevolucionFormValues) {
        setIsSaving(true);
        try {
            const response = await fetch('/api/devoluciones/nueva', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Error en el servidor');
            }
            toast({ title: "Éxito", description: result.message });
            form.reset();

        } catch(e: any) {
            toast({ variant: "destructive", title: "Error al registrar", description: e.message });
            console.error("Error creating devolution:", e.message);
        } finally {
            setIsSaving(false);
        }
    }

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
                        <h1 className="text-3xl font-bold">Registrar Nueva Devolución</h1>
                        <p className="text-muted-foreground">
                            Completa el formulario para registrar una nueva devolución manualmente.
                        </p>
                    </div>
                </header>

                <main>
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles de la Devolución</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <FormField control={form.control} name="tienda" render={({ field }) => (<FormItem><FormLabel>Tienda</FormLabel><FormControl><Input placeholder="Ej. DO MESKA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="num_venta" render={({ field }) => (<FormItem><FormLabel># Venta</FormLabel><FormControl><Input type="number" placeholder="Ej. 2000008064..." {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="fecha_venta" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Venta</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <FormField control={form.control} name="fecha_llegada" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Llegada</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="fecha_revision" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Revisión</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="producto" render={({ field }) => (<FormItem><FormLabel>Producto</FormLabel><FormControl><Input placeholder="Nombre del producto" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="Ej. INM-ANQ-5N" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="motivo_devolucion" render={({ field }) => (<FormItem><FormLabel>Motivo Devolución</FormLabel><FormControl><Input placeholder="Ej. Producto dañado" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="estado_llegada" render={({ field }) => (<FormItem><FormLabel>Estado de Llegada</FormLabel><FormControl><Input placeholder="Ej. Dañado, Buen estado" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField control={form.control} name="empaquetador" render={({ field }) => (<FormItem><FormLabel>Empaquetador (Despacho)</FormLabel><FormControl><Input placeholder="Nombre de quien empacó" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="supervisado_por" render={({ field }) => (<FormItem><FormLabel>Supervisado por (Revisión)</FormLabel><FormControl><Input placeholder="Nombre de quien revisó" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="revision" render={({ field }) => (<FormItem><FormLabel>Estado de Revisión</FormLabel><FormControl><Input placeholder="Ej. Completa, Pendiente" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField control={form.control} name="observaciones" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Observaciones</FormLabel><FormControl><Textarea placeholder="Añade cualquier observación relevante..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField control={form.control} name="reporte" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><Label>Reporte</Label></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="error_nosotros" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><Label>Error de Nosotros</Label></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="factura" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><Label>Factura</Label></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                    </div>

                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>) : (<><Save className="w-4 h-4 mr-2" /> Registrar Devolución</>)}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}