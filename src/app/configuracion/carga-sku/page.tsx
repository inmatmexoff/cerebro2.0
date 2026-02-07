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
const TABLE_HEADERS = ['sku', 'sku_mdr', 'cat_mdr', 'landed_cost'];

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
                // We map columns A, C, B, D to our data structure for display order: sku, sku_mdr, cat_mdr, landed_cost
                const extractedData = dataRows.map(row => [row[0], row[2], row[1], row[3]]);
                
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
            // --- DEDUPLICATION (in-file by sku) ---
            const uniqueSkuMap = new Map<string, any[]>();
            data.forEach(row => {
                const sku = String(row[0]).trim();
                if (sku) {
                    uniqueSkuMap.set(sku, row);
                }
            });
            const dataDedupedInFile = Array.from(uniqueSkuMap.values());
            const duplicatesInFileCount = data.length - dataDedupedInFile.length;

            if (duplicatesInFileCount > 0) {
                toast({
                    title: "SKUs duplicados en archivo",
                    description: `Se omitieron ${duplicatesInFileCount} filas con SKUs duplicados. Se procesará la última aparición de cada uno.`,
                });
            }

            if (dataDedupedInFile.length === 0) {
                setIsSaving(false);
                return;
            }
            
            // --- VALIDATION (against DB for existing skus) ---
            const skusFromFile = dataDedupedInFile.map(row => String(row[0]).trim());
            const { data: existingSkusData, error: fetchError } = await supabasePROD
                .from('sku_m')
                .select('sku')
                .in('sku', skusFromFile);

            if (fetchError) throw fetchError;

            const existingSkusSet = new Set(existingSkusData.map(item => item.sku));

            // Filter out records that already exist in the database, keeping only new ones for sku_m insertion.
            const newSkuData = dataDedupedInFile.filter(row => {
                const sku = String(row[0]).trim();
                return !existingSkusSet.has(sku);
            });
            
            const skippedForDbDuplicationCount = dataDedupedInFile.length - newSkuData.length;
            
            // --- PREPARE RECORDS FOR INSERTION ---
            const skuMRecordsToInsert = newSkuData.map(row => ({
                sku: String(row[0]).trim(),
                cat_mdr: String(row[2]).trim(),
                sku_mdr: String(row[1]).trim(),
            }));

            // Use all de-duplicated data from the file for cost updates.
            const initialSkuCostosRecords = dataDedupedInFile.map(row => {
                const skuMdr = String(row[1]).trim();
                const landedCostRaw = row[3];
                let landedCost: number | null = null;
    
                if (landedCostRaw !== null && landedCostRaw !== undefined) {
                    const valueStr = String(landedCostRaw).trim();
    
                    if (valueStr) {
                        // Aggressively remove anything that isn't a number, a decimal point, or a minus sign.
                        const cleanedValue = valueStr.replace(/[^0-9.-]+/g, "");
    
                        // Check if the cleaned value is a valid number and not just a stray "." or "-"
                        if (cleanedValue && cleanedValue !== "." && cleanedValue !== "-" && !isNaN(parseFloat(cleanedValue))) {
                            landedCost = parseFloat(cleanedValue);
                        }
                    }
                }
    
                return { sku_mdr: skuMdr, landed_cost: landedCost };
            })
            .filter(record => 
                record.sku_mdr &&
                record.landed_cost !== null &&
                record.landed_cost !== 1
            );
                
            const uniqueSkuMdrMap = new Map<string, { sku_mdr: string, landed_cost: number }>();
            initialSkuCostosRecords.forEach(record => {
                if(record.landed_cost !== null) {
                    uniqueSkuMdrMap.set(record.sku_mdr, { sku_mdr: record.sku_mdr, landed_cost: record.landed_cost });
                }
            });
            const skuCostosRecordsToUpsert = Array.from(uniqueSkuMdrMap.values());

            // --- DATABASE OPERATIONS ---
            if (skuMRecordsToInsert.length > 0) {
                const { error: skuMError } = await supabasePROD
                    .from('sku_m')
                    .insert(skuMRecordsToInsert);

                if (skuMError) throw skuMError;
            }

            let costosMessage = "";
            if (skuCostosRecordsToUpsert.length > 0) {
                 // Manual upsert for sku_costos to avoid ON CONFLICT errors if constraint is missing
                const skuMdrsToProcess = skuCostosRecordsToUpsert.map(r => r.sku_mdr);

                const { data: existingCostosData, error: fetchCostosError } = await supabasePROD
                    .from('sku_costos')
                    .select('sku_mdr')
                    .in('sku_mdr', skuMdrsToProcess);

                if (fetchCostosError) throw fetchCostosError;

                const existingCostosSet = new Set(existingCostosData.map(c => c.sku_mdr));

                const costosToInsert = skuCostosRecordsToUpsert.filter(r => !existingCostosSet.has(r.sku_mdr));
                const costosToUpdate = skuCostosRecordsToUpsert.filter(r => existingCostosSet.has(r.sku_mdr));

                if (costosToInsert.length > 0) {
                    const { error: insertError } = await supabasePROD
                        .from('sku_costos')
                        .insert(costosToInsert);
                    if (insertError) throw insertError;
                }

                if (costosToUpdate.length > 0) {
                    const updatePromises = costosToUpdate.map(record =>
                        supabasePROD
                            .from('sku_costos')
                            .update({ landed_cost: record.landed_cost })
                            .eq('sku_mdr', record.sku_mdr)
                    );
                    const results = await Promise.all(updatePromises);
                    const updateErrors = results.filter(res => res.error);
                    if (updateErrors.length > 0) {
                        const errorMessage = updateErrors.map(e => e.error?.message).join('; ');
                        throw new Error(`Error actualizando costos: ${errorMessage}`);
                    }
                }
                
                costosMessage = ` y se actualizaron/insertaron ${skuCostosRecordsToUpsert.length} costos`;
            }

            let description = `Se guardaron ${skuMRecordsToInsert.length} SKUs nuevos${costosMessage}.`;
            if (skippedForDbDuplicationCount > 0) {
                description += ` Se omitieron ${skippedForDbDuplicationCount} SKUs que ya existían.`;
            }
             if (skuMRecordsToInsert.length === 0 && skuCostosRecordsToUpsert.length === 0) {
                description = `No había datos nuevos para guardar. Todos los SKUs ya existen y no había costos válidos para actualizar.`
            } else if (skuMRecordsToInsert.length === 0 && skuCostosRecordsToUpsert.length > 0) {
                description = `No se agregaron SKUs nuevos. Se actualizaron/insertaron ${skuCostosRecordsToUpsert.length} costos.`
            }


            toast({
                title: "Datos guardados",
                description: description,
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
                            Sube y gestiona tus SKUs y costos de forma masiva desde un archivo.
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
