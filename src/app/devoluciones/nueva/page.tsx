'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, ChevronsUpDown, Check, UploadCloud } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const devolucionSchema = z.object({
  tienda: z.string().optional(),
  num_venta: z.string().optional().nullable(),
  fecha_venta: z.date().optional().nullable(),
  fecha_llegada: z.date().optional().nullable(),
  fecha_revision: z.date().optional().nullable(),
  producto: z.string().min(1, { message: "El nombre del producto es requerido." }),
  sku: z.string().optional(),
  motivo_devolucion: z.string().optional(),
  estado_llegada: z.string().optional(),
  reporte: z.boolean().default(false),
  reporte_detalle: z.string().optional(),
  error_nosotros: z.boolean().default(false),
  observaciones: z.string().optional(),
  factura: z.boolean().default(false),
  num_factura: z.string().optional(),
  revision: z.string().optional(),
  // New fields for the "Error de Nosotros" modal
  responsable_barra: z.string().optional(),
  responsable_picking: z.string().optional(),
  responsable_calificar: z.string().optional(),
  saldo_negativo: z.coerce.number().optional().nullable(),
  foto_error: z.any().optional(), // For file handling
  descuento_personas: z.string().optional().nullable(),
  enterado_personal: z.string().optional(),
  fecha_registro_saldo_negativo: z.date().optional().nullable(),
  saldo_cobrado: z.boolean().default(false),
});

type DevolucionFormValues = z.infer<typeof devolucionSchema>;

type ModalType = 'reporte' | 'error' | 'factura';

