'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const TABLE_HEADERS = [
    '# Fila', 'Tienda', '# Venta', 'Fecha Venta', 'Fecha Llegada', 'Producto', 'Motivo Devolución', 'Estado Llegada', 'Reporte', 'Empaquetador', 'Error de Nosotros', 'Observaciones', 'Factura', 'Revisión'
];

// Helper to parse boolean values from various string inputs
const parseBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return ['si', 'sí', 'yes', 'true', '1', 'verdadero'].includes(lowerValue);
  }
  return !!value; // Fallback for numbers or other truthy values
};

// Helper to parse dates which might be strings or Excel serial numbers
const parseDate = (value: any): Date | null => {  
    if (!value) return null;
    if (value instanceof Date) return value;
    
    // Check if it's an Excel serial number
    if (typeof value === 'number') {
        // Excel's epoch starts on 1900-01-01, but has a bug where it thinks 1900 is a leap year.
        // The common workaround is to subtract 1 and start from 1900-01-01, but JS epoch is 1970-01-01.
        // The number of days from 1900-01-01 to 1970-01-01 is 25569.
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        // Check if the year is reasonable (e.g., after 2000)
        if (date.getFullYear() > 2000) {
            return date;
        }
    }
    
    // Try to parse as a string
    const dateFromStr = new Date(value);
    if (!isNaN(dateFromStr.getTime())) {
        return dateFromStr;
    }

    return null;
};


export default function ImportDevolucionesPage() {
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
                    throw new Error("No se pudo leer el archivo.");
                }
                const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (json.length <= 2) {
                    throw new Error("El archivo está vacío o solo contiene filas de encabezado.");
                }

                const dataRows = json.slice(2);
                
                const columnMapping = {
                    tienda: 0, // A
                    num_venta: 1, // B
                    fecha_venta: 2, // C
                    fecha_llegada: 3, // D
                    producto: 5, // F
                    motivo_devo: 6, // G
                    estado_llegada: 7, // H
                    reporte: 8, // I
                    nombre_despacho: 9, // J
                    error_prop: 10, // K
                    observacion: 11, // L
                    factura: 12, // M
                    s_revision: 13, // N
                };

                const extractedData = dataRows.map((row, index) => [
                    index + 1, // Add 1-based row number
                    row[columnMapping.tienda],
                    row[columnMapping.num_venta],
                    row[columnMapping.fecha_venta],
                    row[columnMapping.fecha_llegada],
                    row[columnMapping.producto],
                    row[columnMapping.motivo_devo],
                    row[columnMapping.estado_llegada],
                    row[columnMapping.reporte],
                    row[columnMapping.nombre_despacho],
                    row[columnMapping.error_prop],
                    row[columnMapping.observacion],
                    row[columnMapping.factura],
                    row[columnMapping.s_revision],
                ]);

                // Filter out rows where the "producto" (now at index 5) is empty.
                const validatedData = extractedData.filter(row => String(row[5] || '').trim());
                
                const skippedCount = extractedData.length - validatedData.length;

                if (validatedData.length === 0) {
                     throw new Error("No se encontraron registros válidos. Asegúrate de que la columna 'producto' (F) no esté vacía.");
                }

                if (skippedCount > 0) {
                    toast({
                        title: "Registros omitidos",
                        description: `Se omitieron ${skippedCount} registros porque la columna 'producto' estaba vacía.`
                    });
                }
                
                setData(validatedData);

            } catch (e: any) {
                console.error(e);
                setError(e.message || "Hubo un error al procesar el archivo. Asegúrate de que sea un formato de Excel o CSV válido.");
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
            // Mapping frontend display values to database enum values
            const mapEstadoLlegada = (value: string) => {
                const upperVal = String(value || '').toUpperCase().trim();
                if (upperVal === 'DAÑADO') return 'DANIADO';
                if (upperVal === 'MUY DAÑADO') return 'MUY_DANIADO';
                return upperVal;
            };

            const recordsToSave = data.map(row => ({
                tienda: row[1] || null,
                num_venta: row[2] ? Number(String(row[2]).replace(/[^0-9]/g, '')) : null,
                fecha_venta: parseDate(row[3]),
                fecha_llegada: parseDate(row[4]),
                producto: row[5] || null,
                motivo_devo: row[6] || null,
                estado_llegada: mapEstadoLlegada(row[7]),
                reporte: parseBoolean(row[8]),
                nombre_despacho: row[9] || null,
                error_prop: parseBoolean(row[10]),
                observacion: row[11] || null,
                factura: parseBoolean(row[12]),
                s_revision: row[13] || null,
            }));
            
            const response = await fetch('/api/devoluciones/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ devoluciones: recordsToSave })
            });
    
            const result = await response.json();
    
            if (!response.ok) {
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
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <Link
            href="/devoluciones"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Devoluciones
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Importar Excel de Devoluciones</h1>
            <p className="text-muted-foreground">
              Sube un archivo para registrar múltiples devoluciones a la vez.
            </p>
          </div>
        </header>
        <main>
            <Card>
                <CardHeader>
                    <CardTitle>Carga Masiva desde Archivo</CardTitle>
                    <CardDescription>
                        Sube un archivo CSV o Excel para registrar devoluciones.
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
                        <CardTitle>Vista Previa de Devoluciones a Guardar</CardTitle>
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
                                            {row.map((cell, cellIndex) => {
                                                let displayValue = String(cell ?? '');
                                                if (cell instanceof Date) {
                                                    displayValue = cell.toLocaleDateString('es-MX');
                                                }
                                                return (
                                                <TableCell key={cellIndex}>
                                                   {displayValue}
                                                </TableCell>
                                            )})}
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
                            {isSaving ? "Guardando..." : `Guardar ${data.length} Devoluciones`}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </main>
      </div>
    </div>
  );
}
