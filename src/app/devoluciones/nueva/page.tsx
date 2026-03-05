'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabasePROD } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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
  num_factura: z.string().optional(),
  revision: z.string().optional(),
});

type DevolucionFormValues = z.infer<typeof devolucionSchema>;

export default function NuevaDevolucionPage() {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [allSkus, setAllSkus] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingSkus, setIsLoadingSkus] = useState(true);
    const [skuPopoverOpen, setSkuPopoverOpen] = useState(false);

    const [salesByDate, setSalesByDate] = useState<{ value: number; label: string; producto: string; sku: string | null }[]>([]);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [salePopoverOpen, setSalePopoverOpen] = useState(false);

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
            num_factura: '',
            revision: '',
        },
    });

    const watchFactura = form.watch('factura');
    const watchFechaVenta = form.watch('fecha_venta');

    useEffect(() => {
        const fetchSkus = async () => {
            setIsLoadingSkus(true);
            try {
                const { data, error } = await supabasePROD
                    .from('sku_alterno')
                    .select('sku')
                    .order('sku', { ascending: true });

                if (error) throw error;

                if (data) {
                    setAllSkus(data.map(item => ({ value: item.sku, label: item.sku })));
                }
            } catch (err: any) {
                toast({
                    variant: "destructive",
                    title: "Error al cargar SKUs",
                    description: "No se pudieron cargar los SKUs para la búsqueda.",
                });
            } finally {
                setIsLoadingSkus(false);
            }
        };
        fetchSkus();
    }, [toast]);

    useEffect(() => {
        if (!watchFechaVenta) {
            setSalesByDate([]);
            form.setValue('num_venta', null);
            return;
        }

        const fetchSales = async () => {
            setIsLoadingSales(true);
            try {
                const startOfDay = new Date(watchFechaVenta);
                startOfDay.setHours(0, 0, 0, 0);

                const nextDay = new Date(startOfDay);
                nextDay.setDate(nextDay.getDate() + 1);

                const { data, error } = await supabasePROD
                    .from('devoluciones')
                    .select('num_venta, producto, sku')
                    .gte('fecha_venta', startOfDay.toISOString())
                    .lt('fecha_venta', nextDay.toISOString())
                    .order('num_venta', { ascending: false });

                if (error) throw error;

                if (data) {
                    const uniqueSales = data.reduce((acc, current) => {
                        if (!acc.find(item => item.num_venta === current.num_venta)) {
                            acc.push(current);
                        }
                        return acc;
                    }, [] as typeof data);

                    setSalesByDate(uniqueSales.map(item => ({ 
                        value: item.num_venta, 
                        label: String(item.num_venta),
                        producto: item.producto || '',
                        sku: item.sku || null
                    })));
                }
            } catch (err: any) {
                toast({
                    variant: "destructive",
                    title: "Error al cargar ventas",
                    description: "No se pudieron cargar las ventas para la fecha seleccionada.",
                });
            } finally {
                setIsLoadingSales(false);
            }
        };

        fetchSales();
    }, [watchFechaVenta, form, toast]);


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
                        <h1 className="text-3xl font-bold">Estado de Devolución</h1>
                        <p className="text-muted-foreground">
                            Completa el formulario para registrar el estado de una devolución.
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
                                        <FormField
                                            control={form.control}
                                            name="tienda"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tienda</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecciona una tienda" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="INMATMEX">Inmatmex</SelectItem>
                                                            <SelectItem value="TAL COMERCIALIZADORA">TAL COMERCIALIZADORA</SelectItem>
                                                            <SelectItem value="DO MESKA">DO MESKA</SelectItem>
                                                            <SelectItem value="HOGARDEN">Hogarden</SelectItem>
                                                            <SelectItem value="PALO DE ROSA">Palo de Rosa</SelectItem>
                                                            <SelectItem value="MTM">MTM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        
                                        <FormField control={form.control} name="fecha_venta" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Venta</FormLabel><FormControl><DatePicker value={field.value} onChange={(date) => {
                                            field.onChange(date);
                                            form.setValue('num_venta', null);
                                            form.setValue('producto', '');
                                            form.setValue('sku', '');
                                        }} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField
                                            control={form.control}
                                            name="num_venta"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel># Venta</FormLabel>
                                                    <Popover open={salePopoverOpen} onOpenChange={setSalePopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className={cn(
                                                                        "w-full justify-between",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                    disabled={isLoadingSales || !watchFechaVenta}
                                                                >
                                                                    {isLoadingSales ? (
                                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    ) : field.value ? (
                                                                        salesByDate.find(sale => sale.value === field.value)?.label
                                                                    ) : (
                                                                        "Selecciona una venta"
                                                                    )}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Buscar # venta..." />
                                                                <CommandList>
                                                                    {isLoadingSales ? (
                                                                        <div className="p-4 text-center text-sm">Cargando ventas...</div>
                                                                    ) : salesByDate.length === 0 ? (
                                                                        <CommandEmpty>
                                                                            {watchFechaVenta ? "No se encontraron ventas." : "Selecciona una fecha primero."}
                                                                        </CommandEmpty>
                                                                    ) : (
                                                                        <CommandGroup>
                                                                            {salesByDate.map((sale) => (
                                                                                <CommandItem
                                                                                    value={sale.label}
                                                                                    key={sale.value}
                                                                                    onSelect={() => {
                                                                                        form.setValue("num_venta", sale.value);
                                                                                        form.setValue("producto", sale.producto);
                                                                                        if (sale.sku) {
                                                                                            form.setValue("sku", sale.sku);
                                                                                        }
                                                                                        setSalePopoverOpen(false);
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            "mr-2 h-4 w-4",
                                                                                            sale.value === field.value ? "opacity-100" : "opacity-0"
                                                                                        )}
                                                                                    />
                                                                                    {sale.label}
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    )}
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormDescription>
                                                       Selecciona una fecha para ver las ventas disponibles.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField control={form.control} name="fecha_llegada" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha de Llegada</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="fecha_revision" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Revisión</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="producto" render={({ field }) => (<FormItem><FormLabel>Producto</FormLabel><FormControl><Input placeholder="Nombre del producto" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>SKU</FormLabel>
                                                    <Popover open={skuPopoverOpen} onOpenChange={setSkuPopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className={cn(
                                                                        "w-full justify-between",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                    disabled={isLoadingSkus}
                                                                >
                                                                    {isLoadingSkus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                    {field.value
                                                                        ? allSkus.find(
                                                                            (sku) => sku.value === field.value
                                                                        )?.label
                                                                        : "Selecciona un SKU"}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Buscar SKU..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No se encontró SKU.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {allSkus.map((sku) => (
                                                                            <CommandItem
                                                                                value={sku.label}
                                                                                key={sku.value}
                                                                                onSelect={() => {
                                                                                    form.setValue("sku", sku.value)
                                                                                    setSkuPopoverOpen(false)
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        sku.value === field.value
                                                                                            ? "opacity-100"
                                                                                            : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                {sku.label}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="motivo_devolucion"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Motivo Devolución</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecciona un motivo" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Despacho menos cantidad de la solicitada">Despacho menos cantidad de la solicitada</SelectItem>
                                                            <SelectItem value="Despacho más cantidad de la solicitada">Despacho más cantidad de la solicitada</SelectItem>
                                                            <SelectItem value="Despacho una variante diferente a la solicitada">Despacho una variante diferente a la solicitada</SelectItem>
                                                            <SelectItem value="Despacho otro producto diferente al solicitado.">Despacho otro producto diferente al solicitado.</SelectItem>
                                                            <SelectItem value="Despacho producto dañado o sin verificación">Despacho producto dañado o sin verificación</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="estado_llegada"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Estado de Llegada</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecciona un estado" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="BUENO">BUENO</SelectItem>
                                                            <SelectItem value="REGULAR">REGULAR</SelectItem>
                                                            <SelectItem value="DANIADO">DAÑADO</SelectItem>
                                                            <SelectItem value="MUY_DANIADO">MUY DAÑADO</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField control={form.control} name="empaquetador" render={({ field }) => (<FormItem><FormLabel>Empaquetador (Despacho)</FormLabel><FormControl><Input placeholder="Nombre de quien empacó" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="supervisado_por" render={({ field }) => (<FormItem><FormLabel>Supervisado por (Revisión)</FormLabel><FormControl><Input placeholder="Nombre de quien revisó" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="revision" render={({ field }) => (<FormItem><FormLabel>Estado de Revisión</FormLabel><FormControl><Input placeholder="Ej. Completa, Pendiente" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField control={form.control} name="observaciones" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Observaciones</FormLabel><FormControl><Textarea placeholder="Añade cualquier observación relevante..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField
                                            control={form.control}
                                            name="reporte"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                                    <div className="space-y-1">
                                                        <FormLabel>Reporte</FormLabel>
                                                        <FormDescription className={cn(field.value ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                                                            {field.value ? 'Sí, requiere reporte' : 'No'}
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="error_nosotros"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                                    <div className="space-y-1">
                                                        <FormLabel>Error de Nosotros</FormLabel>
                                                        <FormDescription className={cn(field.value ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                                            {field.value ? 'Sí, fue nuestro error' : 'No'}
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="factura"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                                        <div className="space-y-1">
                                                            <FormLabel>Factura</FormLabel>
                                                            <FormDescription className={cn(field.value ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                                                                {field.value ? 'Sí, incluye factura' : 'No'}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            {watchFactura && (
                                                <FormField
                                                    control={form.control}
                                                    name="num_factura"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Número de Factura</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Digite el número de factura" {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
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
