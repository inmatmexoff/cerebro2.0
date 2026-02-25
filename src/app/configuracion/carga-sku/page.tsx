'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, X, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Define column headers for the preview table
const TABLE_HEADERS = ['sku', 'NOMBRE MADRE', 'Categoría Madre', 'Sub-Categoría', 'landed_cost', 'piezas_xcontenedor', 'esti_time', 'piezas_por_sku', 'proveedor'];

const manualSkuSchema = z.object({
    sku: z.string().min(1, { message: "SKU es requerido." }),
    sku_mdr: z.string().min(1, { message: "NOMBRE MADRE es requerido." }),
    cat_mdr: z.string().min(1, { message: "Categoría Madre es requerida." }),
    sub_categoria: z.string().optional().nullable(),
    landed_cost: z.coerce.number().optional().nullable(),
    proveedor: z.string().optional().nullable(),
    piezas_xcontenedor: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
    esti_time: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
    piezas_por_sku: z.coerce.number().int({ message: "Debe ser un número entero." }).positive({ message: "Debe ser un número positivo."}).optional().nullable(),
});

export default function CargaSkuPage() {
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const [uploadType, setUploadType] = useState<'oficial' | 'alterno'>('oficial');

    const [isSavingManual, setIsSavingManual] = useState(false);
    const manualForm = useForm<z.infer<typeof manualSkuSchema>>({
        resolver: zodResolver(manualSkuSchema),
        defaultValues: {
            sku: '',
            sku_mdr: '',
            cat_mdr: '',
            sub_categoria: '',
            landed_cost: null,
            proveedor: '',
            piezas_xcontenedor: null,
            esti_time: null,
            piezas_por_sku: null
        },
    });

    const handleDownloadTemplate = () => {
        const headers = [
            'sku',                // A
            'cat_mdr',            // B
            'sku_mdr',            // C
            'sub_categoria',      // D
            'landed_cost',        // E
            'piezas_por_sku',     // F
            'esti_time',          // G
            'piezas_xcontenedor', // H
            'proveedor',          // I
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla SKUs');
        XLSX.writeFile(wb, 'plantilla_carga_sku.xlsx');
    };

    async function onManualSubmit(values: z.infer<typeof manualSkuSchema>) {
        setIsSavingManual(true);
        try {
            const response = await fetch('/api/skus/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [values], type: uploadType })
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                throw new Error(result.message || 'Error en el servidor');
            }
    
            toast({ title: "Éxito", description: `SKU ${values.sku} ha sido guardado/actualizado.` });
            manualForm.reset();

        } catch (e: any) {
            console.error("Error saving manual SKU:", e.message);
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
                // Mapeo de columnas: sku (A->0), NOMBRE MADRE (C->2), Categoría Madre (B->1), Sub-Categoría (D->3), landed_cost (E->4), piezas_xcontenedor (H->7), esti_time (G->6), piezas_por_sku (F->5), proveedor (I->8)
                const extractedData = dataRows.map(row => [row[0], row[2], row[1], row[3], row[4], row[7], row[6], row[5], row[8]]);
                
                // Filter out rows where essential columns are empty
                const validatedData = extractedData.filter(row => 
                    String(row[0] || '').trim() && // sku
                    String(row[1] || '').trim() && // NOMBRE MADRE
                    String(row[2] || '').trim()    // Categoría Madre
                );
                
                const skippedCount = extractedData.length - validatedData.length;

                if (validatedData.length === 0) {
                     setError("No se encontraron registros válidos. Asegúrate de que las columnas A (sku), C (NOMBRE MADRE) y B (Categoría Madre) no estén vacías a partir de la segunda fila.");
                     setIsProcessing(false);
                     return;
                }

                if (skippedCount > 0) {
                    toast({
                        title: "Registros omitidos",
                        description: `Se omitieron ${skippedCount} registros porque una de las columnas esenciales (sku, NOMBRE MADRE, Categoría Madre) estaba vacía.`
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
    }, [toast, uploadType]);

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
            const recordsToSave = data.map(row => ({
                sku: String(row[0] || '').trim(),
                sku_mdr: String(row[1] || '').trim(),
                cat_mdr: String(row[2] || '').trim(),
                sub_categoria: String(row[3] || '').trim(),
                landed_cost: row[4], 
                piezas_xcontenedor: row[5],
                proveedor: row[8] || null,
                esti_time: row[6],
                piezas_por_sku: row[7],
            }));

            const response = await fetch('/api/skus/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: recordsToSave, type: uploadType })
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                if (result.duplicates && Array.isArray(result.duplicates)) {
                    const duplicatesList = result.duplicates.join(', ');
                    throw new Error(`${result.message} SKUs duplicados: ${duplicatesList}`);
                }
                throw new Error(result.message || 'Error en el servidor');
            }

            toast({
                title: "Datos guardados",
                description: result.message,
            });

            clearFile();

        } catch (e: any) {
            console.error("Error saving data:", e.message);
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
                            <CardTitle>Tipo de Carga</CardTitle>
                            <CardDescription>
                                Define si estás cargando SKUs oficiales (1 por SKU MDR) o una lista de SKUs alternos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={uploadType} onValueChange={(value) => setUploadType(value as 'oficial' | 'alterno')} className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="oficial" id="r-oficial" />
                                    <Label htmlFor="r-oficial">SKUs Oficiales</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="alterno" id="r-alterno" />
                                    <Label htmlFor="r-alterno">SKUs Alternos</Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
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
                                                    <FormLabel>NOMBRE MADRE</FormLabel>
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
                                                    <FormLabel>Categoría Madre</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. RACKS" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="sub_categoria"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sub-Categoría</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. Accesorios" {...field} onChange={event => field.onChange(event.target.value === '' ? null : event.target.value)} value={field.value ?? ''}/>
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
                                        <FormField
                                            control={manualForm.control}
                                            name="esti_time"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tiempo Estimado (min)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="Ej. 30" {...field} onChange={event => field.onChange(event.target.value === '' ? null : event.target.value)} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={manualForm.control}
                                            name="piezas_por_sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Piezas por SKU</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="Ej. 50" {...field} onChange={event => field.onChange(event.target.value === '' ? null : event.target.value)} value={field.value ?? ''} />
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
                            <div className="flex justify-between items-center">
                                <CardTitle>Carga Masiva desde Archivo</CardTitle>
                                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar Plantilla
                                </Button>
                            </div>
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
                                        <TableHeader className="sticky top-0 bg-background z-10">
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
