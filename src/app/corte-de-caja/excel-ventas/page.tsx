'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Save,
  X,
  Loader2,
  Pencil,
  Search,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Checkbox } from '@/components/ui/checkbox';

// Define which columns to extract and in what order
const COLUMN_MAPPING: { [key: string]: number } = {
  A: 0, // num_venta
  B: 1, // fecha_venta
  C: 2, // estado
  G: 6, // unidades
  H: 7, // ing_xunidad
  I: 8, // cargo_venta
  J: 9, // ing_xenvio
  K: 10, // costo_envio
  M: 12, // cargo_difpeso
  N: 13, // anu_reembolsos
  O: 14, // total
  P: 15, // venta_xpublicidad
  Q: 16, // sku
  R: 17, // num_publi
  S: 18, // tienda
  W: 22, // tip_publi
};
const COLUMN_INDEXES = Object.values(COLUMN_MAPPING);

// Helper to parse currency strings like "$ 1,234.50" into numbers
const parseCurrency = (value: any): number | null => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const num = parseFloat(value.replace(/[^0-9.-]+/g, ''));
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

const parseSaleDate = (value: any): Date | null => {
  if (!value) return null;

  // Case 1: Already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  // Case 2: Excel date serial number
  if (typeof value === 'number') {
    // 25569 is the serial number for 1970-01-01
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  // Case 3: String value
  if (typeof value === 'string') {
    // Try parsing Spanish format: "1 de febrero de 2026 23:50 hs."
    const monthMap: { [key: string]: number } = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    };

    const cleanedString = value
      .replace(/\sde\s/g, ' ')
      .replace(/\s?hs\.?/, '')
      .toLowerCase()
      .trim();
    const parts = cleanedString.split(' '); // e.g., ["1", "febrero", "2026", "23:50"]

    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthName = parts[1];
      const year = parseInt(parts[2], 10);
      const timeString = parts[3] || '00:00';
      const timeParts = timeString.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const month = monthMap[monthName];

      if (
        !isNaN(day) &&
        month !== undefined &&
        !isNaN(year) &&
        !isNaN(hours) &&
        !isNaN(minutes)
      ) {
        const date = new Date(year, month, day, hours, minutes);
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Fallback for other standard date string formats
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const formSchema = z.object({
  sku_mdr: z.string().min(1, 'SKU MDR es requerido.'),
  cat_mdr: z.string().min(1, 'Categoría MDR es requerida.'),
  landed_cost: z.coerce
    .number()
    .positive('Landed cost debe ser un número positivo.'),
});

export default function ExcelVentasPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[][]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const [skuSearchTerm, setSkuSearchTerm] = React.useState('');
  const [showOnlyNegative, setShowOnlyNegative] = useState(false);
  const [showOnlyPositive, setShowOnlyPositive] = useState(false);
  const [showHighShippingCost, setShowHighShippingCost] = useState(false);
  const [editingInfo, setEditingInfo] = useState<{
    rowIndex: number;
    sku: string;
    originalLandedCost: number;
  } | null>(null);
  const [isUpdatingCost, setIsUpdatingCost] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set()
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku_mdr: '',
      cat_mdr: '',
      landed_cost: 0,
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        setError('No se seleccionó ningún archivo.');
        return;
      }

      setFileName(file.name);
      setError(null);
      setHeaders([]);
      setData([]);
      setIsProcessing(true);

      const reader = new FileReader();

      reader.onload = async (event: ProgressEvent<FileReader>) => {
        try {
          const binaryStr = event.target?.result;
          if (!binaryStr) {
            setError('No se pudo leer el archivo.');
            setIsProcessing(false);
            return;
          }
          const workbook = XLSX.read(binaryStr, {
            type: 'binary',
            cellDates: true,
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          });

          if (json.length < 7) {
            setError(
              'El archivo no tiene suficientes filas para extraer datos (se requieren al menos 7).'
            );
            setIsProcessing(false);
            return;
          }

          const headerRow = json[5] || [];
          // Define the order and labels for the final headers array
          const finalHeaders = [
            headerRow[COLUMN_MAPPING.A] || 'Nº de venta',
            headerRow[COLUMN_MAPPING.B] || 'Fecha de venta',
            headerRow[COLUMN_MAPPING.C] || 'ESTADO',
            headerRow[COLUMN_MAPPING.G] || 'Unidades',
            headerRow[COLUMN_MAPPING.R] || 'Nº de publicación',
            headerRow[COLUMN_MAPPING.S] || 'Tienda',
            headerRow[COLUMN_MAPPING.W] || 'Tipo de publicación',
            headerRow[COLUMN_MAPPING.Q] || 'SKU',
            'Ingresos por productos (MXN)',
            'Cargo por venta e impuestos (MXN)',
            'Costos de envío (MXN)',
            headerRow[COLUMN_MAPPING.J] || 'Ingresos por envío (MXN)',
            headerRow[COLUMN_MAPPING.M] || 'Cargo por diferencia de peso (MXN)',
            headerRow[COLUMN_MAPPING.N] || 'Anulaciones y reembolsos (MXN)',
            headerRow[COLUMN_MAPPING.P] || 'Venta por Publicidad',
            'Total',
            'Landed Cost Total',
            'Gran Total',
          ];

          setHeaders(finalHeaders);
          setSelectedColumns(new Set(finalHeaders));
          setData([]);

          const dataRows = json
            .slice(6)
            .filter((row) =>
              row.some((cell) => cell !== '' && cell !== null && cell !== undefined)
            );

          if (dataRows.length === 0) {
            setError(
              'No se encontraron datos en las columnas y filas especificadas.'
            );
            setIsProcessing(false);
            return;
          }

          const CHUNK_SIZE = 500;
          const allEnrichedData: any[][] = [];

          for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
            const chunk = dataRows.slice(i, i + CHUNK_SIZE);
            const skusInChunk = [
              ...new Set(
                chunk
                  .map((row) => String(row[COLUMN_MAPPING.Q] || ''))
                  .filter((sku) => sku)
              ),
            ];

            let skuToMdrMap = new Map();
            let mdrToPriceMap = new Map();

            if (skusInChunk.length > 0) {
              const { data: skuAlternoData, error: skuAlternoError } =
                await supabasePROD
                  .from('sku_alterno')
                  .select('sku, sku_mdr')
                  .in('sku', skusInChunk);
              if (skuAlternoError) throw skuAlternoError;
              skuAlternoData.forEach((item) =>
                skuToMdrMap.set(item.sku, item.sku_mdr)
              );

              const foundSkus = new Set(skuAlternoData.map((item) => item.sku));
              const remainingSkus = skusInChunk.filter(
                (sku) => !foundSkus.has(sku)
              );

              if (remainingSkus.length > 0) {
                const { data: skuMData, error: skuMError } = await supabasePROD
                  .from('sku_m')
                  .select('sku, sku_mdr')
                  .in('sku', remainingSkus);
                if (skuMError) throw skuMError;
                skuMData.forEach((item) =>
                  skuToMdrMap.set(item.sku, item.sku_mdr)
                );
              }

              const mdrs = [
                ...new Set(Array.from(skuToMdrMap.values())),
              ].filter((mdr) => mdr);
              if (mdrs.length > 0) {
                const { data: skuCostosData, error: skuCostosError } =
                  await supabasePROD
                    .from('sku_costos')
                    .select('sku_mdr, landed_cost, id')
                    .in('sku_mdr', mdrs)
                    .order('id', { ascending: false });
                if (skuCostosError) throw skuCostosError;
                if (skuCostosData) {
                  for (const item of skuCostosData) {
                    if (!mdrToPriceMap.has(item.sku_mdr)) {
                      mdrToPriceMap.set(item.sku_mdr, item.landed_cost);
                    }
                  }
                }
              }
            }

            const enrichedChunk = chunk.map((row) => {
              const unidades =
                parseInt(String(row[COLUMN_MAPPING.G] || '1')) || 1;
              const sku = String(row[COLUMN_MAPPING.Q] || '');
              const skuMdr = skuToMdrMap.get(sku);
              const landedCostPerUnit = skuMdr
                ? mdrToPriceMap.get(skuMdr) || 0
                : 0;
              const totalLandedCost = landedCostPerUnit * unidades;
              const totalFromExcel =
                parseCurrency(row[COLUMN_MAPPING.O]) || 0;
              const granTotal = totalFromExcel - totalLandedCost;

              return [
                row[COLUMN_MAPPING.A] || '',
                row[COLUMN_MAPPING.B] || '',
                row[COLUMN_MAPPING.C] || '',
                unidades,
                row[COLUMN_MAPPING.R] || '',
                row[COLUMN_MAPPING.S] || '',
                row[COLUMN_MAPPING.W] || '',
                sku,
                parseCurrency(row[COLUMN_MAPPING.H]),
                parseCurrency(row[COLUMN_MAPPING.I]),
                parseCurrency(row[COLUMN_MAPPING.K]),
                parseCurrency(row[COLUMN_MAPPING.J]),
                parseCurrency(row[COLUMN_MAPPING.M]),
                parseCurrency(row[COLUMN_MAPPING.N]),
                parseBoolean(row[COLUMN_MAPPING.P]),
                totalFromExcel,
                totalLandedCost,
                parseFloat(granTotal.toFixed(2)),
              ];
            });

            allEnrichedData.push(...enrichedChunk);
            setData(allEnrichedData.slice());

            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        } catch (e) {
          console.error(e);
          setError(
            "Hubo un error al procesar el archivo. Asegúrate de que sea un formato de Excel o CSV válido y de que las tablas 'sku_alterno' y 'sku_costos' son accesibles."
          );
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Error al leer el archivo.');
        setIsProcessing(false);
      };

      reader.readAsBinaryString(file);
    },
    [toast]
  );

  const filteredData = React.useMemo(() => {
    const granTotalIndex = headers.indexOf('Gran Total');
    const skuIndex = headers.indexOf('SKU');
    const shippingCostIndex = headers.indexOf('Costos de envío (MXN)');

    return data.filter((row) => {
      const skuMatch =
        !skuSearchTerm ||
        (skuIndex !== -1 &&
          String(row[skuIndex] || '')
            .toLowerCase()
            .includes(skuSearchTerm.toLowerCase()));

      const granTotal = granTotalIndex !== -1 ? row[granTotalIndex] : null;
      let granTotalMatch = true;
      if (showOnlyNegative) {
        granTotalMatch = typeof granTotal === 'number' && granTotal < 0;
      } else if (showOnlyPositive) {
        granTotalMatch = typeof granTotal === 'number' && granTotal >= 0;
      }

      const shippingCost =
        shippingCostIndex !== -1 ? row[shippingCostIndex] : null;
      const highShippingCostMatch =
        !showHighShippingCost ||
        (typeof shippingCost === 'number' && shippingCost <= -300);

      return skuMatch && granTotalMatch && highShippingCostMatch;
    });
  }, [
    data,
    skuSearchTerm,
    showOnlyNegative,
    showOnlyPositive,
    showHighShippingCost,
    headers,
  ]);

  const createSumCalculator = (columnName: string) => {
    return React.useMemo(() => {
      const index = headers.indexOf(columnName);
      if (index === -1) return 0;
      return filteredData.reduce((sum, row) => {
        const value = row[index];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }, [filteredData, headers]);
  };

  const granTotalSum = createSumCalculator('Gran Total');
  const landedCostSum = createSumCalculator('Landed Cost Total');
  const ingresosPorProductosSum = createSumCalculator(
    'Ingresos por productos (MXN)'
  );
  const cargoVentaSum = createSumCalculator(
    'Cargo por venta e impuestos (MXN)'
  );
  const costoEnvioSum = createSumCalculator('Costos de envío (MXN)');
  const totalSum = createSumCalculator('Total');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const clearFile = () => {
    setFileName(null);
    setHeaders([]);
    setData([]);
    setError(null);
    setSelectedColumns(new Set());
  };

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos para descargar' });
      return;
    }
    const colsToDownload = headers.filter((h) => selectedColumns.has(h));
    const colIndices = colsToDownload.map((h) => headers.indexOf(h));

    if (colsToDownload.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Selecciona al menos una columna',
      });
      return;
    }

    const csvHeader =
      colsToDownload.map((col) => `"${col}"`).join(',') + '\n';

    const csvBody = filteredData
      .map((row) =>
        colIndices
          .map((index) => {
            let cell = row[index];
            if (cell instanceof Date) {
              return cell.toLocaleDateString('es-MX');
            }
            let cellString = String(cell ?? '');
            if (/[",\n]/.test(cellString)) {
              return `"${cellString.replace(/"/g, '""')}"`;
            }
            return cellString;
          })
          .join(',')
      )
      .join('\n');

    const csvContent = csvHeader + csvBody;
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ventas_preview.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (filteredData.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos para descargar' });
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
    });

    const colsToDownload = headers.filter((h) => selectedColumns.has(h));
    const colIndices = colsToDownload.map((h) => headers.indexOf(h));

    if (colsToDownload.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Selecciona al menos una columna',
      });
      return;
    }

    const tableData = filteredData.map((row) =>
      colIndices.map((index) => {
        const cell = row[index];
        if (cell instanceof Date) {
          return cell.toLocaleDateString('es-MX');
        }
        return String(cell ?? '');
      })
    );

    autoTable(doc, {
      head: [colsToDownload],
      body: tableData,
      styles: { fontSize: 5 },
      headStyles: { fillColor: [27, 94, 32] },
      didDrawPage: function (data) {
        const str = 'Página ' + doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height
          ? pageSize.height
          : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      },
    });

    doc.save('ventas_preview.pdf');
  };

  const handleSaveData = async () => {
    if (data.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay datos para guardar',
        description: 'Carga un archivo y procesa los datos primero.',
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    const newIndices = {
      num_venta: headers.indexOf('Nº de venta'),
      fecha_venta: headers.indexOf('Fecha de venta'),
      status: headers.indexOf('ESTADO'),
      unidades: headers.indexOf('Unidades'),
      ing_xenvio: headers.indexOf('Ingresos por envío (MXN)'),
      cargo_difpeso: headers.indexOf('Cargo por diferencia de peso (MXN)'),
      anu_reembolsos: headers.indexOf('Anulaciones y reembolsos (MXN)'),
      venta_xpublicidad: headers.indexOf('Venta por Publicidad'),
      sku: headers.indexOf('SKU'),
      num_publi: headers.indexOf('Nº de publicación'),
      tienda: headers.indexOf('Tienda'),
      tip_publi: headers.indexOf('Tipo de publicación'),
      total: headers.indexOf('Total'),
      landed_cost: headers.indexOf('Landed Cost Total'),
      ing_xunidad: headers.indexOf('Ingresos por productos (MXN)'),
      cargo_venta: headers.indexOf('Cargo por venta e impuestos (MXN)'),
      costo_envio: headers.indexOf('Costos de envío (MXN)'),
      total_final: headers.indexOf('Gran Total'),
    };

    const CHUNK_SIZE = 500;
    let totalInsertedCount = 0;
    let totalSkippedForDuplication = 0;

    try {
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);

        const allNumVentasFromChunk = [
          ...new Set(
            chunk
              .map((row) => String(row[newIndices.num_venta] || ''))
              .filter(Boolean)
          ),
        ];

        if (allNumVentasFromChunk.length === 0) {
          continue;
        }

        const { data: existingSalesData, error: salesError } =
          await supabasePROD
            .from('ml_sales')
            .select('num_venta')
            .in('num_venta', allNumVentasFromChunk);

        if (salesError) throw salesError;

        const existingNumVentasSet = new Set(
          existingSalesData.map((item) => item.num_venta)
        );

        const validDataInChunk = chunk.filter((row) => {
          const numVenta = String(row[newIndices.num_venta] || '');
          return !existingNumVentasSet.has(numVenta);
        });

        totalSkippedForDuplication += chunk.length - validDataInChunk.length;

        if (validDataInChunk.length === 0) {
          continue; // Nothing to insert in this chunk
        }

        const recordsToInsert = validDataInChunk
          .map((row) => {
            const saleDate = parseSaleDate(row[newIndices.fecha_venta]);
            return {
              num_venta: String(row[newIndices.num_venta] || ''),
              fecha_venta: saleDate ? saleDate.toISOString() : null,
              status: String(row[newIndices.status] || ''),
              unidades: parseInt(String(row[newIndices.unidades]), 10) || null,
              ing_xunidad: parseCurrency(row[newIndices.ing_xunidad]),
              cargo_venta: parseCurrency(row[newIndices.cargo_venta]),
              ing_xenvio: parseCurrency(row[newIndices.ing_xenvio]),
              costo_envio: parseCurrency(row[newIndices.costo_envio]),
              cargo_difpeso: parseCurrency(row[newIndices.cargo_difpeso]),
              anu_reembolsos: parseCurrency(row[newIndices.anu_reembolsos]),
              total: parseCurrency(row[newIndices.total]),
              venta_xpublicidad: parseBoolean(row[newIndices.venta_xpublicidad]),
              sku: String(row[newIndices.sku] || ''),
              num_publi: String(row[newIndices.num_publi] || ''),
              tienda: String(row[newIndices.tienda] || ''),
              tip_publi: String(row[newIndices.tip_publi] || ''),
              total_final: parseCurrency(row[newIndices.total_final]),
            };
          })
          .filter((record) => record.num_venta);

        if (recordsToInsert.length > 0) {
          const { error: insertError } = await supabasePROD
            .from('ml_sales')
            .insert(recordsToInsert);

          if (insertError) {
            if (
              insertError.message.includes(
                'column "total_final" of relation "ml_sales" does not exist'
              )
            ) {
              throw new Error(
                "La columna 'total_final' no existe en la tabla 'ml_sales'. Por favor, añádela antes de guardar."
              );
            }
            if (
              insertError.message.includes(
                'column "status" of relation "ml_sales" does not exist'
              )
            ) {
              throw new Error(
                "La columna 'status' no existe en la tabla 'ml_sales'. Por favor, añádela antes de guardar."
              );
            }
            throw insertError;
          }
          totalInsertedCount += recordsToInsert.length;
        }
      }

      let successMessage = `Se guardaron ${totalInsertedCount} registros nuevos exitosamente.`;
      if (totalSkippedForDuplication > 0) {
        successMessage = `Proceso completado: ${totalInsertedCount} registros nuevos guardados, ${totalSkippedForDuplication} registros duplicados omitidos.`;
      }
      if (totalInsertedCount === 0 && totalSkippedForDuplication > 0) {
        const message = `No hay registros nuevos para guardar. Se encontraron ${totalSkippedForDuplication} registros duplicados.`;
        toast({
          title: 'Proceso completado sin cambios',
          description: message,
        });
        setIsSaving(false);
        return; // Prevent clearing file or showing another toast
      }

      toast({
        title: 'Proceso completado',
        description: successMessage,
      });

      clearFile();
    } catch (e: any) {
      const errorMessage =
        e.message || 'Ocurrió un problema al conectar con la base de datos.';
      setError(`Error al guardar: ${errorMessage}`);
      toast({
        variant: 'destructive',
        title: 'Error al guardar los datos',
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (rowToEdit: any[]) => {
    const rowIndex = data.findIndex((r) => r === rowToEdit);
    if (rowIndex === -1) return;

    const landedCostIndex = headers.indexOf('Landed Cost Total');
    const skuIndex = headers.indexOf('SKU');
    const unidadesHeader = headers.find((h) => /unidades/i.test(h));
    const unidadesIndex = unidadesHeader ? headers.indexOf(unidadesHeader) : -1;

    const rowData = rowToEdit;
    const sku = String(rowData[skuIndex] || '');
    const totalLandedCost = parseCurrency(rowData[landedCostIndex]) || 0;
    const unidades =
      (unidadesIndex !== -1
        ? parseInt(String(rowData[unidadesIndex] || '1'))
        : 1) || 1;
    const perUnitLandedCost = unidades > 0 ? totalLandedCost / unidades : 0;

    setEditingInfo({ rowIndex, sku, originalLandedCost: totalLandedCost });
    form.reset({
      sku_mdr: '',
      cat_mdr: '',
      landed_cost: perUnitLandedCost > 1 ? perUnitLandedCost : undefined,
    });
  };

  async function onUpdateSubmit(values: z.infer<typeof formSchema>) {
    if (!editingInfo) return;
    setIsUpdatingCost(true);
    try {
      const payload = {
        data: [
          {
            sku: editingInfo.sku,
            sku_mdr: values.sku_mdr,
            cat_mdr: values.cat_mdr,
            landed_cost: values.landed_cost,
            proveedor: null,
            piezas_xcontenedor: null,
          },
        ],
      };

      const response = await fetch('/api/skus/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Error actualizando el costo.');
      }

      // Update local state
      setData((currentData) => {
        const newData = [...currentData];
        const rowIndex = editingInfo!.rowIndex;
        const totalIndex = headers.indexOf('Total');
        const landedCostIndex = headers.indexOf('Landed Cost Total');
        const granTotalIndex = headers.indexOf('Gran Total');
        const unidadesHeader = headers.find((h) => /unidades/i.test(h));
        const unidadesIndex = unidadesHeader
          ? headers.indexOf(unidadesHeader)
          : -1;

        const row = newData[rowIndex];

        const totalFromExcel = parseCurrency(row[totalIndex]) || 0;
        const newLandedCostPerUnit = values.landed_cost;
        const unidades =
          (unidadesIndex !== -1
            ? parseInt(String(row[unidadesIndex] || '1'))
            : 1) || 1;
        const newTotalLandedCost = newLandedCostPerUnit * unidades;
        const newGranTotal = totalFromExcel - newTotalLandedCost;

        row[landedCostIndex] = newTotalLandedCost;
        row[granTotalIndex] = parseFloat(newGranTotal.toFixed(2));

        return newData;
      });

      toast({
        title: 'Éxito',
        description: `Costo para SKU ${editingInfo.sku} actualizado.`,
      });

      setEditingInfo(null);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: e.message,
      });
    } finally {
      setIsUpdatingCost(false);
    }
  }

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
              Sube un archivo para leer, visualizar y guardar los datos de
              ventas.
            </p>
          </div>
        </header>
        <main>
          {!fileName ? (
            <Card
              {...getRootProps()}
              className={`border-2 border-dashed border-gray-300  transition-colors ${
                isProcessing
                  ? 'cursor-not-allowed bg-muted/50'
                  : 'hover:border-primary cursor-pointer'
              }`}
            >
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-muted-foreground" />
                {isProcessing ? (
                  <p className="mt-4 text-lg font-semibold text-primary">
                    Procesando archivo...
                  </p>
                ) : isDragActive ? (
                  <p className="mt-4 text-lg font-semibold text-primary">
                    Suelta el archivo aquí...
                  </p>
                ) : (
                  <>
                    <p className="mt-4 text-lg font-semibold">
                      Arrastra y suelta un archivo aquí
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      o haz clic para seleccionar un archivo
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Soportado: .xlsx, .xls, .csv
                    </p>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    disabled={isSaving || isProcessing}
                  >
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
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="ml-4 text-lg text-muted-foreground">
                Analizando datos y calculando totales...
              </p>
            </div>
          ) : (
            data.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Vista Previa de Datos</CardTitle>
                      <CardDescription>
                        Mostrando {filteredData.length} de {data.length}{' '}
                        registros.
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="show-negative"
                            checked={showOnlyNegative}
                            onCheckedChange={(checked) => {
                              setShowOnlyNegative(checked as boolean);
                              if (checked) setShowOnlyPositive(false);
                            }}
                          />
                          <label
                            htmlFor="show-negative"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Mostrar solo negativos
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="show-positive"
                            checked={showOnlyPositive}
                            onCheckedChange={(checked) => {
                              setShowOnlyPositive(checked as boolean);
                              if (checked) setShowOnlyNegative(false);
                            }}
                          />
                          <label
                            htmlFor="show-positive"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Mostrar 0 o positivos
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                           <Checkbox
                            id="show-high-shipping"
                            checked={showHighShippingCost}
                            onCheckedChange={(checked) => {
                              setShowHighShippingCost(checked as boolean);
                            }}
                          />
                          <label
                            htmlFor="show-high-shipping"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Costo Envío &lt;= -$300
                          </label>
                        </div>
                      </div>
                      <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por SKU..."
                          value={skuSearchTerm}
                          onChange={(e) => setSkuSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleDownloadCSV}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          CSV
                        </Button>
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t mt-4">
                    <h4 className="text-sm font-medium mb-2">
                      Resumen de Totales (Filtrado)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">Gran Total</div>
                        <div
                          className={cn(
                            'font-bold text-lg',
                            granTotalSum >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          )}
                        >
                          {granTotalSum.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-bold text-lg text-foreground">
                          {totalSum.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                          Landed Cost Total
                        </div>
                        <div className="font-bold text-lg text-foreground">
                          {landedCostSum.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                          Ingresos x Productos
                        </div>
                        <div className="font-bold text-lg text-foreground">
                          {ingresosPorProductosSum.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                          Cargos x Venta
                        </div>
                        <div className="font-bold text-lg text-foreground">
                          {cargoVentaSum.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                          Costos x Envío
                        </div>
                        <div className="font-bold text-lg text-foreground">
                          {costoEnvioSum.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[60vh] w-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          {headers.map((header, index) => {
                            const id = `select-col-${header.replace(
                              /[^a-zA-Z0-9]/g,
                              '-'
                            )}-${index}`;
                            return (
                              <TableHead key={index}>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={id}
                                    checked={selectedColumns.has(header)}
                                    onCheckedChange={(checked) => {
                                      setSelectedColumns((prev) => {
                                        const next = new Set(prev);
                                        if (checked === true) {
                                          next.add(header);
                                        } else {
                                          next.delete(header);
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                  <label
                                    htmlFor={id}
                                    className="cursor-pointer"
                                  >
                                    {header}
                                  </label>
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((row, rowIndex) => {
                           const shippingCostIndex = headers.indexOf('Costos de envío (MXN)');
                           const shippingCost = shippingCostIndex > -1 ? row[shippingCostIndex] : 0;
                           const isHighShippingCost = typeof shippingCost === 'number' && shippingCost <= -300;

                          return (
                            <TableRow key={rowIndex} className={cn(
                                isHighShippingCost && 'bg-amber-100 hover:bg-amber-200/80 data-[state=selected]:bg-amber-200'
                            )}>
                              {row.map((cell, cellIndex) => (
                                <TableCell
                                  key={cellIndex}
                                  className={cn({
                                    'text-red-800 font-medium':
                                      headers[cellIndex] === 'Gran Total' &&
                                      typeof cell === 'number' &&
                                      cell < 0,
                                    'text-green-800 font-medium':
                                      headers[cellIndex] === 'Gran Total' &&
                                      typeof cell === 'number' &&
                                      cell >= 0,
                                  })}
                                >
                                  {(() => {
                                    if (
                                      headers[cellIndex] === 'Landed Cost Total'
                                    ) {
                                      const totalLandedCost =
                                        parseCurrency(cell) || 0;
                                      const unidadesHeader = headers.find((h) =>
                                        /unidades/i.test(h)
                                      );
                                      const unidadesIndex = unidadesHeader
                                        ? headers.indexOf(unidadesHeader)
                                        : -1;
                                      const unidades =
                                        (unidadesIndex > -1
                                          ? row[unidadesIndex]
                                          : 1) || 1;
                                      const landedCostPerUnit =
                                        unidades > 0
                                          ? totalLandedCost / unidades
                                          : 0;

                                      if (
                                        landedCostPerUnit === 0 ||
                                        landedCostPerUnit === 1
                                      ) {
                                        return (
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-destructive font-bold">
                                              {totalLandedCost.toLocaleString(
                                                'es-MX',
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }
                                              )}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() =>
                                                handleEditClick(row)
                                              }
                                            >
                                              <Pencil className="h-4 w-4 text-primary" />
                                            </Button>
                                          </div>
                                        );
                                      }
                                    }

                                    if (cell instanceof Date) {
                                      return cell.toLocaleDateString('es-MX', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                      });
                                    }

                                    if (typeof cell === 'number') {
                                      return cell.toLocaleString('es-MX', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      });
                                    }
                                    if (typeof cell === 'boolean') {
                                        return cell ? 'Sí' : 'No';
                                    }

                                    return String(cell ?? '');
                                  })()}
                                </TableCell>
                              ))}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          <div className="flex justify-center items-center py-8">
            <Button
              onClick={handleSaveData}
              disabled={data.length === 0 || isSaving || isProcessing}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Guardando...' : 'Guardar Datos'}
            </Button>
          </div>
        </main>
        <Dialog
          open={!!editingInfo}
          onOpenChange={(isOpen) => !isOpen && setEditingInfo(null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Costo de Producto</DialogTitle>
              <DialogDescription>
                Actualiza el costo y la información para el SKU:{' '}
                <span className="font-bold">{editingInfo?.sku}</span>
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onUpdateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="landed_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landed Cost (por unidad)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                <DialogFooter>
                  <Button type="submit" disabled={isUpdatingCost}>
                    {isUpdatingCost ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