export default function NuevaDevolucionPage() {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [allSkus, setAllSkus] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingSkus, setIsLoadingSkus] = useState(true);
    const [skuPopoverOpen, setSkuPopoverOpen] = useState(false);

    const [salesByDate, setSalesByDate] = useState<{ value: string; label: string; producto: string; sku: string | null }[]>([]);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    
    const [modalState, setModalState] = useState<{type: ModalType | null, open: boolean}>({ type: null, open: false });
    const [modalInputValue, setModalInputValue] = useState('');
    const [saldoNegativoDateAlert, setSaldoNegativoDateAlert] = useState(false);

    const form = useForm<DevolucionFormValues>({
        resolver: zodResolver(devolucionSchema),
        defaultValues: {
            tienda: '',
            num_venta: '',
            fecha_venta: null,
            fecha_llegada: null,
            fecha_revision: null,
            producto: '',
            sku: '',
            motivo_devolucion: '',
            estado_llegada: '',
            reporte: false,
            reporte_detalle: '',
            error_nosotros: false,
            observaciones: '',
            factura: false,
            num_factura: '',
            revision: '',
            responsable_barra: '',
            responsable_picking: '',
            responsable_calificar: '',
            saldo_negativo: null,
            foto_error: null,
            descuento_personas: null,
            enterado_personal: '',
            fecha_registro_saldo_negativo: null,
            saldo_cobrado: false,
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        form.setValue('foto_error', acceptedFiles[0]);
    }, [form]);

    const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
    });

    const watchFechaVenta = form.watch('fecha_venta');
    const watchReporte = form.watch('reporte');
    const watchErrorNosotros = form.watch('error_nosotros');
    const watchFactura = form.watch('factura');
    const watchFechaRegistroSaldoNegativo = form.watch('fecha_registro_saldo_negativo');
    const watchSaldoCobrado = form.watch('saldo_cobrado');

    useEffect(() => {
        if (watchFechaRegistroSaldoNegativo && !watchSaldoCobrado) {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            setSaldoNegativoDateAlert(watchFechaRegistroSaldoNegativo < twoWeeksAgo);
        } else {
            setSaldoNegativoDateAlert(false);
        }
    }, [watchFechaRegistroSaldoNegativo, watchSaldoCobrado]);


    const handleModalOpen = (type: ModalType, value?: string) => {
        setModalState({ type, open: true });
        setModalInputValue(value || '');
    };

    useEffect(() => {
        if (watchReporte) handleModalOpen('reporte', form.getValues('reporte_detalle'));
    }, [watchReporte, form]);

    useEffect(() => {
        if (watchErrorNosotros) handleModalOpen('error');
    }, [watchErrorNosotros]);
    
    useEffect(() => {
        if (watchFactura) handleModalOpen('factura', form.getValues('num_factura'));
    }, [watchFactura, form]);


    const handleModalClose = (saved: boolean) => {
        const { type } = modalState;
        if (!type) {
            setModalState({ type: null, open: false });
            return;
        };

        if (saved) {
            if (type === 'reporte') form.setValue('reporte_detalle', modalInputValue);
            if (type === 'factura') form.setValue('num_factura', modalInputValue);
        } else {
            if (type === 'reporte' && !form.getValues('reporte_detalle')) form.setValue('reporte', false);
            if (type === 'error') {
                 const { responsable_barra, responsable_picking, responsable_calificar, saldo_negativo, enterado_personal } = form.getValues();
                 if (!responsable_barra && !responsable_picking && !responsable_calificar && !saldo_negativo && !enterado_personal) {
                    form.setValue('error_nosotros', false);
                 }
            }
            if (type === 'factura' && !form.getValues('num_factura')) form.setValue('factura', false);
        }
        setModalState({ type: null, open: false });
        setModalInputValue('');
    };

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
            return;
        }

        const fetchSales = async () => {
            setIsLoadingSales(true);
            try {
                const startOfDay = new Date(watchFechaVenta);
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date(watchFechaVenta);
                endOfDay.setHours(23, 59, 59, 999);
                

                const { data, error } = await supabasePROD
                    .from('devoluciones_ml')
                    .select('num_venta, titulo_publi, sku')
                    .gte('fecha_venta', startOfDay.toISOString())
                    .lte('fecha_venta', endOfDay.toISOString())
                    .order('num_venta', { ascending: false });

                if (error) throw error;

                if (data) {
                    const salesMap = new Map<string, typeof data[0]>();
                    data.forEach(item => {
                        const ventaNum = String(item.num_venta);
                        if (!salesMap.has(ventaNum)) {
                            salesMap.set(ventaNum, item);
                        }
                    });
                    const uniqueSales = Array.from(salesMap.values());

                    setSalesByDate(uniqueSales.map(item => ({ 
                        value: String(item.num_venta), 
                        label: String(item.num_venta),
                        producto: item.titulo_publi || '',
                        sku: item.sku || null
                    })));
                } else {
                    setSalesByDate([]);
                }
            } catch (err: any) {
                setSalesByDate([]);
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
    }, [watchFechaVenta, toast]);


    async function onSubmit(values: DevolucionFormValues) {
        setIsSaving(true);
        try {
            const payload = { ...values, foto_error: undefined };

            // Note: File upload logic is not implemented, as it requires a backend with storage.
            // In a real scenario, you'd upload the file and save the URL.
            if (values.foto_error) {
                console.log("File to upload:", values.foto_error.name);
                // Here you would typically call a function to upload values.foto_error to your storage
                // and get a URL to save in the database.
            }

            const response = await fetch('/api/devoluciones/nueva', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Error en el servidor');
            }
            toast({ title: "Éxito", description: result.message });
            form.reset();
            form.setValue('foto_error', null);


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
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Detalles de la Devolución</CardTitle>
                                </CardHeader>
                                <CardContent>
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
                                            form.setValue('num_venta', '');
                                            form.setValue('producto', '');
                                            form.setValue('sku', '');
                                        }} /></FormControl><FormMessage /></FormItem>)} />

                                        <FormField
                                            control={form.control}
                                            name="num_venta"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel># Venta</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Escribe o selecciona un # de venta"
                                                            {...field}
                                                            value={field.value || ''}
                                                            list="sales-list"
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                field.onChange(value);
                                                                
                                                                const selectedSale = salesByDate.find(s => s.label === value);
                                                                if (selectedSale) {
                                                                    form.setValue("producto", selectedSale.producto, { shouldValidate: true });
                                                                    if (selectedSale.sku) {
                                                                        form.setValue("sku", selectedSale.sku, { shouldValidate: true });
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <datalist id="sales-list">
                                                        {salesByDate.map((sale) => (
                                                            <option key={sale.value} value={sale.label} />
                                                        ))}
                                                    </datalist>
                                                    <FormDescription>
                                                       {isLoadingSales ? "Cargando ventas..." : watchFechaVenta ? `Se encontraron ${salesByDate.length} ventas.` : "Selecciona una fecha para ver sugerencias."}
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
                                                                        "w-full justify-between font-normal text-left",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                    disabled={isLoadingSkus}
                                                                >
                                                                    <span className="truncate">
                                                                        {isLoadingSkus ? (<Loader2 className="inline mr-2 h-4 w-4 animate-spin" />) : null}
                                                                        {field.value
                                                                            ? allSkus.find(
                                                                                (sku) => sku.value === field.value
                                                                            )?.label
                                                                            : "Selecciona un SKU"}
                                                                    </span>
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
                                                            <SelectItem value="LISTO_PARA_VENDER">Listo para Vender</SelectItem>
                                                            <SelectItem value="VENDER_CON_DESCUENTO">Vender con descuento</SelectItem>
                                                            <SelectItem value="MERMA">Merma</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField control={form.control} name="revision" render={({ field }) => (<FormItem><FormLabel>Estado de Revisión</FormLabel><FormControl><Input placeholder="Ej. Completa, Pendiente" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField control={form.control} name="observaciones" render={({ field }) => (<FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea placeholder="Añade cualquier observación relevante..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                                    <div className="grid md:grid-cols-3 gap-6">
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
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-start">
                               <Button type="submit" disabled={isSaving}>
                                    {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>) : (<><Save className="w-4 h-4 mr-2" /> Registrar Devolución</>)}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </main>
            </div>
             <Dialog open={modalState.open} onOpenChange={(open) => !open && handleModalClose(false)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modalState.type === 'reporte' && 'Detalles del Reporte'}
                            {modalState.type === 'error' && 'Detalles del Error'}
                            {modalState.type === 'factura' && 'Número de Factura'}
                        </DialogTitle>
                        <DialogDescription>
                            {modalState.type === 'reporte' && 'Por favor, proporciona detalles sobre el reporte.'}
                            {modalState.type === 'error' && 'Por favor, completa los detalles del error.'}
                            {modalState.type === 'factura' && 'Por favor, ingresa el número de factura asociado.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                        {modalState.type === 'error' && (
                            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="responsable_barra" render={({ field }) => (<FormItem><FormLabel>Responsable de Barra</FormLabel><FormControl><Input placeholder="Nombre" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="responsable_picking" render={({ field }) => (<FormItem><FormLabel>Responsable de Picking</FormLabel><FormControl><Input placeholder="Nombre" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="responsable_calificar" render={({ field }) => (<FormItem><FormLabel>Responsable de Calificar</FormLabel><FormControl><Input placeholder="Nombre" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="saldo_negativo" render={({ field }) => (<FormItem><FormLabel>Saldo Negativo de Devolución</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                </div>

                                <FormField control={form.control} name="foto_error" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Foto del Error</FormLabel>
                                        <FormControl>
                                            <div {...getRootProps()} className={cn("border-2 border-dashed rounded-md p-6 text-center cursor-pointer", isDragActive && "border-primary bg-primary/10")}>
                                                <input {...getInputProps()} />
                                                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground"/>
                                                {acceptedFiles.length > 0 ? (
                                                    <p className="mt-2 text-sm text-primary">{acceptedFiles[0].name}</p>
                                                ) : (
                                                    <p className="mt-2 text-sm text-muted-foreground">Arrastra una imagen o haz clic para seleccionarla.</p>
                                                )}
                                            </div>
                                        </FormControl>
                                        {fileRejections.length > 0 && <FormMessage>El archivo debe ser una imagen.</FormMessage>}
                                    </FormItem>
                                )} />
                                
                                <FormField control={form.control} name="descuento_personas" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descuento por Personal</FormLabel>
                                        <FormDescription>Dividir costo entre el número de personas.</FormDescription>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex space-x-4 pt-2">
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="1" /></FormControl><FormLabel className="font-normal">1</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="2" /></FormControl><FormLabel className="font-normal">2</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="3" /></FormControl><FormLabel className="font-normal">3</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="enterado_personal" render={({ field }) => (<FormItem><FormLabel>Enterado Personal</FormLabel><FormControl><Textarea placeholder="Nombres de las personas enteradas..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                
                                <FormField control={form.control} name="fecha_registro_saldo_negativo" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha Registro Saldo Negativo</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                {saldoNegativoDateAlert && (
                                    <Alert variant="destructive">
                                      <AlertTitle>Alerta de Límite de Tiempo</AlertTitle>
                                      <AlertDescription>
                                        Han pasado más de 2 semanas desde el registro del saldo negativo y aún no se ha marcado como cobrado.
                                      </AlertDescription>
                                    </Alert>
                                )}
                                
                                <FormField control={form.control} name="saldo_cobrado" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                        <div className="space-y-1">
                                            <FormLabel>Saldo Cobrado</FormLabel>
                                            <FormDescription>Lo llena el encargado de nómina.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        )}

                        {modalState.type === 'reporte' && (
                            <div className="py-4">
                                <Textarea 
                                    placeholder="Añade los detalles aquí..."
                                    value={modalInputValue}
                                    onChange={(e) => setModalInputValue(e.target.value)} 
                                />
                            </div>
                        )}
                        
                        {modalState.type === 'factura' && (
                            <div className="py-4">
                                <Input 
                                    placeholder="Número de factura" 
                                    value={modalInputValue}
                                    onChange={(e) => setModalInputValue(e.target.value)}
                                />
                            </div>
                        )}
                    </Form>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => handleModalClose(false)}>Cancelar</Button>
                        <Button type="button" onClick={() => handleModalClose(true)}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
