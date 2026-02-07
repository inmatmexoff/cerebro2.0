'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Define column headers for the preview table
const TABLE_HEADERS = ['sku', 'cat_mdr', 'sku_mdr'];

export default function CargaSkuPage() {
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

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

                // Data starts from the second row (index 1), skipping headers
                const dataRows = json.slice(1);
                // We map columns A, B, C to our data structure
                const extractedData = dataRows.map(row => [row[0], row[1], row[2]]);
                
                // Filter out rows where any of the first 3 columns are empty
                const validatedData = extractedData.filter(row => row[0] && row[1] && row[2]);
                
                const skippedCount = extractedData.length - validatedData.length;

                if (validatedData.length === 0) {
                     setError("No se encontraron registros válidos a partir de la segunda fila. Asegúrate de que las columnas A, B y C no estén vacías.");
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
            const recordsToInsert = data.map(row => ({
                sku: String(row[0]),
                cat_mdr: String(row[1]),
                sku_mdr: String(row[2]),
            }));

            // Using upsert to avoid duplicates on 'sku' primary key
            // and update existing ones if necessary.
            const { error: upsertError } = await supabasePROD
                .from('sku_m')
                .upsert(recordsToInsert, { onConflict: 'sku' });

            if (upsertError) {
                throw upsertError;
            }

            toast({
                title: "Datos guardados",
                description: `Se guardaron/actualizaron ${recordsToInsert.length} registros de SKU exitosamente.`,
            });

            clearFile();

        } catch (e: any) {
            console.error("Error saving data to Supabase:", e);
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
                            Sube y gestiona tus SKUs de forma masiva desde un archivo CSV o Excel.
                        </p>
                    </div>
                </header>
                <main>
                    {!fileName ? (
                         <Card
                            {...getRootProps()}
                            className={`border-2 border-dashed border-gray-300 transition-colors ${isProcessing ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary cursor-pointer'}`}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
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
                            </CardContent>
                        </Card>
                    ) : (
                         <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Archivo Cargado</CardTitle>
                                        <CardDescription>{fileName}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={clearFile} disabled={isSaving || isProcessing}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                         </Card>
                    )}

                    {error && (
                        <div className="mt-4 text-red-600 font-medium p-4 bg-red-100 border border-red-300 rounded-lg">
                           {error}
                        </div>
                    )}
                   
                    {isProcessing ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="ml-4 text-lg text-muted-foreground">Validando datos...</p>
                        </div>
                    ) : data.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Vista Previa de SKUs a Guardar</CardTitle>
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
                        </Card>
                    )}

                    {data.length > 0 && (
                        <div className="flex justify-center items-center py-8">
                            <Button onClick={handleSaveData} disabled={isSaving || isProcessing}>
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {isSaving ? "Guardando..." : `Guardar ${data.length} Registros`}
                            </Button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
