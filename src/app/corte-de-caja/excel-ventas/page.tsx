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


// Define which columns to extract
const COLUMN_MAPPING: { [key: string]: number } = {
    'A': 0, 'B': 1, 'G': 6, 'H': 7, 'I': 8, 'J': 9, 'K': 10,
    'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'W': 22
};
const COLUMN_INDEXES = Object.values(COLUMN_MAPPING);


const DB_COLUMN_TO_EXCEL_INDEX = {
    num_venta: 0,         // A
    fecha_venta: 1,       // B
    unidades: 2,          // G
    ing_xunidad: 3,       // H
    cargo_venta: 4,       // I
    ing_xenvio: 5,        // J
    costo_envio: 6,       // K
    cargo_difpeso: 7,     // M
    anu_reembolsos: 8,    // N
    total: 9,             // O
    venta_xpublicidad: 10, // P
    sku: 11,              // Q
    num_publi: 12,        // R
    tienda: 13,           // S
    tip_publi: 14,        // W
};

// Helper to parse currency strings like "$ 1,234.50" into numbers
const parseCurrency = (value: any): number | null => {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string' || !value) {
        return null;
    }
    const num = parseFloat(value.replace(/[^0-9.-]+/g,""));
    return isNaN(num) ? null : num;
};

// Helper to parse boolean values
const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return ['si', 'sí', 'yes', 'true', '1'].includes(value.toLowerCase());
    }
    return false; // default to false
};


export default function ExcelVentasPage() {
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) {
            setError("No se seleccionó ningún archivo.");
            return;
        }

        setFileName(file.name);
        setError(null);
        setHeaders([]);
        setData([]);

        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const binaryStr = event.target?.result;
                if (!binaryStr) {
                    setError("No se pudo leer el archivo.");
                    return;
                }
                const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (json.length < 7) {
                    setError("El archivo no tiene suficientes filas para extraer datos (se requieren al menos 7).");
                    return;
                }

                const headerRow = json[5] || [];
                const extractedHeaders = COLUMN_INDEXES.map(colIndex => headerRow[colIndex] || `Columna ${colIndex + 1}`);

                const extractedData = json.slice(6).map(row => {
                    return COLUMN_INDEXES.map(colIndex => row[colIndex]);
                }).filter(row => row.some(cell => cell !== "" && cell !== null && cell !== undefined));

                if (extractedData.length === 0) {
                     setError("No se encontraron datos en las columnas y filas especificadas.");
                     return;
                }
                
                setHeaders(extractedHeaders);
                setData(extractedData);

            } catch (e) {
                console.error(e);
                setError("Hubo un error al procesar el archivo. Asegúrate de que sea un formato de Excel o CSV válido.");
            }
        };

        reader.onerror = () => {
            setError("Error al leer el archivo.");
        }

        reader.readAsBinaryString(file);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
    });

    const clearFile = () => {
        setFileName(null);
        setHeaders([]);
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
            const recordsToInsert = data.map(row => {
                const saleDateValue = row[DB_COLUMN_TO_EXCEL_INDEX.fecha_venta];
                let saleDate: Date | null = null;
                if (saleDateValue instanceof Date) {
                    saleDate = saleDateValue;
                } else if (typeof saleDateValue === 'string') {
                    const parsed = new Date(saleDateValue);
                    if (!isNaN(parsed.getTime())) saleDate = parsed;
                } else if (typeof saleDateValue === 'number') {
                    saleDate = new Date(Math.round((saleDateValue - 25569) * 86400 * 1000));
                }

                return {
                    num_venta: String(row[DB_COLUMN_TO_EXCEL_INDEX.num_venta] || ''),
                    fecha_venta: saleDate ? saleDate.toISOString() : null,
                    unidades: parseInt(String(row[DB_COLUMN_TO_EXCEL_INDEX.unidades]), 10) || null,
                    ing_xunidad: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.ing_xunidad]),
                    cargo_venta: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.cargo_venta]),
                    ing_xenvio: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.ing_xenvio]),
                    costo_envio: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.costo_envio]),
                    cargo_difpeso: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.cargo_difpeso]),
                    anu_reembolsos: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.anu_reembolsos]),
                    total: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.total]),
                    venta_xpublicidad: parseBoolean(row[DB_COLUMN_TO_EXCEL_INDEX.venta_xpublicidad]),
                    sku: String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''),
                    num_publi: String(row[DB_COLUMN_TO_EXCEL_INDEX.num_publi] || ''),
                    tienda: String(row[DB_COLUMN_TO_EXCEL_INDEX.tienda] || ''),
                    tip_publi: String(row[DB_COLUMN_TO_EXCEL_INDEX.tip_publi] || ''),
                };
            }).filter(record => record.num_venta);

            if (recordsToInsert.length === 0) {
                throw new Error("No se encontraron registros válidos para guardar.");
            }

            const { error: insertError } = await supabasePROD.from('ml_sales').insert(recordsToInsert);

            if (insertError) {
                throw insertError;
            }

            toast({
                title: "Datos guardados",
                description: `Se guardaron ${recordsToInsert.length} registros exitosamente.`,
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
            <div className="max-w-7xl mx-auto space-y-6">
                <header>
                    <Link
                        href="/corte-de-caja"
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Corte de Caja
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Cargar Excel de Ventas</h1>
                        <p className="text-muted-foreground">
                            Sube un archivo para leer, visualizar y guardar los datos de ventas.
                        </p>
                    </div>
                </header>
                <main>
                    {!fileName ? (
                         <Card
                            {...getRootProps()}
                            className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors cursor-pointer"
                        >
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <input {...getInputProps()} />
                                <Upload className="w-12 h-12 text-muted-foreground" />
                                {isDragActive ? (
                                    <p className="mt-4 text-lg font-semibold text-primary">Suelta el archivo aquí...</p>
                                ) : (
                                    <>
                                        <p className="mt-4 text-lg font-semibold">Arrastra y suelta un archivo aquí</p>
                                        <p className="mt-1 text-sm text-muted-foreground">o haz clic para seleccionar un archivo</p>
                                        <p className="mt-4 text-xs text-muted-foreground">Soportado: .xlsx, .xls, .csv</p>
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
                                    <Button variant="ghost" size="icon" onClick={clearFile}>
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
                   
                    {data.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Vista Previa de Datos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[60vh] w-full overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background">
                                            <TableRow>
                                                {headers.map((header, index) => (
                                                    <TableHead key={index}>{header}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.map((row, rowIndex) => (
                                                <TableRow key={rowIndex}>
                                                    {row.map((cell, cellIndex) => (
                                                        <TableCell key={cellIndex}>
                                                           {cell instanceof Date ? cell.toLocaleDateString() : String(cell)}
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

                    <div className="flex justify-center items-center py-8">
                      <Button onClick={handleSaveData} disabled={data.length === 0 || isSaving}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isSaving ? "Guardando..." : "Guardar Datos"}
                      </Button>
                    </div>

                </main>
            </div>
        </div>
    );
}
