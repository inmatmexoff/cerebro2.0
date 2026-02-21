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

//Subset of headers for the preview table
const TABLE_HEADERS = [
    '# Venta', 'Fecha Venta', 'Estado', 'SKU', 'Unidades', 'Total (MXN)', 'Tienda', 'Motivo del resultado'
];

const parseBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return ['si', 'sí', 'yes', 'true', '1', 'verdadero'].includes(lowerValue);
  }
  return !!value;
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;

  // Case 1: Already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  // Case 2: Excel date serial number
  if (typeof value === 'number') {
    // 25569 is the serial number for 1970-01-01
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
     if (!isNaN(date.getTime())) {
        return date;
    }
  }

  // Case 3: String value
  if (typeof value === 'string') {
    const monthMap: { [key: string]: number } = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    };
    
    // Attempt 1: Full Spanish format "17 de febrero de 2026 11:04 hs."
    const fullDateMatch = value.toLowerCase().match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})(?:.*?(\d{1,2}):(\d{2}))?/);
    if (fullDateMatch) {
      const day = parseInt(fullDateMatch[1], 10);
      const monthName = fullDateMatch[2];
      const year = parseInt(fullDateMatch[3], 10);
      const hours = fullDateMatch[4] ? parseInt(fullDateMatch[4], 10) : 0;
      const minutes = fullDateMatch[5] ? parseInt(fullDateMatch[5], 10) : 0;
      const month = monthMap[monthName as keyof typeof monthMap];

      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const date = new Date(year, month, day, hours, minutes);
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    // Attempt 2: Short Spanish format inside a string "... 23 de febrero ..."
    const descriptiveDateMatch = value.toLowerCase().match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/);
    if (descriptiveDateMatch) {
        const day = parseInt(descriptiveDateMatch[1], 10);
        const monthName = descriptiveDateMatch[2];
        const month = monthMap[monthName as keyof typeof monthMap];
        
        if (!isNaN(day) && month !== undefined) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const date = new Date(currentYear, month, day);
            
            if (!isNaN(date.getTime())) {
                // If date is in the past, assume it's for next year.
                if (date < now) {
                    date.setFullYear(currentYear + 1);
                }
                return date;
            }
        }
    }

    // Attempt 3: Standard JS Date parsing as a fallback
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};


const parseNumber = (value: any, isInt: boolean = false): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const valueStr = String(value).trim();
    if (!valueStr) return null;

    const cleanedValue = valueStr.replace(/[^0-9.-]+/g, "");
    if (!cleanedValue) return null;

    const num = isInt ? parseInt(cleanedValue, 10) : parseFloat(cleanedValue);
    return isNaN(num) ? null : num;
}


