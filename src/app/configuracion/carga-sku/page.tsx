'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Define column headers for the preview table
const TABLE_HEADERS = ['sku', 'sku_mdr', 'cat_mdr', 'landed_cost', 'piezas_xcontenedor'];

const manualSkuSchema = z.object({
    sku: z.string().min(1, { message: "SKU es requerido." }),
    sku_mdr: z.string().min(1, { message: "SKU MDR es requerido." }),
    cat_mdr: z.string().min(1, { message: "Categoría MDR es requerida." }),
    landed_cost: z.coerce.number().optional().nullable(),
    proveedor: z.string().optional().nullable(),
    piezas_xcontenedor: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
});

export default function CargaSkuPage() {
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const [isSavingManual, setIsSavingManual] = useState(false);
    const manualForm = useForm<z.infer<typeof manualSkuSchema>>({
        resolver: zodResolver(manualSkuSchema),
        defaultValues: {
            sku: '',
            sku_mdr: '',
            cat_mdr: '',
            landed_cost: null,
            proveedor: '',
            piezas_xcontenedor: null
        },
    });

    async function onManualSubmit(values: z.infer<typeof manualSkuSchema>) {
        setIsSavingManual(true);
        try {
            const { sku, sku_mdr, cat_mdr, landed_cost, proveedor, piezas_xcontenedor } = values;

            // 1. Process sku_m
            const { data: existingM } = await supabasePROD.from('sku_m').select('sku_mdr').eq('sku_mdr', sku_mdr).maybeSingle();
            if (existingM) {
                const { error } = await supabasePROD.from('sku_m').update({ cat_mdr }).eq('sku_mdr', sku_mdr);
                if (error) throw new Error(`Error actualizando sku_m: ${error.message}`);
            } else {
                const { error } = await supabasePROD.from('sku_m').insert({ sku_mdr, cat_mdr });
                if (error) throw new Error(`Error insertando en sku_m: ${error.message}`);
            }

            // 2. Process sku_alterno
            const { data: existingAlterno } = await supabasePROD.from('sku_alterno').select('sku').eq('sku', sku).maybeSingle();
            if (existingAlterno) {
                const { error } = await supabasePROD.from('sku_alterno').update({ sku_mdr }).eq('sku', sku);
                if (error) throw new Error(`Error actualizando sku_alterno: ${error.message}`);
            } else {
                const { error } = await supabasePROD.from('sku_alterno').insert({ sku, sku_mdr });
                if (error) throw new Error(`Error insertando en sku_alterno: ${error.message}`);
            }
    
            // 3. Process sku_costos
            const costData = { landed_cost, proveedor, piezas_xcontenedor };
            if (Object.values(costData).some(v => v !== null && v !== undefined && v !== '')) {
                const { data: existingCostos } = await supabasePROD.from('sku_costos').select('sku_mdr').eq('sku_mdr', sku_mdr).maybeSingle();
                if (existingCostos) {
                     const { error } = await supabasePROD.from('sku_costos').update(costData).eq('sku_mdr', sku_mdr);
                     if (error) throw new Error(`Error actualizando sku_costos: ${error.message}`);
                } else {
                     const { error } = await supabasePROD.from('sku_costos').insert({ sku_mdr, ...costData });
                     if (error) throw new Error(`Error insertando en sku_costos: ${error.message}`);
                }
            }
            
            toast({ title: "Éxito", description: `SKU ${sku} ha sido guardado/actualizado.` });
            manualForm.reset();

        } catch (e: any) {
            console.error("Error saving manual SKU:", e);
            toast({ variant: "destructive", title: "Error al guardar", description: e.message || "Ocurrió un error inesperado." });
        } finally {
            setIsSavingManual(false);
        }
    }


    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) {
            setError("No se seleccionó ningún archivo.");
            return;
        }

        setFileName(file.name);
        setError(null);
        setData([]);
        setIsProcessing(true);

        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const binaryStr = event.target?.result;
                if (!binaryStr) {
                    setError("No se pudo leer el archivo.");
                    setIsProcessing(false);
                    return;
                }
                const workbook = XLSX.read(binaryStr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (json.length <= 1) {
                    setError("El archivo está vacío o solo contiene la fila de encabezado.");
                    setIsProcessing(false);
                    return;
                }

                const dataRows = json.slice(1);
                // Mapeo de columnas: sku, sku_mdr, cat_mdr, landed_cost, piezas_xcontenedor
                const extractedData = dataRows.map(row => [row[0], row[2], row[1], row[3], row[8]]);
                
                // Filter out rows where essential columns are empty
                const validatedData = extractedData.filter(row => row[0] && row[1] && row[2]);
                
                const skippedCount = extractedData.length - validatedData.length;

                if (validatedData.length === 0) {
                     setError("No se encontraron registros válidos. Asegúrate de que las columnas A (sku), B (cat_mdr) y C (sku_mdr) no estén vacías a partir de la segunda fila.");
                     setIsProcessing(false);
                     return;
                }

                if (skippedCount > 0) {
                    toast({
                        title: "Registros omitidos",
                        description: `Se omitieron ${skippedCount} registros porque una de las columnas (sku, cat_mdr, sku_mdr) estaba vacía.`
                    });
                }
                
                setData(validatedData);

            } catch (e) {
                console.error(e);
                setError("Hubo un error al procesar el archivo. Asegúrate de que sea un formato de Excel o CSV válido.");
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            setError("Error al leer el archivo.");
            setIsProcessing(false);
        }

        reader.readAsBinaryString(file);
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
        disabled: isProcessing
    });

    const clearFile = () => {
        setFileName(null);
        setData([]);
        setError(null);
    };

    const handleSaveData = async () => {
        if (data.length === 0) {
            toast({
                variant: "destructive",
                title: "No hay datos para guardar",
                description: "Carga un archivo y procesa los datos primero.",
            });
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // 1. Process data from file and handle in-file duplicates using Maps (last one wins)
            const skuMRecordsMap = new Map<string, { sku_mdr: string; cat_mdr: string }>();
            const skuAlternoRecordsMap = new Map<string, { sku: string; sku_mdr: string }>();
            const skuCostosRecordsMap = new Map<string, {
                sku_mdr: string;
                landed_cost: number | null;
                proveedor: string | null;
                piezas_xcontenedor: number | null;
            }>();

            data.forEach(row => {
                const sku = String(row[0]).trim();
                const sku_mdr = String(row[1]).trim();
                const cat_mdr = String(row[2]).trim();
                const landedCostRaw = row[3];
                const piezasRaw = row[4];

                if (sku && sku_mdr && cat_mdr) {
                    skuMRecordsMap.set(sku_mdr, { sku_mdr, cat_mdr });
                    skuAlternoRecordsMap.set(sku, { sku, sku_mdr });
                    
                    let landed_cost: number | null = null;
                    if (landedCostRaw !== null && landedCostRaw !== undefined) {
                        const valueStr = String(landedCostRaw).trim();
                        if (valueStr) {
                            const cleanedValue = valueStr.replace(/[^0-9.-]+/g, "");
                            if (cleanedValue && !isNaN(parseFloat(cleanedValue))) {
                                landed_cost = parseFloat(cleanedValue);
                            }
                        }
                    }

                    let piezas_xcontenedor: number | null = null;
                    if (piezasRaw !== null && piezasRaw !== undefined && String(piezasRaw).trim() !== '') {
                        const num = parseInt(String(piezasRaw), 10);
                        if (!isNaN(num)) piezas_xcontenedor = num;
                    }

                    skuCostosRecordsMap.set(sku_mdr, {
                        sku_mdr,
                        landed_cost,
                        proveedor: null, // As per request
                        piezas_xcontenedor,
                    });
                }
            });

            const skuMRecords = Array.from(skuMRecordsMap.values());
            const skuAlternoRecords = Array.from(skuAlternoRecordsMap.values());
            const skuCostosRecords = Array.from(skuCostosRecordsMap.values());

            let insertedSkuM = 0, updatedSkuM = 0;
            let insertedSkuAlterno = 0, updatedSkuAlterno = 0;
            let insertedSkuCostos = 0, updatedSkuCostos = 0;

            // 2. Manual upsert for sku_m
            if (skuMRecords.length > 0) {
                const skuMdrs = skuMRecords.map(r => r.sku_mdr);
                const { data: existing, error } = await supabasePROD.from('sku_m').select('sku_mdr').in('sku_mdr', skuMdrs);
                if (error) throw error;
                const existingSet = new Set(existing.map(r => r.sku_mdr));
                const toInsert = skuMRecords.filter(r => !existingSet.has(r.sku_mdr));
                const toUpdate = skuMRecords.filter(r => existingSet.has(r.sku_mdr));

                if (toInsert.length > 0) {
                    const { error: insertError } = await supabasePROD.from('sku_m').insert(toInsert);
                    if (insertError) throw new Error(`Error insertando en sku_m: ${insertError.message}`);
                    insertedSkuM = toInsert.length;
                }
                if (toUpdate.length > 0) {
                    const promises = toUpdate.map(r => supabasePROD.from('sku_m').update({ cat_mdr: r.cat_mdr }).eq('sku_mdr', r.sku_mdr));
                    const results = await Promise.all(promises);
                    const updateErrors = results.filter(res => res.error);
                    if (updateErrors.length > 0) throw new Error(`Error actualizando sku_m: ${updateErrors.map(e => e.error?.message).join(', ')}`);
                    updatedSkuM = toUpdate.length;
                }
            }

            // 3. Manual upsert for sku_alterno
            if (skuAlternoRecords.length > 0) {
               const skus = skuAlternoRecords.map(r => r.sku);
               const { data: existing, error } = await supabasePROD.from('sku_alterno').select('sku').in('sku', skus);
               if (error) throw error;
               const existingSet = new Set(existing.map(r => r.sku));
               const toInsert = skuAlternoRecords.filter(r => !existingSet.has(r.sku));
               const toUpdate = skuAlternoRecords.filter(r => existingSet.has(r.sku));

                if (toInsert.length > 0) {
                    const { error: insertError } = await supabasePROD.from('sku_alterno').insert(toInsert);
                    if (insertError) throw new Error(`Error insertando en sku_alterno: ${insertError.message}`);
                    insertedSkuAlterno = toInsert.length;
                }
                if (toUpdate.length > 0) {
                     const promises = toUpdate.map(r => supabasePROD.from('sku_alterno').update({ sku_mdr: r.sku_mdr }).eq('sku', r.sku));
                    const results = await Promise.all(promises);
                    const updateErrors = results.filter(res => res.error);
                    if (updateErrors.length > 0) throw new Error(`Error actualizando sku_alterno: ${updateErrors.map(e => e.error?.message).join(', ')}`);
                    updatedSkuAlterno = toUpdate.length;
                }
            }
            
            // 4. Manual upsert for sku_costos
            const validSkuCostosRecords = skuCostosRecords.filter(r => r.landed_cost !== null || r.piezas_xcontenedor !== null);
            if (validSkuCostosRecords.length > 0) {
                const skuMdrs = validSkuCostosRecords.map(r => r.sku_mdr);
                const { data: existing, error } = await supabasePROD.from('sku_costos').select('sku_mdr').in('sku_mdr', skuMdrs);
                if (error) throw error;
                const existingSet = new Set(existing.map(r => r.sku_mdr));
                const toInsert = validSkuCostosRecords.filter(r => !existingSet.has(r.sku_mdr));
                const toUpdate = validSkuCostosRecords.filter(r => existingSet.has(r.sku_mdr));

                if (toInsert.length > 0) {
                    const { error: insertError } = await supabasePROD.from('sku_costos').insert(toInsert);
                    if (insertError) throw new Error(`Error insertando en sku_costos: ${insertError.message}`);
                    insertedSkuCostos = toInsert.length;
                }
                if (toUpdate.length > 0) {
                    const promises = toUpdate.map(r => supabasePROD.from('sku_costos').update({ landed_cost: r.landed_cost, proveedor: r.proveedor, piezas_xcontenedor: r.piezas_xcontenedor }).eq('sku_mdr', r.sku_mdr));
                    const results = await Promise.all(promises);
                    const updateErrors = results.filter(res => res.error);
                    if (updateErrors.length > 0) throw new Error(`Error actualizando sku_costos: ${updateErrors.map(e => e.error?.message).join(', ')}`);
                    updatedSkuCostos = toUpdate.length;
                }
            }

            const summary = `Procesamiento completado. sku_m: ${insertedSkuM + updatedSkuM}, sku_alterno: ${insertedSkuAlterno + updatedSkuAlterno}, sku_costos: ${insertedSkuCostos + updatedSkuCostos}.`;

            toast({
                title: "Datos guardados",
                description: summary,
            });

            clearFile();

        } catch (e: any) {
            console.error("Error saving data to Supabase:", e.message);
            const errorMessage = e.message || "Ocurrió un problema al conectar con la base de datos.";
            setError(`Error al guardar: ${errorMessage}`);
            toast({
                variant: "destructive",
                title: "Error al guardar los datos",
                description: errorMessage,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header>
                    <Link
                        href="/"
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Dashboard
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Carga de SKUs</h1>
                        <p className="text-muted-foreground">
                            Sube y gestiona tus SKUs y costos de forma masiva o individual.
                        </p>
                    </div>
                </header>
                <main>
                    <Card>
                        <CardHeader>
                            <CardTitle>Carga Manual de SKU</CardTitle>
                            <CardDescription>
                                Añade un nuevo SKU directamente desde el formulario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...manualForm}>
                                <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-6">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <FormField
                                            control={manualForm.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>SKU</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. SKU12345" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="sku_mdr"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>SKU MDR</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. SKU_MDR_123" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="cat_mdr"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Categoría MDR</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. RACKS" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="landed_cost"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Landed Cost</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="Ej. 199.99" {...field} onChange={event => field.onChange(event.target.value === '' ? null : event.target.value)} value={field.value ?? ''}/>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="proveedor"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Proveedor</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. Proveedor A" {...field} onChange={event => field.onChange(event.target.value === '' ? null : event.target.value)} value={field.value ?? ''}/>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="piezas_xcontenedor"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Piezas por Contenedor</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="Ej. 100" {...field} onChange={event => field.onChange(event.target.value === '' ? null : event.target.value)} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button type="submit" disabled={isSavingManual}>
                                        {isSavingManual ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Guardar SKU
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Carga Masiva desde Archivo</CardTitle>
                            <CardDescription>
                                Sube un archivo CSV o Excel para añadir múltiples SKUs a la vez.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!fileName ? (
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed border-gray-300 rounded-lg transition-colors ${isProcessing ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary cursor-pointer'}`}
                                >
                                    <div className="flex flex-col items-center justify-center p-12 text-center">
                                        <input {...getInputProps()} />
                                        <Upload className="w-12 h-12 text-muted-foreground" />
                                        {isProcessing ? (
                                            <p className="mt-4 text-lg font-semibold text-primary">Procesando...</p>
                                        ) : isDragActive ? (
                                            <p className="mt-4 text-lg font-semibold text-primary">Suelta el archivo aquí...</p>
                                        ) : (
                                            <>
                                                <p className="mt-4 text-lg font-semibold">Arrastra y suelta un archivo aquí</p>
                                                <p className="mt-1 text-sm text-muted-foreground">o haz clic para seleccionar (CSV, XLS, XLSX)</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="border rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">Archivo cargado:</p>
                                        <p className="text-sm text-muted-foreground">{fileName}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={clearFile} disabled={isSaving || isProcessing}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            )}
                             {error && (
                                <div className="mt-4 text-red-600 font-medium p-4 bg-red-100 border border-red-300 rounded-lg">
                                {error}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                   
                    {isProcessing ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="ml-4 text-lg text-muted-foreground">Validando datos...</p>
                        </div>
                    ) : data.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Vista Previa de SKUs a Guardar (Carga Masiva)</CardTitle>
                                <CardDescription>Se encontraron {data.length} registros válidos en el archivo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-96 w-full overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background">
                                            <TableRow>
                                                {TABLE_HEADERS.map((header, index) => (
                                                    <TableHead key={index}>{header}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.map((row, rowIndex) => (
                                                <TableRow key={rowIndex}>
                                                    {row.map((cell, cellIndex) => (
                                                        <TableCell key={cellIndex}>
                                                           {String(cell)}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button onClick={handleSaveData} disabled={isSaving || isProcessing}>
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {isSaving ? "Guardando..." : `Guardar ${data.length} Registros`}
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}
