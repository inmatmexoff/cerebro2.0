'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabasePROD } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Zod schema for form validation
const updateSkuSchema = z.object({
    sku: z.string(), // Non-editable
    sku_mdr: z.string().min(1, { message: "SKU MDR es requerido." }),
    cat_mdr: z.string().min(1, { message: "Categoría MDR es requerida." }),
    landed_cost: z.coerce.number().optional().nullable(),
    proveedor: z.string().optional().nullable(),
    piezas_xcontenedor: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
    esti_time: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
    piezas_por_sku: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
});

type UpdateSkuFormValues = z.infer<typeof updateSkuSchema>;

export default function ActualizarSkuPage() {
    const [allSkus, setAllSkus] = useState<{ value: string; label: string }[]>([]);
    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isLoadingSkus, setIsLoadingSkus] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    const form = useForm<UpdateSkuFormValues>({
        resolver: zodResolver(updateSkuSchema),
        defaultValues: {
            sku: '',
            sku_mdr: '',
            cat_mdr: '',
            landed_cost: null,
            proveedor: '',
            piezas_xcontenedor: null,
            esti_time: null,
            piezas_por_sku: null
        }
    });

    // Fetch all SKUs for the combobox
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
                console.error('Error fetching all SKUs:', err.message);
            } finally {
                setIsLoadingSkus(false);
            }
        };
        fetchSkus();
    }, [toast]);

    // Fetch details for the selected SKU
    useEffect(() => {
        if (!selectedSku) {
            form.reset({
                sku: '',
                sku_mdr: '',
                cat_mdr: '',
                landed_cost: null,
                proveedor: '',
                piezas_xcontenedor: null,
                esti_time: null,
                piezas_por_sku: null
            });
            return;
        };

        const fetchSkuDetails = async () => {
            setIsLoadingData(true);
            form.reset({});
            try {
                const response = await fetch(`/api/sku-details/${selectedSku}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al obtener los detalles del SKU.');
                }
                const data = await response.json();
                form.reset(data);
            } catch (err: any) {
                 toast({
                    variant: "destructive",
                    title: "Error al cargar datos",
                    description: err.message,
                });
                console.error('Error fetching SKU details:', err.message);
                setSelectedSku(null); // Reset selection on error
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchSkuDetails();
    }, [selectedSku, form, toast]);

    // Handle form submission
    async function onSubmit(values: UpdateSkuFormValues) {
        setIsUpdating(true);
        try {
             const response = await fetch('/api/sku-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Error en el servidor');
            }
            toast({ title: "Éxito", description: result.message });

        } catch(e: any) {
            toast({ variant: "destructive", title: "Error al actualizar", description: e.message });
            console.error("Error updating SKU:", e.message);
        } finally {
            setIsUpdating(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header>
                    <Link
                        href="/configuracion/carga-sku"
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Carga de SKUs
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Actualizar Registros de SKU</h1>
                        <p className="text-muted-foreground">
                            Busca un SKU para ver y editar sus datos asociados.
                        </p>
                    </div>
                </header>

                <main className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Buscar SKU</CardTitle>
                            <CardDescription>Selecciona un SKU de la lista para editarlo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={popoverOpen}
                                    className="w-full justify-between"
                                    disabled={isLoadingSkus}
                                >
                                    {isLoadingSkus ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : null}
                                    {selectedSku
                                        ? allSkus.find((sku) => sku.value === selectedSku)?.label
                                        : "Selecciona un SKU..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar SKU..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el SKU.</CommandEmpty>
                                        <CommandGroup>
                                        {allSkus.map((sku) => (
                                            <CommandItem
                                            key={sku.value}
                                            value={sku.value}
                                            onSelect={(currentValue) => {
                                                setSelectedSku(currentValue === selectedSku ? null : currentValue);
                                                setPopoverOpen(false);
                                            }}
                                            >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedSku === sku.value ? "opacity-100" : "opacity-0"
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
                        </CardContent>
                    </Card>

                    {isLoadingData && (
                        <Card>
                            <CardHeader>
                               <Skeleton className="h-8 w-1/2" />
                               <Skeleton className="h-4 w-3/4" />
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                               <div className="grid md:grid-cols-3 gap-4">
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                                 <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                               </div>
                               <Skeleton className="h-10 w-32" />
                            </CardContent>
                        </Card>
                    )}

                    {!isLoadingData && selectedSku && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Editando SKU: {selectedSku}</CardTitle>
                                <CardDescription>Modifica los campos y guarda los cambios. Al guardar un nuevo "Landed Cost", se creará un nuevo registro en el historial de costos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                     <div className="grid md:grid-cols-3 gap-4">
                                         <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>SKU (No editable)</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} disabled value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField control={form.control} name="sku_mdr" render={({ field }) => (<FormItem><FormLabel>SKU MDR</FormLabel><FormControl><Input placeholder="Ej. SKU_MDR_123" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="cat_mdr" render={({ field }) => (<FormItem><FormLabel>Categoría MDR</FormLabel><FormControl><Input placeholder="Ej. RACKS" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="landed_cost" render={({ field }) => (<FormItem><FormLabel>Landed Cost</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej. 199.99" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="proveedor" render={({ field }) => (<FormItem><FormLabel>Proveedor</FormLabel><FormControl><Input placeholder="Ej. Proveedor A" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="piezas_xcontenedor" render={({ field }) => (<FormItem><FormLabel>Piezas por Contenedor</FormLabel><FormControl><Input type="number" placeholder="Ej. 100" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="esti_time" render={({ field }) => (<FormItem><FormLabel>Tiempo Estimado (min)</FormLabel><FormControl><Input type="number" placeholder="Ej. 30" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="piezas_por_sku" render={({ field }) => (<FormItem><FormLabel>Piezas por SKU</FormLabel><FormControl><Input type="number" placeholder="Ej. 50" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                     </div>
                                      <Button type="submit" disabled={isUpdating}>
                                        {isUpdating ? (<Loader2 className="w-4 h-4 mr-2 animate-spin" />) : (<Save className="w-4 h-4 mr-2" />)}
                                        Guardar Cambios
                                    </Button>
                                </form>
                                </Form>
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}