export default function ImportDevolucionesPage() {
    const [data, setData] = useState<any[]>([]);
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
                
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                if (json.length <= 6) {
                    throw new Error("El archivo no tiene suficientes filas para extraer datos (se requieren al menos 7).");
                }
                
                // Assume data starts from row 7 (index 6)
                const dataRows = json.slice(6);
                
                const columnMapping = {
                    num_venta: 0, // A
                    fecha_venta: 1, // B
                    status: 2, // C
                    desc_status: 3, // D
                    varios_productos: 4, // E
                    kit: 5, // F
                    unidades: 6, // G
                    ing_xunidad: 7, // H
                    cargo_venta: 8, // I
                    ing_xenvio: 9, // J
                    costo_envio: 10, // K
                    costo_envio_medxpeso: 11, // L
                    cargo_difpeso: 12, // M
                    anu_reembolsos: 13, // N
                    total: 14, // O
                    venta_xpublicidad: 15, // P
                    sku: 16, // Q
                    num_publi: 17, // R
                    tienda: 18, // S
                    titulo_publi: 19, // T
                    variante: 20, // U
                    precio_uni_venta: 21, // V
                    tip_publi: 22, // W
                    form_entrega: 46, // AU
                    fecha_camino: 47, // AV
                    fecha_entregado: 48, // AW
                    transportista: 49, // AX
                    num_seguimiento: 50, // AY
                    url_seguimiento: 51, // AZ
                    revisado_ml: 52, // BA
                    fecha_revision: 53, // BB
                    dinero_afavor: 54, // BC
                    resultado: 55, // BD
                    destino: 56, // BE
                    motivo_resultado: 57, // BF
                    reclamo_abierto: 59, // BH
                    reclamo_cerrado: 60, // BI
                    con_mediacion: 61, // BJ
                };

                const extractedData = dataRows.map(row => {
                    return {
                        num_venta: row[columnMapping.num_venta],
                        fecha_venta: row[columnMapping.fecha_venta],
                        status: row[columnMapping.status],
                        desc_status: row[columnMapping.desc_status],
                        varios_productos: row[columnMapping.varios_productos],
                        kit: row[columnMapping.kit],
                        unidades: row[columnMapping.unidades],
                        ing_xunidad: row[columnMapping.ing_xunidad],
                        cargo_venta: row[columnMapping.cargo_venta],
                        ing_xenvio: row[columnMapping.ing_xenvio],
                        costo_envio: row[columnMapping.costo_envio],
                        costo_envio_medxpeso: row[columnMapping.costo_envio_medxpeso],
                        cargo_difpeso: row[columnMapping.cargo_difpeso],
                        anu_reembolsos: row[columnMapping.anu_reembolsos],
                        total: row[columnMapping.total],
                        venta_xpublicidad: row[columnMapping.venta_xpublicidad],
                        sku: row[columnMapping.sku],
                        num_publi: row[columnMapping.num_publi],
                        tienda: row[columnMapping.tienda],
                        titulo_publi: row[columnMapping.titulo_publi],
                        variante: row[columnMapping.variante],
                        precio_uni_venta: row[columnMapping.precio_uni_venta],
                        tip_publi: row[columnMapping.tip_publi],
                        form_entrega: row[columnMapping.form_entrega],
                        fecha_camino: row[columnMapping.fecha_camino],
                        fecha_entregado: row[columnMapping.fecha_entregado],
                        transportista: row[columnMapping.transportista],
                        num_seguimiento: row[columnMapping.num_seguimiento],
                        url_seguimiento: row[columnMapping.url_seguimiento],
                        revisado_ml: row[columnMapping.revisado_ml],
                        fecha_revision: row[columnMapping.fecha_revision],
                        dinero_afavor: row[columnMapping.dinero_afavor],
                        resultado: row[columnMapping.resultado],
                        destino: row[columnMapping.destino],
                        motivo_resultado: row[columnMapping.motivo_resultado],
                        reclamo_abierto: row[columnMapping.reclamo_abierto],
                        reclamo_cerrado: row[columnMapping.reclamo_cerrado],
                        con_mediacion: row[columnMapping.con_mediacion],
                    }
                });

                const validatedData = extractedData.filter(row => String(row.num_venta || '').trim());
                
                const skippedCount = extractedData.length - validatedData.length;

                if (validatedData.length === 0) {
                     throw new Error("No se encontraron registros válidos. Asegúrate de que la columna '# de venta' (A) no esté vacía.");
                }

                if (skippedCount > 0) {
                    toast({
                        title: "Registros omitidos",
                        description: `Se omitieron ${skippedCount} registros porque la columna '# de venta' estaba vacía.`
                    });
                }
                
                setData(validatedData);

            } catch (e: any) {
                console.error(e);
                setError(e.message || "Hubo un error al procesar el archivo. Asegúrate de que sea un formato de Excel o CSV válido y que sigue el formato esperado.");
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
            const recordsToSave = data.map(row => ({
                num_venta: row.num_venta ? String(row.num_venta) : null,
                fecha_venta: parseDate(row.fecha_venta),
                status: row.status ? String(row.status) : null,
                desc_status: row.desc_status ? String(row.desc_status) : null,
                varios_productos: parseBoolean(row.varios_productos),
                kit: parseBoolean(row.kit),
                unidades: parseNumber(row.unidades, true),
                ing_xunidad: parseNumber(row.ing_xunidad),
                cargo_venta: parseNumber(row.cargo_venta),
                ing_xenvio: parseNumber(row.ing_xenvio),
                costo_envio: parseNumber(row.costo_envio),
                costo_envio_medxpeso: parseNumber(row.costo_envio_medxpeso),
                cargo_difpeso: parseNumber(row.cargo_difpeso),
                anu_reembolsos: parseNumber(row.anu_reembolsos),
                total: parseNumber(row.total),
                venta_xpublicidad: parseBoolean(row.venta_xpublicidad),
                sku: row.sku ? String(row.sku) : null,
                num_publi: row.num_publi ? String(row.num_publi) : null,
                tienda: row.tienda ? String(row.tienda) : null,
                titulo_publi: row.titulo_publi ? String(row.titulo_publi) : null,
                variante: row.variante ? String(row.variante) : null,
                precio_uni_venta: parseNumber(row.precio_uni_venta),
                tip_publi: row.tip_publi ? String(row.tip_publi) : null,
                form_entrega: row.form_entrega ? String(row.form_entrega) : null,
                fecha_camino: parseDate(row.fecha_camino),
                fecha_entregado: parseDate(row.fecha_entregado),
                transportista: row.transportista ? String(row.transportista) : null,
                num_seguimiento: row.num_seguimiento ? String(row.num_seguimiento) : null,
                url_seguimiento: row.url_seguimiento ? String(row.url_seguimiento) : null,
                revisado_ml: parseBoolean(row.revisado_ml),
                fecha_revision: parseDate(row.fecha_revision),
                dinero_afavor: row.dinero_afavor ? String(row.dinero_afavor) : null,
                resultado: row.resultado ? String(row.resultado) : null,
                destino: row.destino ? String(row.destino) : null,
                motivo_resultado: row.motivo_resultado ? String(row.motivo_resultado) : null,
                reclamo_abierto: parseBoolean(row.reclamo_abierto),
                reclamo_cerrado: parseNumber(row.reclamo_cerrado, true),
                con_mediacion: parseBoolean(row.con_mediacion),
            }));
            
            const response = await fetch('/api/devoluciones/import-ml', {
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
            <h1 className="text-3xl font-bold">Importar Devoluciones de Mercado Libre</h1>
            <p className="text-muted-foreground">
              Sube el archivo de Excel con el reporte de devoluciones de ML.
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
                                            <TableCell>{row.num_venta}</TableCell>
                                            <TableCell>{row.fecha_venta ? (parseDate(row.fecha_venta)?.toLocaleDateString('es-MX') || 'Fecha Inválida') : '-'}</TableCell>
                                            <TableCell>{row.status}</TableCell>
                                            <TableCell>{row.sku}</TableCell>
                                            <TableCell>{row.unidades}</TableCell>
                                            <TableCell>{row.total}</TableCell>
                                            <TableCell>{row.tienda}</TableCell>
                                            <TableCell>{row.motivo_resultado}</TableCell>
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
