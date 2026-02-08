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
  Columns3,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define which columns to extract
const COLUMN_MAPPING: { [key: string]: number } = {
  A: 0,
  B: 1,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  W: 22,
};
const COLUMN_INDEXES = Object.values(COLUMN_MAPPING);

const DB_COLUMN_TO_EXCEL_INDEX = {
  num_venta: 0, // A
  fecha_venta: 1, // B
  unidades: 2, // G
  ing_xunidad: 3, // H
  cargo_venta: 4, // I
  ing_xenvio: 5, // J
  costo_envio: 6, // K
  cargo_difpeso: 7, // M
  anu_reembolsos: 8, // N
  total: 9, // O
  venta_xpublicidad: 10, // P
  sku: 11, // Q
  num_publi: 12, // R
  tienda: 13, // S
  tip_publi: 14, // W
};

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
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
            'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        
        const cleanedString = value.replace(/\sde\s/g, ' ').replace(/\s?hs\.?/, '').toLowerCase().trim();
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

            if (!isNaN(day) && month !== undefined && !isNaN(year) && !isNaN(hours) && !isNaN(minutes)) {
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
    (acceptedFiles: File[]) => {
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
            return;
          }

          const headerRow = json[5] || [];
          const extractedHeaders = COLUMN_INDEXES.map(
            (colIndex) => headerRow[colIndex] || `Columna ${colIndex + 1}`
          );

          const extractedData = json
            .slice(6)
            .map((row) => {
              return COLUMN_INDEXES.map((colIndex) => row[colIndex]);
            })
            .filter((row) =>
              row.some((cell) => cell !== '' && cell !== null && cell !== undefined)
            );

          if (extractedData.length === 0) {
            setError(
              'No se encontraron datos en las columnas y filas especificadas.'
            );
            return;
          }

          // --- Data enrichment ---
          const skusFromExcel = [
            ...new Set(
              extractedData
                .map((row) => String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''))
                .filter((sku) => sku)
            ),
          ];

          const { data: skuAlternoData, error: skuAlternoError } =
            await supabasePROD
              .from('sku_alterno')
              .select('sku, sku_mdr')
              .in('sku', skusFromExcel);

          if (skuAlternoError) throw skuAlternoError;

          const skuToMdrMap = new Map(
            skuAlternoData.map((item) => [item.sku, item.sku_mdr])
          );
          const mdrs = [
            ...new Set(skuAlternoData.map((item) => item.sku_mdr).filter((mdr) => mdr)),
          ];

          let mdrToPriceMap = new Map();
          if (mdrs.length > 0) {
            const { data: skuCostosData, error: skuCostosError } =
              await supabasePROD
                .from('sku_costos')
                .select('sku_mdr, landed_cost')
                .in('sku_mdr', mdrs);
            if (skuCostosError) throw skuCostosError;
            mdrToPriceMap = new Map(
              skuCostosData.map((item) => [item.sku_mdr, item.landed_cost])
            );
          }

          const enrichedHeaders = [...extractedHeaders, 'Landed Cost', 'Gran Total'];

          const enrichedData = extractedData.map((row) => {
            const sku = String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || '');
            const skuMdr = skuToMdrMap.get(sku);
            const landedCost = skuMdr ? mdrToPriceMap.get(skuMdr) || 0 : 0;

            const totalFromExcel =
              parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.total]) || 0;
            const granTotal = totalFromExcel - landedCost;

            return [...row, landedCost, parseFloat(granTotal.toFixed(2))];
          });

          setHeaders(enrichedHeaders);
          setSelectedColumns(new Set(enrichedHeaders));
          setData(enrichedData);
          // --- End of enrichment ---
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
    if (!skuSearchTerm) {
      return data;
    }
    return data.filter((row) => {
      const sku = String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || '');
      return sku.toLowerCase().includes(skuSearchTerm.toLowerCase());
    });
  }, [data, skuSearchTerm]);

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
      toast({ variant: 'destructive', title: 'Selecciona al menos una columna' });
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
      toast({ variant: 'destructive', title: 'Selecciona al menos una columna' });
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

    try {
      // --- VALIDATION STAGE ---
      const allNumVentasFromExcel = [
        ...new Set(
          data
            .map((row) =>
              String(row[DB_COLUMN_TO_EXCEL_INDEX.num_venta] || '')
            )
            .filter(Boolean)
        ),
      ];
      const allSkusFromExcel = [
        ...new Set(
          data
            .map((row) => String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''))
            .filter(Boolean)
        ),
      ];

      if (allSkusFromExcel.length === 0)
        throw new Error('No se encontraron SKUs en los datos cargados.');
      if (allNumVentasFromExcel.length === 0)
        throw new Error(
          'No se encontraron números de venta válidos en los datos cargados.'
        );

      // Fetch existing sales and SKUs in parallel
      const [
        { data: existingSalesData, error: salesError },
        { data: existingSkusData, error: skusError },
      ] = await Promise.all([
        supabasePROD
          .from('ml_sales')
          .select('num_venta')
          .in('num_venta', allNumVentasFromExcel),
        supabasePROD
          .from('sku_alterno')
          .select('sku')
          .in('sku', allSkusFromExcel),
      ]);

      if (salesError) throw salesError;
      if (skusError) throw skusError;

      const existingNumVentasSet = new Set(
        existingSalesData.map((item) => item.num_venta)
      );
      const existingSkusSet = new Set(existingSkusData.map((item) => item.sku));

      // --- FILTERING STAGE ---
      const validData = data.filter((row) => {
        const sku = String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || '');
        const numVenta = String(row[DB_COLUMN_TO_EXCEL_INDEX.num_venta] || '');
        return existingSkusSet.has(sku) && !existingNumVentasSet.has(numVenta);
      });

      const skippedForSkuCount = data.filter(
        (row) => !existingSkusSet.has(String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''))
      ).length;
      const skippedForDuplicationCount = data.filter(
        (row) =>
          existingSkusSet.has(String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || '')) &&
          existingNumVentasSet.has(
            String(row[DB_COLUMN_TO_EXCEL_INDEX.num_venta] || '')
          )
      ).length;

      const skippedSkus = [
        ...new Set(
          data
            .filter(
              (row) => !existingSkusSet.has(String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''))
            )
            .map((row) => String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''))
        ),
      ];

      if (validData.length === 0) {
        let errorMessage = 'No hay registros nuevos para guardar. ';
        if (skippedForDuplicationCount > 0)
          errorMessage += `Se encontraron ${skippedForDuplicationCount} registros duplicados. `;
        if (skippedForSkuCount > 0)
          errorMessage += `Se encontraron ${skippedForSkuCount} registros con SKUs no existentes.`;
        throw new Error(errorMessage.trim());
      }

      // --- INSERTION STAGE ---
      const recordsToInsert = validData
        .map((row) => {
          const saleDate = parseSaleDate(row[DB_COLUMN_TO_EXCEL_INDEX.fecha_venta]);
          const granTotalValue = row[COLUMN_INDEXES.length + 1];

          return {
            num_venta: String(row[DB_COLUMN_TO_EXCEL_INDEX.num_venta] || ''),
            fecha_venta: saleDate ? saleDate.toISOString() : null,
            unidades:
              parseInt(String(row[DB_COLUMN_TO_EXCEL_INDEX.unidades]), 10) ||
              null,
            ing_xunidad: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.ing_xunidad]),
            cargo_venta: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.cargo_venta]),
            ing_xenvio: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.ing_xenvio]),
            costo_envio: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.costo_envio]),
            cargo_difpeso: parseCurrency(
              row[DB_COLUMN_TO_EXCEL_INDEX.cargo_difpeso]
            ),
            anu_reembolsos: parseCurrency(
              row[DB_COLUMN_TO_EXCEL_INDEX.anu_reembolsos]
            ),
            total: parseCurrency(row[DB_COLUMN_TO_EXCEL_INDEX.total]),
            venta_xpublicidad: parseBoolean(
              row[DB_COLUMN_TO_EXCEL_INDEX.venta_xpublicidad]
            ),
            sku: String(row[DB_COLUMN_TO_EXCEL_INDEX.sku] || ''),
            num_publi: String(row[DB_COLUMN_TO_EXCEL_INDEX.num_publi] || ''),
            tienda: String(row[DB_COLUMN_TO_EXCEL_INDEX.tienda] || ''),
            tip_publi: String(row[DB_COLUMN_TO_EXCEL_INDEX.tip_publi] || ''),
            total_final: parseCurrency(granTotalValue),
          };
        })
        .filter((record) => record.num_venta);

      if (recordsToInsert.length === 0) {
        throw new Error(
          'No se encontraron registros válidos para guardar después de la validación.'
        );
      }

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
        throw new Error(insertError.message);
      }

      // --- NOTIFICATION STAGE ---
      let successDescription = `Se guardaron ${recordsToInsert.length} registros nuevos exitosamente.`;
      if (skippedForDuplicationCount > 0) {
        successDescription += ` Se omitieron ${skippedForDuplicationCount} registros duplicados.`;
      }
      if (skippedForSkuCount > 0) {
        successDescription += ` Se omitieron ${skippedForSkuCount} registros por SKUs no existentes.`;
      }

      toast({
        title: 'Datos guardados',
        description: successDescription,
      });

      if (skippedSkus.length > 0) {
        toast({
          variant: 'default',
          title: 'SKUs Omitidos',
          description: `Los siguientes SKUs no se encontraron: ${skippedSkus
            .slice(0, 3)
            .join(', ')}${skippedSkus.length > 3 ? '...' : ''}`,
        });
      }

      clearFile();
    } catch (e: any) {
      console.error('Error saving data to Supabase:', e.message);
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
    const rowIndex = data.findIndex(r => r === rowToEdit);
    if (rowIndex === -1) return;

    const rowData = rowToEdit;
    const sku = String(rowData[DB_COLUMN_TO_EXCEL_INDEX.sku] || '');
    const originalLandedCost =
      parseCurrency(rowData[COLUMN_INDEXES.length]) || 0;
    setEditingInfo({ rowIndex, sku, originalLandedCost });
    form.reset({
      sku_mdr: '',
      cat_mdr: '',
      landed_cost:
        originalLandedCost > 1 ? originalLandedCost : undefined,
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
        const rowIndex = editingInfo.rowIndex;
        const totalFromExcel =
          parseCurrency(newData[rowIndex][DB_COLUMN_TO_EXCEL_INDEX.total]) || 0;
        const newLandedCost = values.landed_cost;
        const newGranTotal = totalFromExcel - newLandedCost;

        newData[rowIndex][COLUMN_INDEXES.length] = newLandedCost;
        newData[rowIndex][COLUMN_INDEXES.length + 1] = parseFloat(
          newGranTotal.toFixed(2)
        );
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              <Columns3 className="mr-2 h-4 w-4" />
                              Columnas
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="max-h-96 overflow-y-auto"
                          >
                            <DropdownMenuLabel>
                              Seleccionar Columnas
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {headers.map((header) => (
                              <DropdownMenuCheckboxItem
                                key={header}
                                checked={selectedColumns.has(header)}
                                onCheckedChange={(checked) => {
                                  setSelectedColumns((prev) => {
                                    const next = new Set(prev);
                                    if (checked) {
                                      next.add(header);
                                    } else {
                                      next.delete(header);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                {header}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                        {filteredData.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell
                                key={cellIndex}
                                className={cn({
                                  'bg-red-100 text-red-800 font-medium':
                                    headers[cellIndex] === 'Gran Total' &&
                                    typeof cell === 'number' &&
                                    cell < 0,
                                  'bg-green-100 text-green-800 font-medium':
                                    headers[cellIndex] === 'Gran Total' &&
                                    typeof cell === 'number' &&
                                    cell >= 0,
                                })}
                              >
                                {(() => {
                                  if (headers[cellIndex] === 'Landed Cost') {
                                    const landedCost = parseCurrency(cell);
                                    if (
                                      landedCost === 0 ||
                                      landedCost === 1
                                    ) {
                                      return (
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-destructive font-bold">
                                            {String(cell)}
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

                                  return cell instanceof Date
                                    ? cell.toLocaleDateString()
                                    : String(cell);
                                })()}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
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
                      <FormLabel>Landed Cost</FormLabel>
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
