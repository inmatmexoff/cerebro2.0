'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


// Define which columns to extract
const COLUMN_MAPPING: { [key: string]: number } = {
    'A': 0, 'B': 1, 'G': 6, 'H': 7, 'I': 8, 'J': 9, 'K': 10, 'L': 11,
    'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'W': 22
};
const COLUMN_INDEXES = Object.values(COLUMN_MAPPING);


export default function ExcelVentasPage() {
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                const workbook = XLSX.read(binaryStr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Using sheet_to_json with header: 1 to get an array of arrays
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (json.length < 7) {
                    setError("El archivo no tiene suficientes filas para extraer datos (se requieren al menos 7).");
                    return;
                }

                // Get headers from row 6 (index 5)
                const headerRow = json[5] || [];
                const extractedHeaders = COLUMN_INDEXES.map(colIndex => headerRow[colIndex] || `Columna ${colIndex + 1}`);

                // Get data from row 7 onwards (index 6)
                const extractedData = json.slice(6).map(row => {
                    return COLUMN_INDEXES.map(colIndex => row[colIndex]);
                }).filter(row => row.some(cell => cell !== "" && cell !== null && cell !== undefined)); // Filter out empty rows

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
                            Sube un archivo para leer y visualizar los datos de ventas.
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
                                                        <TableCell key={cellIndex}>{cell}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Keep the original button but maybe disable it or change its function */}
                    <div className="flex justify-center items-center py-8">
                      <Button disabled={data.length === 0}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Procesar Datos Cargados
                      </Button>
                    </div>

                </main>
            </div>
        </div>
    );
}
