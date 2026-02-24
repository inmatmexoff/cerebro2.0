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
  Filter,
  AlertTriangle,
  ChevronsUpDown,
  Copy,
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
  TableFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
};

const formSchema = z.object({
  sku_mdr: z.string().min(1, 'NOMBRE MADRE es requerido.'),
  cat_mdr: z.string().min(1, 'Categoría Madre es requerida.'),
  landed_cost: z.coerce
    .number()
    .positive('Landed cost debe ser un número positivo.'),
});

const manualEntrySchema = z.object({
  costoVentaML: z.coerce.number().optional().nullable(),
  cargoVenta: z.coerce.number().optional().nullable(),
  costoEnvio: z.coerce.number().optional().nullable(),
});

type ColorSummarySortKey = 'count' | 'publications' | 'skus' | 'unidades' | 'total' | 'percentageOfTotal' | 'pedidos' | 'porcentaje_pedidos_rango' | 'porcentaje_unidades_rango' | 'utilidad_promedio_por_pedido_rango';
type SkuSummarySortKey = 'sku' | 'unidades' | 'totalPorUnidad' | 'total' | 'porcentajeDelTotal';

export default function ExcelVentasPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[][]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [progress, setProgress] = React.useState(0);

  const [skuSearchTerm, setSkuSearchTerm] = React.useState('');
  const [granTotalFilter, setGranTotalFilter] = useState<'all' | 'negative' | 'positive' | 'low_profit'>('all');
  const [showHighShippingCost, setShowHighShippingCost] = useState(false);
  const [isRowColoringActive, setIsRowColoringActive] = useState(true);
  const [editingInfo, setEditingInfo] = useState<{
    rowIndex: number;
    sku: string;
    originalLandedCost: number;
  } | null>(null);
  const [manualEntryInfo, setManualEntryInfo] = useState<{ rowIndex: number; rowData: any[] } | null>(null);

  const [isUpdatingCost, setIsUpdatingCost] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set()
  );
  const [filteredPublications, setFilteredPublications] = useState<string[]>([]);
  const [filteredSkus, setFilteredSkus] = useState<string[]>([]);
  const [skuSummary, setSkuSummary] = useState<any[]>([]);
  const [colorSummary, setColorSummary] = useState<any[]>([]);
  const [markupFilter, setMarkupFilter] = useState<'all' | 'darkGreen' | 'lightGreen' | 'orange' | 'yellow' | 'red'>('all');
  const [activeTab, setActiveTab] = useState<'sku' | 'color' | 'subcategoria'>('color');
  const [validationIssues, setValidationIssues] = useState<{ emptySkus: { rows: number[] }, invalidLandedCosts: { rows: number[] } } | null>(null);

  const [colorSummarySort, setColorSummarySort] = useState<{ key: ColorSummarySortKey; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });
  const [skuSummarySort, setSkuSummarySort] = React.useState<{ key: SkuSummarySortKey; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });
  const [totalUniquePubs, setTotalUniquePubs] = React.useState(0);
  const [totalUniqueSkus, setTotalUniqueSkus] = React.useState(0);
  const [totalUniquePedidos, setTotalUniquePedidos] = React.useState(0);
  const [totalUnidades, setTotalUnidades] = React.useState(0);
  const [executiveKpis, setExecutiveKpis] = React.useState({
    gananciaPromedioPorPedido: 0,
    utilidadPromedioPorUnidad: 0,
    porcentajePedidosMargenBajo: 0,
  });

  const groupedSkuSummary = React.useMemo(() => {
    if (!skuSummary) return {};
    return skuSummary.reduce((acc, item) => {
        const sku = item.sku;
        if (!acc[sku]) {
            acc[sku] = [];
        }
        acc[sku].push(item);
        return acc;
    }, {} as {[key: string]: typeof skuSummary});
  }, [skuSummary]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku_mdr: '',
      cat_mdr: '',
      landed_cost: 0,
    },
  });

  const manualEntryForm = useForm<z.infer<typeof manualEntrySchema>>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
        costoVentaML: null,
        cargoVenta: null,
        costoEnvio: null,
    },
  });

  const handleEditClick = async (row: any[]) => {
    const skuIndex = headers.indexOf('SKU');
    const landedCostTotalIndex = headers.indexOf('Landed Cost Total');
    const rowIndex = data.findIndex(d => d[0] === row[0]);

    if (skuIndex === -1 || landedCostTotalIndex === -1 || rowIndex === -1) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontraron las columnas o fila necesarias.' });
      return;
    }

    const sku = row[skuIndex];
    const originalLandedCost = row[landedCostTotalIndex] || 0;
    
    if (!sku) {
        toast({ variant: 'destructive', title: 'SKU no encontrado', description: 'Esta fila no tiene un SKU para editar.' });
        return;
    }

    // Reset form and open dialog immediately
    form.reset({ sku_mdr: '', cat_mdr: '', landed_cost: 0 });
    setEditingInfo({ rowIndex, sku, originalLandedCost });

    // Try to fetch details to pre-fill
    try {
        const response = await fetch(`/api/sku-details/${sku}`);
        if (!response.ok) {
            throw new Error('No se pudieron obtener los detalles del SKU.');
        }
        const details = await response.json();
        form.setValue('sku_mdr', details.sku_mdr || '');
        form.setValue('cat_mdr', details.cat_mdr || '');
        if (details.landed_cost) {
            form.setValue('landed_cost', details.landed_cost);
        }
    } catch (e: any) {
        console.error("Could not fetch SKU details for modal:", e.message);
        toast({
          variant: "default",
          title: "Aviso",
          description: "No se pudieron precargar los detalles del SKU. Puedes introducirlos manualmente.",
        });
    }
  };

  const handleManualEntryClick = (row: any[]) => {
    const rowIndex = data.findIndex(d => d[0] === row[0]);
    if (rowIndex === -1) return;

    const costoVentaMLIndex = headers.indexOf('Costo de Venta en Mercado Libre');
    const cargoVentaIndex = headers.indexOf('Cargo por venta e impuestos (MXN)');
    const costoEnvioIndex = headers.indexOf('Costos de envío (MXN)');

    manualEntryForm.reset({
        costoVentaML: row[costoVentaMLIndex],
        cargoVenta: row[cargoVentaIndex],
        costoEnvio: row[costoEnvioIndex],
    });
    setManualEntryInfo({ rowIndex, rowData: row });
  };

  function onManualEntrySubmit(values: z.infer<typeof manualEntrySchema>) {
    if (!manualEntryInfo) return;

    setData(currentData => {
        const newData = [...currentData];
        const { rowIndex, rowData } = manualEntryInfo;
        
        const rowToUpdate = newData[rowIndex];

        const costoVentaMLIndex = headers.indexOf('Costo de Venta en Mercado Libre');
        const cargoVentaIndex = headers.indexOf('Cargo por venta e impuestos (MXN)');
        const costoEnvioIndex = headers.indexOf('Costos de envío (MXN)');
        const totalIndex = headers.indexOf('Total');

        const originalCostoVentaML = rowData[costoVentaMLIndex] || 0;
        const originalCargoVenta = rowData[cargoVentaIndex] || 0;
        const originalCostoEnvio = rowData[costoEnvioIndex] || 0;

        const newCostoVentaML = values.costoVentaML ?? 0;
        const newCargoVenta = values.cargoVenta ?? 0;
        const newCostoEnvio = values.costoEnvio ?? 0;

        // Costo de Venta en ML (ing_xunidad) is income.
        // Cargo por venta is a cost.
        // Costo de envio is a cost.
        const delta = (newCostoVentaML - originalCostoVentaML) - (newCargoVenta - originalCargoVenta) - (newCostoEnvio - originalCostoEnvio);

        const originalTotal = rowToUpdate[totalIndex] || 0;
        const newTotal = originalTotal + delta;

        rowToUpdate[costoVentaMLIndex] = newCostoVentaML;
        rowToUpdate[cargoVentaIndex] = newCargoVenta;
        rowToUpdate[costoEnvioIndex] = newCostoEnvio;
        if(totalIndex > -1) rowToUpdate[totalIndex] = newTotal;

        // Recalculate derived fields
        const landedCostTotalIndex = headers.indexOf('Landed Cost Total');
        const utilidadBrutaIndex = headers.indexOf('Utilidad Bruta');
        const markupIndex = headers.indexOf('Markup (%)');

        const landedCostTotal = rowToUpdate[landedCostTotalIndex] || 0;
        const newUtilidadBruta = newTotal - landedCostTotal;
        if(utilidadBrutaIndex > -1) rowToUpdate[utilidadBrutaIndex] = parseFloat(newUtilidadBruta.toFixed(2));

        if (markupIndex > -1) {
          const newMarkup = landedCostTotal > 0 ? (newUtilidadBruta / landedCostTotal) * 100 : 0;
          rowToUpdate[markupIndex] = newMarkup;
        }

        return newData;
    });

    toast({
        title: "Éxito",
        description: `Fila ${manualEntryInfo.rowData[0]} actualizada.`,
    });
    setManualEntryInfo(null);
  }

  const handleCopyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copiado',
        description: `"${text}" se ha copiado al portapapeles.`,
      });
    }).catch(err => {
      console.error('Error al copiar al portapapeles:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo copiar el texto.',
      });
    });
  };

  const handleMarkupFilterClick = (filter: 'all' | 'darkGreen' | 'lightGreen' | 'orange' | 'yellow' | 'red') => {
    const newFilter = markupFilter === filter ? 'all' : filter;
    if (newFilter !== 'all') {
        setGranTotalFilter('all');
        setShowHighShippingCost(false);
        setActiveTab('subcategoria');
    } else {
        setActiveTab('color');
    }
    setMarkupFilter(newFilter);
  };

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
      setProgress(0);

      const reader = new FileReader();

      reader.onload = async (event: ProgressEvent<FileReader>) => {
        try {
          const binaryStr = event.target?.result;
          if (!binaryStr) {
            throw new Error('No se pudo leer el archivo.');
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
            throw new Error(
              'El archivo no tiene suficientes filas para extraer datos (se requieren al menos 7).'
            );
          }

          const headerRow = json[5] || [];
          const finalHeaders = [
            'Fila',
            'ID',
            headerRow[COLUMN_MAPPING.B] || 'Fecha de venta',
            headerRow[COLUMN_MAPPING.C] || 'ESTADO',
            headerRow[COLUMN_MAPPING.G] || 'Unidades',
            headerRow[COLUMN_MAPPING.Q] || 'SKU',
            'Subcategoría',
            'Costo de Venta en Mercado Libre',
            'Cargo por venta e impuestos (MXN)',
            'Costos de envío (MXN)',
            headerRow[COLUMN_MAPPING.J] || 'Ingresos por envío (MXN)',
            headerRow[COLUMN_MAPPING.M] || 'Cargo por diferencia de peso (MXN)',
            headerRow[COLUMN_MAPPING.N] || 'Anulaciones y reembolsos (MXN)',
            headerRow[COLUMN_MAPPING.P] || 'Venta por Publicidad',
            headerRow[COLUMN_MAPPING.R] || '# de publicación',
            headerRow[COLUMN_MAPPING.S] || 'Tienda',
            headerRow[COLUMN_MAPPING.W] || 'Tipo de publicación',
            'Total',
            'Landed Cost Total',
            'Utilidad Bruta',
            'Markup (%)',
          ];

          setHeaders(finalHeaders);
          setSelectedColumns(new Set(finalHeaders));
          
          const dataRowsWithMeta = json
            .slice(6)
            .map((row, index) => ({ row, excelRowNum: index + 7 }))
            .filter(({ row }) =>
              row.some((cell) => cell !== '' && cell !== null && cell !== undefined)
            );

          if (dataRowsWithMeta.length === 0) {
            throw new Error(
              'No se encontraron datos en las columnas y filas especificadas.'
            );
          }

          const CHUNK_SIZE = 500;
          const allEnrichedData: any[][] = [];

          // Main loop for fetching and enriching data (0% -> 90%)
          for (let i = 0; i < dataRowsWithMeta.length; i += CHUNK_SIZE) {
            const chunk = dataRowsWithMeta.slice(i, i + CHUNK_SIZE);
            const skusInChunk = [
              ...new Set(
                chunk
                  .map(({ row }) => String(row[COLUMN_MAPPING.Q] || ''))
                  .filter((sku) => sku)
              ),
            ];

            let skuToMdrMap = new Map();
            let mdrToPriceMap = new Map();
            let mdrToSubCatMap = new Map();

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
                 const { data: skuMSubCatData, error: skuMSubCatError } = await supabasePROD
                    .from('sku_m')
                    .select('sku_mdr, sub_cat')
                    .in('sku_mdr', mdrs);
                 if (skuMSubCatError) throw skuMSubCatError;
                 if (skuMSubCatData) {
                    skuMSubCatData.forEach(item => {
                        if(item.sub_cat) mdrToSubCatMap.set(item.sku_mdr, item.sub_cat);
                    });
                 }

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

            const enrichedChunk = chunk.map(({ row, excelRowNum }) => {
              const unidades =
                parseInt(String(row[COLUMN_MAPPING.G] || '1')) || 1;
              const sku = String(row[COLUMN_MAPPING.Q] || '');
              const skuMdr = skuToMdrMap.get(sku);
              const subCat = skuMdr ? mdrToSubCatMap.get(skuMdr) : null;
              const landedCostPerUnit = skuMdr
                ? mdrToPriceMap.get(skuMdr) || 0
                : 0;
              const totalLandedCost = landedCostPerUnit * unidades;
              const totalFromExcel =
                parseCurrency(row[COLUMN_MAPPING.O]) || 0;
              
              let utilidadBruta = totalFromExcel - totalLandedCost;
              const estado = row[COLUMN_MAPPING.C] ? String(row[COLUMN_MAPPING.C]).trim() : '';
              if (totalFromExcel === 0 && !estado.toLowerCase().startsWith('paquete de')) {
                utilidadBruta = 0;
              }

              const markup = totalLandedCost > 0 ? (utilidadBruta / totalLandedCost) * 100 : 0;


              return [
                excelRowNum,
                row[COLUMN_MAPPING.A] || '',
                row[COLUMN_MAPPING.B] || '',
                estado,
                unidades,
                sku,
                subCat,
                parseCurrency(row[COLUMN_MAPPING.H]),
                parseCurrency(row[COLUMN_MAPPING.I]),
                parseCurrency(row[COLUMN_MAPPING.K]),
                parseCurrency(row[COLUMN_MAPPING.J]),
                parseCurrency(row[COLUMN_MAPPING.M]),
                parseCurrency(row[COLUMN_MAPPING.N]),
                parseBoolean(row[COLUMN_MAPPING.P]),
                row[COLUMN_MAPPING.R] || '',
                String(row[COLUMN_MAPPING.S] || ''),
                row[COLUMN_MAPPING.W] || '',
                totalFromExcel,
                totalLandedCost,
                parseFloat(utilidadBruta.toFixed(2)),
                markup,
              ];
            });

            allEnrichedData.push(...enrichedChunk);
            const loopProgress = Math.round(((i + CHUNK_SIZE) / dataRowsWithMeta.length) * 90);
            setProgress(Math.min(loopProgress, 90));

            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          // --- Aggregation Logics (90% -> 99%) ---
          setProgress(92);
          await new Promise((resolve) => setTimeout(resolve, 0));

          const ingresosIndex = finalHeaders.indexOf('Costo de Venta en Mercado Libre');
          const cargoVentaIndex = finalHeaders.indexOf('Cargo por venta e impuestos (MXN)');
          const costoEnvioIndex = finalHeaders.indexOf('Costos de envío (MXN)');
          const landedCostTotalIndex = finalHeaders.indexOf('Landed Cost Total');
          const totalIndex = finalHeaders.indexOf('Total');
          const utilidadBrutaIndex = finalHeaders.indexOf('Utilidad Bruta');
          const estadoIndex = finalHeaders.indexOf('ESTADO');
          const markupIndex = finalHeaders.indexOf('Markup (%)');


          if (ingresosIndex > -1 && cargoVentaIndex > -1 && costoEnvioIndex > -1 && landedCostTotalIndex > -1 && totalIndex > -1 && utilidadBrutaIndex > -1) {
            const isComponentRow = (row: any[]) => {
                const ingresos = row[ingresosIndex];
                const cargoVenta = row[cargoVentaIndex];
                const costoEnvio = row[costoEnvioIndex];
                return (ingresos === null || ingresos === 0) &&
                       (cargoVenta === null || cargoVenta === 0) &&
                       (costoEnvio === null || costoEnvio === 0);
            };
          
            for (let i = 0; i < allEnrichedData.length; i++) {
                const parentRow = allEnrichedData[i];
                const parentTotalValue = parentRow[totalIndex];
                
                const isParentRow = (
                    (parentTotalValue !== null && parentTotalValue !== 0) ||
                    (parentRow[ingresosIndex] !== null && parentRow[ingresosIndex] !== 0) ||
                    (parentRow[cargoVentaIndex] !== null && parentRow[cargoVentaIndex] !== 0) ||
                    (parentRow[costoEnvioIndex] !== null && parentRow[costoEnvioIndex] !== 0)
                ) && parentRow[landedCostTotalIndex] === 0;


                if (isParentRow) {
                    let componentCostSum = 0;
                    
                    let childRowIndex = i + 1;
                    while(childRowIndex < allEnrichedData.length && isComponentRow(allEnrichedData[childRowIndex])) {
                        const componentLandedCost = allEnrichedData[childRowIndex][landedCostTotalIndex] || 0;
                        if (componentLandedCost > 0) {
                          componentCostSum += componentLandedCost;
                        }
                        childRowIndex++;
                    }

                    if (componentCostSum > 0) {
                        const originalParentTotal = parentRow[totalIndex] || 0;
                        parentRow[landedCostTotalIndex] = componentCostSum;
                        const newUtilidadBruta = originalParentTotal - componentCostSum;
                        parentRow[utilidadBrutaIndex] = parseFloat(newUtilidadBruta.toFixed(2));
                        if (markupIndex > -1) {
                            const newMarkup = componentCostSum > 0 ? (newUtilidadBruta / componentCostSum) * 100 : 0;
                            parentRow[markupIndex] = newMarkup;
                        }
                    }
                }
            }
        }
          
          setProgress(96);
          await new Promise((resolve) => setTimeout(resolve, 0));

          if (estadoIndex !== -1 && landedCostTotalIndex !== -1 && utilidadBrutaIndex !== -1 && totalIndex !== -1) {
            for (let i = 0; i < allEnrichedData.length; i++) {
              const row = allEnrichedData[i];
              const estado = row[estadoIndex] ? String(row[estadoIndex]).trim() : '';
      
              const match = estado.match(/Paquete de (\d+)/i);
      
              if (match && match[1]) {
                const packageSize = parseInt(match[1], 10);
                if (!isNaN(packageSize) && packageSize > 0) {
                  let summedLandedCost = 0;
                  for (let j = 1; j <= packageSize && (i + j) < allEnrichedData.length; j++) {
                    const itemRow = allEnrichedData[i + j];
                    const itemLandedCost = itemRow[landedCostTotalIndex] || 0;
                    summedLandedCost += itemLandedCost;
                  }
      
                  allEnrichedData[i][landedCostTotalIndex] = summedLandedCost;
                  const totalFromExcel = allEnrichedData[i][totalIndex] || 0;
                  const newUtilidadBruta = totalFromExcel - summedLandedCost;
                  allEnrichedData[i][utilidadBrutaIndex] = parseFloat(newUtilidadBruta.toFixed(2));

                  if (markupIndex > -1) {
                      const newMarkup = summedLandedCost > 0 ? (newUtilidadBruta / summedLandedCost) * 100 : 0;
                      allEnrichedData[i][markupIndex] = newMarkup;
                  }
                }
              }
            }
          }

          // Final step (99% -> 100%)
          setProgress(99);
          await new Promise((resolve) => setTimeout(resolve, 0));

          const skuIndex = finalHeaders.indexOf('SKU');
          const excelRowNumIndex = 0;

          const issues: { emptySkus: { rows: number[] }, invalidLandedCosts: { rows: number[] } } = {
              emptySkus: { rows: [] },
              invalidLandedCosts: { rows: [] },
          };

          allEnrichedData.forEach(row => {
              const excelRowNum = row[excelRowNumIndex];
              const sku = row[skuIndex];
              const landedCost = row[landedCostTotalIndex];

              if (!sku || String(sku).trim() === '') {
                  issues.emptySkus.rows.push(excelRowNum);
              }
              if (landedCost === 0 || landedCost === 1) {
                  issues.invalidLandedCosts.rows.push(excelRowNum);
              }
          });

          if (issues.emptySkus.rows.length > 0 || issues.invalidLandedCosts.rows.length > 0) {
              setValidationIssues(issues);
          } else {
              setValidationIssues(null);
          }

          setData(allEnrichedData);
          setProgress(100);

        } catch (e: any) {
            console.error(e);
            let specificError = "Hubo un error al procesar el archivo. Asegúrate de que sea un formato de Excel o CSV válido y de que las tablas 'sku_alterno' y 'sku_costos' son accesibles.";
            
            if (e instanceof RangeError || e.message.toLowerCase().includes('memory')) {
               specificError = "El archivo es demasiado grande para ser procesado directamente en el navegador y ha causado un error de memoria. Por favor, intenta con un archivo de menos de 20,000 registros a la vez.";
            }
  
            setError(specificError);
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
  
  const isFiltered = skuSearchTerm || granTotalFilter !== 'all' || showHighShippingCost || markupFilter !== 'all';

  const utilidadBrutaIndex = headers.indexOf('Utilidad Bruta');

  const filteredData = React.useMemo(() => {
    const skuIndex = headers.indexOf('SKU');
    const pubIndex = headers.indexOf('# de publicación');
    const shippingCostIndex = headers.indexOf('Costos de envío (MXN)');
    const markupIndex = headers.indexOf('Markup (%)');


    return data.filter((row) => {
      const searchMatch =
        !skuSearchTerm ||
        (skuIndex !== -1 &&
          String(row[skuIndex] || '')
            .toLowerCase()
            .includes(skuSearchTerm.toLowerCase())) ||
        (pubIndex !== -1 &&
          String(row[pubIndex] || '')
            .toLowerCase()
            .includes(skuSearchTerm.toLowerCase())) ||
        (String(row[0] || '').toLowerCase().includes(skuSearchTerm.toLowerCase()));

      let utilidadBrutaMatch = true;
      const utilidadBrutaValue = row[utilidadBrutaIndex];
      if (granTotalFilter === 'negative') {
        utilidadBrutaMatch = typeof utilidadBrutaValue === 'number' && utilidadBrutaValue < 0;
      } else if (granTotalFilter === 'positive') {
        utilidadBrutaMatch = typeof utilidadBrutaValue === 'number' && utilidadBrutaValue >= 0;
      } else if (granTotalFilter === 'low_profit') {
        utilidadBrutaMatch = typeof utilidadBrutaValue === 'number' && utilidadBrutaValue < 30;
      }

      const shippingCost =
        shippingCostIndex !== -1 ? row[shippingCostIndex] : null;
      const highShippingCostMatch =
        !showHighShippingCost ||
        (typeof shippingCost === 'number' && shippingCost <= -300);

      let markupMatch = true;
      if (markupFilter !== 'all') {
          const markupValue = markupIndex !== -1 ? row[markupIndex] : null;
          const utilidadBruta = utilidadBrutaIndex > -1 ? row[utilidadBrutaIndex] : null;
          if (typeof markupValue === 'number') {
              switch (markupFilter) {
                  case 'darkGreen':
                      markupMatch = markupValue >= 30;
                      break;
                  case 'lightGreen':
                      markupMatch = markupValue >= 20 && markupValue < 30;
                      break;
                  case 'orange':
                      markupMatch = markupValue >= 10 && markupValue < 20;
                      break;
                  case 'yellow':
                      markupMatch = markupValue >= 5 && markupValue < 10;
                      break;
                  case 'red':
                      markupMatch = markupValue < 5 && utilidadBruta !== 0;
                      break;
              }
          } else {
            markupMatch = markupFilter === 'red' && utilidadBruta !== 0;
          }
      }

      return searchMatch && utilidadBrutaMatch && highShippingCostMatch && markupMatch;
    });
  }, [
    data,
    skuSearchTerm,
    granTotalFilter,
    showHighShippingCost,
    headers,
    markupFilter,
    utilidadBrutaIndex,
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

  const utilidadBrutaSum = createSumCalculator('Utilidad Bruta');
  const unfilteredUtilidadBrutaSum = React.useMemo(() => {
    const index = headers.indexOf('Utilidad Bruta');
    if (index === -1) return 0;
    return data.reduce((sum, row) => {
      const value = row[index];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }, [data, headers]);

  const unfilteredLandedCostSum = React.useMemo(() => {
    const index = headers.indexOf('Landed Cost Total');
    if (index === -1) return 0;
    return data.reduce((sum, row) => {
      const value = row[index];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }, [data, headers]);

  const unfilteredIngresosPorProductosSum = React.useMemo(() => {
    const index = headers.indexOf('Costo de Venta en Mercado Libre');
    if (index === -1) return 0;
    return data.reduce((sum, row) => {
      const value = row[index];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }, [data, headers]);

  const subCategorySummary = React.useMemo(() => {
    if (filteredData.length === 0) return [];
    const subCatIndex = headers.indexOf('Subcategoría');
    const utilidadBrutaIndex = headers.indexOf('Utilidad Bruta');
    const landedCostTotalIndex = headers.indexOf('Landed Cost Total');

    if (subCatIndex === -1 || utilidadBrutaIndex === -1 || landedCostTotalIndex === -1) return [];

    const summary = filteredData.reduce((acc, sale) => {
        const subCat = sale[subCatIndex] || 'Sin Subcategoría';
        if (!acc[subCat]) {
            acc[subCat] = { totalUtilidad: 0, totalLandedCost: 0, count: 0 };
        }

        const utilidad = sale[utilidadBrutaIndex];
        const landedCost = sale[landedCostTotalIndex];

        if (typeof utilidad === 'number') {
            acc[subCat].totalUtilidad += utilidad;
        }
        if (typeof landedCost === 'number' && landedCost > 0) { // Only include landed cost if it's positive to avoid division by zero or weird results
            acc[subCat].totalLandedCost += landedCost;
        }
        acc[subCat].count += 1;
        return acc;
    }, {} as Record<string, { totalUtilidad: number; totalLandedCost: number; count: number }>);

    return Object.entries(summary).map(([subCategory, data]) => ({
        subCategory,
        averageMarkup: data.totalLandedCost > 0 ? (data.totalUtilidad / data.totalLandedCost) * 100 : 0,
        count: data.count,
    })).sort((a, b) => b.averageMarkup - a.averageMarkup);
  }, [filteredData, headers]);


  React.useEffect(() => {
    if (data.length > 0) {
      const pubIndex = headers.indexOf('# de publicación');
      const skuIndex = headers.indexOf('SKU');
      const unidadesIndex = headers.indexOf('Unidades');
      const markupIndex = headers.indexOf('Markup (%)');
      const idIndex = headers.indexOf('ID');
  
      if (pubIndex > -1 && skuIndex > -1 && unidadesIndex > -1 && utilidadBrutaIndex > -1 && markupIndex > -1) {
          const summary: { [key: string]: { pubId: string; sku: string; unidades: number; total: number; } } = {};
          const dataToSummarize = markupFilter === 'all' ? filteredData : filteredData.filter(row => {
            const markupValue = row[markupIndex];
            const utilidadBruta = row[utilidadBrutaIndex];
            if (typeof markupValue !== 'number') {
              if (markupFilter === 'red') return utilidadBruta !== 0;
              return false;
            }
            switch (markupFilter) {
                  case 'darkGreen': return markupValue >= 30;
                  case 'lightGreen': return markupValue >= 20 && markupValue < 30;
                  case 'orange': return markupValue >= 10 && markupValue < 20;
                  case 'yellow': return markupValue >= 5 && markupValue < 10;
                  case 'red': return markupValue < 5 && utilidadBruta !== 0;
                  default: return false;
              }
          });
  
          dataToSummarize.forEach(row => {
              const pubId = String(row[pubIndex] || '').trim();
              const sku = String(row[skuIndex] || '').trim();
              if (pubId || sku) {
                  const key = `${pubId}|${sku}`;
                  if (!summary[key]) {
                      summary[key] = { pubId: pubId || '-', sku: sku || '-', unidades: 0, total: 0 };
                  }
                  const unidades = parseInt(String(row[unidadesIndex])) || 0;
                  const total = row[utilidadBrutaIndex] as number || 0;
                  summary[key].unidades += unidades;
                  summary[key].total += total;
              }
          });
  
          const summaryValues = Object.values(summary);
          
          const totalOfUtilidadBruta = dataToSummarize.reduce((sum, row) => sum + (row[utilidadBrutaIndex] as number || 0), 0);
  
          const enrichedSummary = summaryValues
            .map(item => {
                const totalPorUnidad = (item.unidades > 0) ? item.total / item.unidades : 0;
                const porcentajeDelTotal = (totalOfUtilidadBruta !== 0) ? (item.total / totalOfUtilidadBruta) * 100 : 0;
                
                return {
                    ...item,
                    totalPorUnidad,
                    porcentajeDelTotal
                };
            });
          
            enrichedSummary.sort((a, b) => {
              const key = skuSummarySort.key;
              if (!key) return 0;
              
              const aValue = a[key as keyof typeof a];
              const bValue = b[key as keyof typeof b];
          
              const direction = skuSummarySort.direction === 'asc' ? 1 : -1;
              
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                  return aValue.localeCompare(bValue) * direction;
              }
          
              if (aValue < bValue) return -1 * direction;
              if (aValue > bValue) return 1 * direction;
              return 0;
          });

          const uniquePubsFromSummary = [...new Set(enrichedSummary.map(item => item.pubId))].filter(Boolean).sort();
          const uniqueSkusFromSummary = [...new Set(enrichedSummary.map(item => item.sku))].filter(Boolean).sort();
  
          setFilteredPublications(uniquePubsFromSummary);
          setFilteredSkus(uniqueSkusFromSummary);
  
          setSkuSummary(enrichedSummary);
  
  
          const summaryByColor = {
              darkGreen: { label: '>= 30%', colorClass: 'bg-green-200 border-green-400', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, count: 0, pedidos: new Set<string>() },
              lightGreen: { label: '20-29.9%', colorClass: 'bg-green-100 border-green-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, count: 0, pedidos: new Set<string>() },
              orange: { label: '10-19.9%', colorClass: 'bg-orange-100 border-orange-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, count: 0, pedidos: new Set<string>() },
              yellow: { label: '5-9.9%', colorClass: 'bg-yellow-100 border-yellow-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, count: 0, pedidos: new Set<string>() },
              red: { label: '< 5%', colorClass: 'bg-red-100 border-red-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, count: 0, pedidos: new Set<string>() },
          };

          const allUniquePubs = new Set<string>();
          const allUniqueSkus = new Set<string>();
          const allUniquePedidos = new Set<string>();
          let currentTotalUnidades = 0;
          
          filteredData.forEach(row => {
              const pubId = String(row[pubIndex] || '').trim();
              const sku = String(row[skuIndex] || '').trim();
              const numVenta = String(row[idIndex] || '').trim();

              if(pubId) allUniquePubs.add(pubId);
              if(sku) allUniqueSkus.add(sku);
              if(numVenta) allUniquePedidos.add(numVenta);
              currentTotalUnidades += parseInt(String(row[unidadesIndex]), 10) || 0;

              const markupValue = row[markupIndex];
              const utilidadBrutaValue = row[utilidadBrutaIndex];
              let category: (typeof summaryByColor)[keyof typeof summaryByColor] | null = null;
      
              if (typeof markupValue === 'number') {
                  if (markupValue >= 30) category = summaryByColor.darkGreen;
                  else if (markupValue >= 20) category = summaryByColor.lightGreen;
                  else if (markupValue >= 10) category = summaryByColor.orange;
                  else if (markupValue >= 5) category = summaryByColor.yellow;
                  else if (markupValue < 5 && utilidadBrutaValue !== 0) category = summaryByColor.red;
              } else if (utilidadBrutaValue !== 0) {
                  category = summaryByColor.red;
              }
      
              if (category) {
                const unidades = parseInt(String(row[unidadesIndex]), 10) || 0;
                const total = utilidadBrutaValue as number || 0;
        
                if (pubId) category.publications.add(pubId);
                if (sku) category.skus.add(sku);
                if (numVenta) category.pedidos.add(numVenta);
                category.unidades += unidades;
                category.total += total;
                category.count += 1;
              }
          });
          
          setTotalUniquePubs(allUniquePubs.size);
          setTotalUniqueSkus(allUniqueSkus.size);
          setTotalUniquePedidos(allUniquePedidos.size);
          setTotalUnidades(currentTotalUnidades);

          const totalPedidos = allUniquePedidos.size;
          const pedidosMargenBajo = summaryByColor.red.pedidos.size;

          setExecutiveKpis({
            gananciaPromedioPorPedido: totalPedidos > 0 ? utilidadBrutaSum / totalPedidos : 0,
            utilidadPromedioPorUnidad: currentTotalUnidades > 0 ? utilidadBrutaSum / currentTotalUnidades : 0,
            porcentajePedidosMargenBajo: totalPedidos > 0 ? (pedidosMargenBajo / totalPedidos) * 100 : 0
          });
  
          const summaryWithPercentage = Object.values(summaryByColor).map(cat => ({
              ...cat,
              percentageOfTotal: utilidadBrutaSum !== 0 ? (cat.total / utilidadBrutaSum) * 100 : 0,
              porcentaje_pedidos_rango: totalPedidos > 0 ? (cat.pedidos.size / totalPedidos) * 100 : 0,
              porcentaje_unidades_rango: currentTotalUnidades > 0 ? (cat.unidades / currentTotalUnidades) * 100 : 0,
              utilidad_promedio_por_pedido_rango: cat.pedidos.size > 0 ? cat.total / cat.pedidos.size : 0,
          }));
  
          setColorSummary(summaryWithPercentage);
      }
    } else {
        setSkuSummary([]);
        setFilteredPublications([]);
        setFilteredSkus([]);
        setColorSummary([]);
        setTotalUniquePubs(0);
        setTotalUniqueSkus(0);
    }
}, [filteredData, headers, utilidadBrutaIndex, data.length, markupFilter, utilidadBrutaSum, skuSummarySort]);

  
  const landedCostSum = createSumCalculator('Landed Cost Total');
  const ingresosPorProductosSum = createSumCalculator(
    'Costo de Venta en Mercado Libre'
  );
  const cargoVentaSum = createSumCalculator(
    'Cargo por venta e impuestos (MXN)'
  );
  const costoEnvioSum = createSumCalculator('Costos de envío (MXN)');
  const totalSum = createSumCalculator('Total');

  const colorCounters = React.useMemo(() => {
    const counters = { darkGreen: 0, lightGreen: 0, orange: 0, yellow: 0, red: 0 };
    if (filteredData.length === 0) return counters;

    const markupIndex = headers.indexOf('Markup (%)');
    if (markupIndex === -1) return counters;

    filteredData.forEach(row => {
      const markupValue = row[markupIndex];
      const utilidadBruta = row[utilidadBrutaIndex];
      if (typeof markupValue === 'number') {
        if (markupValue >= 30) counters.darkGreen++;
        else if (markupValue >= 20) counters.lightGreen++;
        else if (markupValue >= 10) counters.orange++;
        else if (markupValue >= 5) counters.yellow++;
        else if (markupValue < 5) {
            if (utilidadBruta !== 0) counters.red++;
        }
      } else {
        if (utilidadBruta !== 0) counters.red++;
      }
    });

    return counters;
  }, [filteredData, headers, utilidadBrutaIndex]);

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
    setProgress(0);
    setValidationIssues(null);
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

  const handleDownloadXLSX = () => {
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

    const dataToExport = filteredData.map((row) =>
      colIndices.map((index) => {
        const cell = row[index];
        if (cell instanceof Date) {
          return cell.toLocaleDateString('es-MX');
        }
        return cell ?? '';
      })
    );

    const worksheet = XLSX.utils.aoa_to_sheet([colsToDownload, ...dataToExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    XLSX.writeFile(workbook, 'ventas_preview.xlsx');
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
      num_venta: 1,
      fecha_venta: 2,
      status: 3,
      unidades: 4,
      sku: 5,
      sub_cat: 6,
      ing_xunidad: 7,
      cargo_venta: 8,
      costo_envio: 9,
      ing_xenvio: 10,
      cargo_difpeso: 11,
      anu_reembolsos: 12,
      venta_xpublicidad: 13,
      num_publi: 14,
      tienda: 15,
      tip_publi: 16,
      total: 17,
      landed_cost: 18,
      total_final: 19,
      markup: 20,
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
              markup: parseCurrency(row[newIndices.markup]),
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
                'column "markup" of relation "ml_sales" does not exist'
              )
            ) {
              throw new Error(
                "La columna 'markup' no existe en la tabla 'ml_sales'. Por favor, añádela antes de guardar."
              );
            }
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
        const utilidadBrutaIndex = headers.indexOf('Utilidad Bruta');
        const markupIndex = headers.indexOf('Markup (%)');
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
        let newUtilidadBruta = totalFromExcel - newTotalLandedCost;
        
        const estadoIndex = headers.indexOf('ESTADO');
        const estado = (estadoIndex !== -1 && row[estadoIndex]) ? String(row[estadoIndex]).trim() : '';
        if (totalFromExcel === 0 && !estado.toLowerCase().startsWith('paquete de')) {
            newUtilidadBruta = 0;
        }

        row[landedCostIndex] = newTotalLandedCost;
        row[utilidadBrutaIndex] = parseFloat(newUtilidadBruta.toFixed(2));

        if (markupIndex > -1) {
            const newMarkup = newTotalLandedCost > 0 ? ((totalFromExcel - newTotalLandedCost) / newTotalLandedCost) * 100 : 0;
            row[markupIndex] = newMarkup;
        }

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

  const handleColorSummarySort = (key: ColorSummarySortKey) => {
    setColorSummarySort(prev => {
        if (prev.key === key) {
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'desc' };
    });
  };

  const handleSkuSummarySort = (key: SkuSummarySortKey) => {
    setSkuSummarySort(prev => {
        if (prev.key === key) {
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        const newDirection = (key === 'sku' || key === '# de Publicación') ? 'asc' : 'desc';
        return { key, direction: newDirection };
    });
  };

  const sortedColorSummary = React.useMemo(() => {
      if (!colorSummary) return [];
      return [...colorSummary].sort((a, b) => {
          const key = colorSummarySort.key;
          
          let aValue, bValue;

          if (key === 'publications' || key === 'skus' || key === 'pedidos') {
              aValue = a[key].size;
              bValue = b[key].size;
          } else {
              aValue = a[key];
              bValue = b[key];
          }

          if (aValue < bValue) return colorSummarySort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return colorSummarySort.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [colorSummary, colorSummarySort]);

  const handleDownloadSummaryXLSX = () => {
    if (sortedColorSummary.length === 0) {
        toast({ variant: 'destructive', title: 'No hay datos para descargar' });
        return;
    }
    const dataToExport = sortedColorSummary.map(item => ({
        'Color': item.label,
        'Registros': item.count,
        '# de Publicación': item.publications.size,
        "SKU's": item.skus.size,
        'Unidades': item.unidades,
        'Total': item.total,
        '% del Total': `${item.percentageOfTotal.toFixed(2)}%`,
    }));

    const totalRow = {
        'Color': 'Total',
        'Registros': colorSummary.reduce((acc, item) => acc + item.count, 0),
        '# de Publicación': totalUniquePubs,
        "SKU's": totalUniqueSkus,
        'Unidades': colorSummary.reduce((acc, item) => acc + item.unidades, 0),
        'Total': colorSummary.reduce((acc, item) => acc + item.total, 0),
        '% del Total': '100.00%',
    };

    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen Rentabilidad');
    XLSX.writeFile(workbook, 'resumen_rentabilidad.xlsx');
  };

  const handleDownloadSkuSummaryXLSX = () => {
    if (skuSummary.length === 0) {
        toast({ variant: 'destructive', title: 'No hay datos para descargar' });
        return;
    }

    const dataToExport = skuSummary.map(item => ({
        'SKU': item.sku,
        'Unidades': item.unidades,
        'Total x Unidad': item.totalPorUnidad,
        'Total': item.total,
        '% del Total': `${item.porcentajeDelTotal.toFixed(2)}%`,
        '# de Publicación': item.pubId,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen por SKU');
    XLSX.writeFile(workbook, 'resumen_sku.xlsx');
  };

  const handleCopyAllPublications = () => {
    if (filteredPublications.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay publicaciones para copiar',
      });
      return;
    }
    const textToCopy = filteredPublications.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: 'Copiado',
        description: `${filteredPublications.length} números de publicación copiados al portapapeles.`,
      });
    }).catch(err => {
      console.error('Error al copiar publicaciones:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron copiar los números de publicación.',
      });
    });
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
              Sube un archivo para leer, visualizar y guardar los datos de
              ventas.
            </p>
          </div>
        </header>
        <main>
          {!fileName ? (
             <div
              {...getRootProps()}
              className={`border-2 border-dashed border-gray-300 rounded-lg transition-colors ${isProcessing ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary cursor-pointer'}`}
            >
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-muted-foreground" />
                {isDragActive ? (
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
              </div>
            </div>
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
              {isProcessing && (
                <CardContent>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="mt-4 text-lg font-semibold text-primary">
                          Procesando archivo... ({progress}%)
                        </p>
                        <Progress value={progress} className="w-full max-w-sm mt-2" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Por favor espera. Archivos grandes pueden tomar varios
                          minutos.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              )}
            </Card>
          )}

          {error && (
            <div className="mt-4 text-red-600 font-medium p-4 bg-red-100 border border-red-300 rounded-lg">
              {error}
            </div>
          )}
          
          {data.length > 0 && !isProcessing && (
              <>
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Vista Previa de Datos</CardTitle>
                        <CardDescription className="pt-1 text-muted-foreground">
                            {isFiltered ? (
                            <>
                                Mostrando{' '}
                                <span className="font-semibold text-foreground">
                                {filteredData.length}
                                </span>{' '}
                                de {data.length} registros.
                                {data.length > 0 && (
                                    <span className="text-sm text-muted-foreground ml-1">
                                        ({((filteredData.length / data.length) * 100).toFixed(1)}%)
                                    </span>
                                )}
                            </>
                            ) : (
                            <>
                                <span className="font-semibold text-foreground">
                                {data.length}
                                </span>
                                {data.length === 1 ? ' registro' : ' registros'} en
                                total.
                            </>
                            )}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por SKU, Fila o Pub..."
                                value={skuSearchTerm}
                                onChange={(e) => setSkuSearchTerm(e.target.value)}
                                className="pl-8 w-full sm:w-48 h-9"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Filtros
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Filtrar Utilidad Bruta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'negative'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'negative' : 'all');
                                        if (checked) setMarkupFilter('all');
                                    }}
                                >
                                    Mostrar solo negativos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'positive'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'positive' : 'all');
                                        if (checked) setMarkupFilter('all');
                                    }}
                                >
                                    Mostrar 0 o positivos
                                </DropdownMenuCheckboxItem>
                                 <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'low_profit'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'low_profit' : 'all');
                                        if (checked) setMarkupFilter('all');
                                    }}
                                >
                                    Utilidad Bruta &lt; $30
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Otros Filtros</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={showHighShippingCost}
                                    onCheckedChange={(checked) =>
                                        setShowHighShippingCost(checked as boolean)
                                    }
                                >
                                    Costo Envío &lt;= -$300
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center space-x-2">
                            <Switch id="row-coloring" checked={isRowColoringActive} onCheckedChange={setIsRowColoringActive} />
                            <Label htmlFor="row-coloring">Colorear Filas</Label>
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadXLSX}>
                                XLSX
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPDF}>
                                PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-2">
                        Resumen de Totales (Filtrado)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-muted/50 rounded-md">
                          <div className="text-muted-foreground">Utilidad Bruta</div>
                          <div
                            className={cn(
                              'font-bold text-lg',
                              utilidadBrutaSum >= 0
                                ? 'text-green-700'
                                : 'text-red-700'
                            )}
                          >
                            {utilidadBrutaSum.toLocaleString('es-MX', {
                              style: 'currency',
                              currency: 'MXN',
                            })}
                          </div>
                          {isFiltered ? (
                            <div className="flex justify-between items-baseline text-sm mt-1">
                              <span className="text-muted-foreground">
                                de{' '}
                                {unfilteredUtilidadBrutaSum.toLocaleString(
                                  'es-MX',
                                  {
                                    style: 'currency',
                                    currency: 'MXN',
                                  }
                                )}
                              </span>
                              <span className="font-mono font-semibold">
                                {unfilteredUtilidadBrutaSum !== 0
                                  ? `${(
                                      (utilidadBrutaSum /
                                        unfilteredUtilidadBrutaSum) *
                                      100
                                    ).toFixed(1)}%`
                                  : '0.0%'}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  vs Landed Cost
                                </span>
                                <span className="font-mono font-semibold">
                                  {unfilteredLandedCostSum > 0
                                    ? `${(
                                        (unfilteredUtilidadBrutaSum /
                                          unfilteredLandedCostSum) *
                                        100
                                      ).toFixed(1)}%`
                                    : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  vs Costo de Venta en Mercado Libre
                                </span>
                                <span className="font-mono font-semibold">
                                  {unfilteredIngresosPorProductosSum > 0
                                    ? `${(
                                        (unfilteredUtilidadBrutaSum /
                                          unfilteredIngresosPorProductosSum) *
                                        100
                                      ).toFixed(1)}%`
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          )}
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
                            Costo de Venta en Mercado Libre
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
                     <div className="pt-4">
                        <h4 className="text-sm font-medium mb-2">Resumen de Rentabilidad (Filtrado)</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMarkupFilterClick('darkGreen')}>
                                <div className={cn("w-3 h-3 rounded-full bg-green-200 border border-green-400", markupFilter === 'darkGreen' && 'ring-2 ring-primary ring-offset-1')}></div>
                                <span className="font-bold">{colorCounters.darkGreen}</span>
                                <span className="text-muted-foreground">{'>'}=30%</span>
                                <span className="font-semibold text-primary/80">({(colorSummary.find(c => c.label === '>= 30%')?.percentageOfTotal ?? 0).toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMarkupFilterClick('lightGreen')}>
                                <div className={cn("w-3 h-3 rounded-full bg-green-100 border border-green-300", markupFilter === 'lightGreen' && 'ring-2 ring-primary ring-offset-1')}></div>
                                <span className="font-bold">{colorCounters.lightGreen}</span>
                                <span className="text-muted-foreground">20-29.9%</span>
                                <span className="font-semibold text-primary/80">({(colorSummary.find(c => c.label === '20-29.9%')?.percentageOfTotal ?? 0).toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMarkupFilterClick('orange')}>
                                <div className={cn("w-3 h-3 rounded-full bg-orange-100 border border-orange-300", markupFilter === 'orange' && 'ring-2 ring-primary ring-offset-1')}></div>
                                <span className="font-bold">{colorCounters.orange}</span>
                                <span className="text-muted-foreground">10-19.9%</span>
                                <span className="font-semibold text-primary/80">({(colorSummary.find(c => c.label === '10-19.9%')?.percentageOfTotal ?? 0).toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMarkupFilterClick('yellow')}>
                                <div className={cn("w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300", markupFilter === 'yellow' && 'ring-2 ring-primary ring-offset-1')}></div>
                                <span className="font-bold">{colorCounters.yellow}</span>
                                <span className="text-muted-foreground">5-9.9%</span>
                                <span className="font-semibold text-primary/80">({(colorSummary.find(c => c.label === '5-9.9%')?.percentageOfTotal ?? 0).toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMarkupFilterClick('red')}>
                                <div className={cn("w-3 h-3 rounded-full bg-red-100 border border-red-300", markupFilter === 'red' && 'ring-2 ring-primary ring-offset-1')}></div>
                                <span className="font-bold">{colorCounters.red}</span>
                                <span className="text-muted-foreground">{'<'}5%</span>
                                <span className="font-semibold text-primary/80">({(colorSummary.find(c => c.label === '< 5%')?.percentageOfTotal ?? 0).toFixed(1)}%)</span>
                            </div>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="pt-4 mt-4 border-t">
                      <h4 className="text-lg font-semibold mb-2">KPIs Ejecutivos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">Utilidad Promedio por Pedido</p>
                              <p className="text-2xl font-bold">{executiveKpis.gananciaPromedioPorPedido.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">Utilidad Promedio por Unidad</p>
                              <p className="text-2xl font-bold">{executiveKpis.utilidadPromedioPorUnidad.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">% Pedidos con Margen Bajo (&lt;5%)</p>
                              <p className="text-2xl font-bold">{executiveKpis.porcentajePedidosMargenBajo.toFixed(2)}%</p>
                          </div>
                      </div>
                    </div>
                    <div className="h-[70vh] w-full overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mt-6">
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
                            const skuIndex = headers.indexOf('SKU');
                            const shippingCostIndex = headers.indexOf('Costos de envío (MXN)');
                            const shippingCost = shippingCostIndex > -1 ? row[shippingCostIndex] : 0;
                            const isHighShippingCost = typeof shippingCost === 'number' && shippingCost <= -300;
                            const estadoIndex = headers.indexOf('ESTADO');
                            const estadoValue = estadoIndex > -1 ? String(row[estadoIndex] || '') : '';
                            const isPackage = estadoValue.toLowerCase().startsWith('paquete de');
                            const markupIndex = headers.indexOf('Markup (%)');
                            const markupValue = markupIndex > -1 ? row[markupIndex] : null;
                            const utilidadBrutaValue = utilidadBrutaIndex > -1 ? row[utilidadBrutaIndex] : null;
                            const editableColsForManualEntry = [
                                'Costo de Venta en Mercado Libre',
                                'Cargo por venta e impuestos (MXN)',
                                'Costos de envío (MXN)'
                            ];

                            return (
                              <TableRow key={rowIndex} className={cn(
                                  isPackage && 'bg-gray-100 hover:bg-gray-200/80 data-[state=selected]:bg-gray-200',
                                  isHighShippingCost && 'bg-amber-100 hover:bg-amber-200/80 data-[state=selected]:bg-amber-200',
                                  isRowColoringActive && typeof markupValue === 'number' && {
                                    'bg-green-200 hover:bg-green-300/80 data-[state=selected]:bg-green-300': markupValue >= 30,
                                    'bg-green-100 hover:bg-green-200/80 data-[state=selected]:bg-green-200': markupValue >= 20 && markupValue < 30,
                                    'bg-orange-100 hover:bg-orange-200/80 data-[state=selected]:bg-orange-200': markupValue >= 10 && markupValue < 20,
                                    'bg-yellow-100 hover:bg-yellow-200/80 data-[state=selected]:bg-yellow-200': markupValue >= 5 && markupValue < 10,
                                    'bg-red-100 hover:bg-red-200/80 data-[state=selected]:bg-red-200': markupValue < 5 && utilidadBrutaValue !== 0,
                                  },
                                  isRowColoringActive && typeof markupValue !== 'number' && utilidadBrutaValue !== 0 && 'bg-red-100 hover:bg-red-200/80 data-[state=selected]:bg-red-200'
                              )}>
                                {row.map((cell, cellIndex) => {
                                  const header = headers[cellIndex];
                                  
                                  return (
                                  <TableCell
                                    key={cellIndex}
                                    className={cn({
                                      'text-red-800 font-medium':
                                        header === 'Utilidad Bruta' &&
                                        typeof cell === 'number' &&
                                        cell < 0,
                                      'text-green-800 font-medium':
                                        header === 'Utilidad Bruta' &&
                                        typeof cell === 'number' &&
                                        cell >= 0,
                                    },
                                    !isRowColoringActive && header === 'Markup (%)' && (
                                      (typeof cell === 'number' && {
                                        'bg-green-200': cell >= 30,
                                        'bg-green-100': cell >= 20 && cell < 30,
                                        'bg-orange-100': cell >= 10 && cell < 20,
                                        'bg-yellow-100': cell >= 5 && cell < 10,
                                        'bg-red-100': cell < 5 && row[utilidadBrutaIndex] !== 0,
                                      }) || (typeof cell !== 'number' && row[utilidadBrutaIndex] !== 0 && 'bg-red-100')
                                    ))}
                                  >
                                    {(() => {
                                      if (header === '# de publicación' && cell) {
                                        return (
                                          <span
                                            className="cursor-pointer hover:text-primary hover:font-medium"
                                            onClick={() => handleCopyToClipboard(String(cell))}
                                          >
                                            {String(cell)}
                                          </span>
                                        );
                                      }

                                      if (header === 'Fila' && typeof cell === 'number') {
                                        return cell.toFixed(0);
                                      }
                                      
                                      if (
                                        header === 'Landed Cost Total' &&
                                        row[skuIndex] // Check if there is an SKU
                                      ) {
                                        return (
                                          <div className="flex items-center justify-between gap-2">
                                            <span>
                                              {(parseCurrency(cell) ?? 0).toLocaleString(
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

                                      if (editableColsForManualEntry.includes(header) && (cell === null || cell === 0 || cell === '')) {
                                        return (
                                          <div className="flex items-center justify-between gap-2">
                                            <span>{typeof cell === 'number' ? cell.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => handleManualEntryClick(row)}
                                            >
                                              <Pencil className="h-4 w-4 text-primary" />
                                            </Button>
                                          </div>
                                        )
                                      }


                                      if (header === 'Markup (%)' && typeof cell === 'number') {
                                          return `${cell.toFixed(2)}%`;
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
                                  )
                                })}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {validationIssues && (
                  <Card className="mt-6 border-amber-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                        Revisión de Datos
                      </CardTitle>
                      <CardDescription>
                        Se encontraron posibles problemas en los siguientes registros. Te recomendamos verificarlos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {validationIssues.invalidLandedCosts.rows.length > 0 && (
                        <div>
                          <h4 className="font-semibold">
                            {validationIssues.invalidLandedCosts.rows.length} registros con "Landed Cost Total" de 0 o 1
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Filas de Excel: {validationIssues.invalidLandedCosts.rows.join(', ')}
                          </p>
                        </div>
                      )}
                      {validationIssues.emptySkus.rows.length > 0 && (
                        <div>
                          <h4 className="font-semibold">
                            {validationIssues.emptySkus.rows.length} registros con SKU vacío
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Filas de Excel: {validationIssues.emptySkus.rows.join(', ')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {data.length > 0 && (
                  <Tabs 
                    defaultValue="color" 
                    value={activeTab} 
                    onValueChange={(value) => setActiveTab(value as 'sku' | 'color' | 'subcategoria')} 
                    className="mt-6"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="sku">Resumen por SKU</TabsTrigger>
                        <TabsTrigger value="color">Resumen por Rentabilidad</TabsTrigger>
                        <TabsTrigger value="subcategoria">Por Subcategoría</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sku">
                        {skuSummary.length > 0 ? (
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Resumen de IDs y SKUs Filtrados</CardTitle>
                                    <CardDescription>
                                        Listas de todos los números de publicación y SKUs únicos que coinciden con los filtros aplicados.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold"># de Publicación ({filteredPublications.length})</h4>
                                            <Button variant="outline" size="sm" onClick={handleCopyAllPublications}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copiar Todos
                                            </Button>
                                        </div>
                                        <div className="border rounded-md max-h-72 overflow-y-auto p-2 space-y-1">
                                        {filteredPublications.map(pubId => (
                                            <div
                                            key={pubId}
                                            onClick={() => handleCopyToClipboard(pubId)}
                                            className="p-2 text-sm rounded-md hover:bg-muted cursor-pointer truncate"
                                            title={`Copiar ${pubId}`}
                                            >
                                            {pubId}
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">SKUs ({filteredSkus.length})</h4>
                                        <div className="border rounded-md max-h-72 overflow-y-auto p-2 space-y-1">
                                        {filteredSkus.map(sku => (
                                            <div
                                            key={sku}
                                            onClick={() => handleCopyToClipboard(sku)}
                                            className="p-2 text-sm rounded-md hover:bg-muted cursor-pointer truncate"
                                            title={`Copiar ${sku}`}
                                            >
                                            {sku}
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold">Detalle por SKU</h4>
                                        <Button variant="outline" size="sm" onClick={handleDownloadSkuSummaryXLSX}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Descargar Resumen
                                        </Button>
                                    </div>
                                    <div className="border rounded-md max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead onClick={() => handleSkuSummarySort('sku')} className="cursor-pointer">
                                                        <div className="flex items-center gap-1">SKU <ChevronsUpDown className="h-4 w-4" /></div>
                                                    </TableHead>
                                                    <TableHead onClick={() => handleSkuSummarySort('unidades')} className="cursor-pointer text-right">
                                                      <div className="flex items-center justify-end gap-1">Unidades <ChevronsUpDown className="h-4 w-4" /></div>
                                                    </TableHead>
                                                    <TableHead onClick={() => handleSkuSummarySort('totalPorUnidad')} className="cursor-pointer text-right">
                                                      <div className="flex items-center justify-end gap-1">Total x Unidad <ChevronsUpDown className="h-4 w-4" /></div>
                                                    </TableHead>
                                                    <TableHead onClick={() => handleSkuSummarySort('total')} className="cursor-pointer text-right">
                                                      <div className="flex items-center justify-end gap-1">Total <ChevronsUpDown className="h-4 w-4" /></div>
                                                    </TableHead>
                                                    <TableHead onClick={() => handleSkuSummarySort('porcentajeDelTotal')} className="cursor-pointer text-right">
                                                      <div className="flex items-center justify-end gap-1">% del Total <ChevronsUpDown className="h-4 w-4" /></div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {Object.entries(groupedSkuSummary).map(([sku, items]) => {
                                                  const typedItems = items as { unidades: number, total: number, porcentajeDelTotal: number, totalPorUnidad: number, pubId: string }[];
                                                  const totalUnidades = typedItems.reduce((sum, item) => sum + item.unidades, 0);
                                                  const totalTotal = typedItems.reduce((sum, item) => sum + item.total, 0);
                                                  const totalPorcentaje = typedItems.reduce((sum, item) => sum + item.porcentajeDelTotal, 0);
                                                  const totalPorUnidad = totalUnidades > 0 ? totalTotal / totalUnidades : 0;

                                                  return (
                                                    <React.Fragment key={sku}>
                                                      <TableRow className="bg-muted/50 font-semibold hover:bg-muted/60">
                                                        <TableCell>
                                                          <div>{sku}</div>
                                                          <div className="text-xs font-normal text-muted-foreground">{typedItems.length} {typedItems.length === 1 ? 'publicación' : 'publicaciones'}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">{totalUnidades}</TableCell>
                                                        <TableCell className="text-right">{totalPorUnidad.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                                        <TableCell className={cn("text-right font-bold", totalTotal >= 0 ? "text-green-800" : "text-red-800")}>
                                                          {totalTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-bold">{totalPorcentaje.toFixed(2)}%</TableCell>
                                                      </TableRow>
                                                      {typedItems.map((item) => (
                                                        <TableRow key={item.pubId} className="hover:bg-transparent">
                                                          <TableCell className="pl-10 font-mono text-xs text-muted-foreground">
                                                            Pub: {item.pubId}
                                                          </TableCell>
                                                          <TableCell className="text-right text-muted-foreground">{item.unidades}</TableCell>
                                                          <TableCell className="text-right text-muted-foreground">{item.totalPorUnidad.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                                          <TableCell className={cn("text-right text-sm", item.total >= 0 ? "text-green-700" : "text-red-700")}>{item.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                                          <TableCell className="text-right font-mono text-sm text-muted-foreground">{item.porcentajeDelTotal.toFixed(2)}%</TableCell>
                                                        </TableRow>
                                                      ))}
                                                    </React.Fragment>
                                                  );
                                              })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="mt-6"><CardContent className="p-6 text-center text-muted-foreground">No hay datos de resumen para mostrar.</CardContent></Card>
                        )}
                    </TabsContent>
                    <TabsContent value="color">
                        {colorSummary.length > 0 ? (
                            <Card className="mt-6">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <CardTitle>Resumen por Rentabilidad</CardTitle>
                                        <CardDescription>
                                            Agrupación de datos por color de rentabilidad para los registros filtrados.
                                        </CardDescription>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={handleDownloadSummaryXLSX}>
                                          <Download className="mr-2 h-4 w-4" />
                                          Descargar XLSX
                                      </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead>Color</TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('count')} className="cursor-pointer"><div className="flex items-center gap-1 whitespace-nowrap">Registros <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('pedidos')} className="cursor-pointer"><div className="flex items-center gap-1 whitespace-nowrap">Pedidos <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('porcentaje_pedidos_rango')} className="cursor-pointer"><div className="flex items-center gap-1 whitespace-nowrap">% Pedidos <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('publications')} className="cursor-pointer"><div className="flex items-center gap-1 whitespace-nowrap"># de Publicación <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('skus')} className="cursor-pointer"><div className="flex items-center gap-1 whitespace-nowrap">SKU's <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('unidades')} className="cursor-pointer text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">Unidades <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('porcentaje_unidades_rango')} className="cursor-pointer text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">% Unidades <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('utilidad_promedio_por_pedido_rango')} className="cursor-pointer text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">Utilidad Prom/Pedido <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('total')} className="cursor-pointer text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">Total <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                        <TableHead onClick={() => handleColorSummarySort('percentageOfTotal')} className="cursor-pointer text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">% del Total <ChevronsUpDown className="h-4 w-4" /></div></TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {sortedColorSummary.map((item, index) => (
                                        <TableRow key={index}>
                                        <TableCell><div className="flex items-center gap-2 font-medium"><div className={cn("w-4 h-4 rounded-full border", item.colorClass)}></div><span>{item.label}</span></div></TableCell>
                                        <TableCell>{item.count.toLocaleString()}</TableCell>
                                        <TableCell>{item.pedidos.size.toLocaleString()}</TableCell>
                                        <TableCell>{item.porcentaje_pedidos_rango.toFixed(2)}%</TableCell>
                                        <TableCell>{item.publications.size}</TableCell>
                                        <TableCell>{item.skus.size}</TableCell>
                                        <TableCell className="text-right">{item.unidades.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{item.porcentaje_unidades_rango.toFixed(2)}%</TableCell>
                                        <TableCell className="text-right">{item.utilidad_promedio_por_pedido_rango.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", item.total >= 0 ? "text-green-700" : "text-red-700")}>{item.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                        <TableCell className="text-right font-semibold">{item.percentageOfTotal.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell className="font-bold">Total</TableCell>
                                            <TableCell className="font-bold">{colorSummary.reduce((acc, item) => acc + item.count, 0).toLocaleString()}</TableCell>
                                            <TableCell className="font-bold">{totalUniquePedidos.toLocaleString()}</TableCell>
                                            <TableCell className="font-bold">100.00%</TableCell>
                                            <TableCell className="font-bold">{totalUniquePubs.toLocaleString()}</TableCell>
                                            <TableCell className="font-bold">{totalUniqueSkus.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold">{totalUnidades.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold">100.00%</TableCell>
                                            <TableCell className="text-right font-bold">{executiveKpis.gananciaPromedioPorPedido.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                            <TableCell className="text-right font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(colorSummary.reduce((acc, item) => acc + item.total, 0))}</TableCell>
                                            <TableCell className="text-right font-bold">100.00%</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                                </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="mt-6"><CardContent className="p-6 text-center text-muted-foreground">No hay datos de resumen para mostrar.</CardContent></Card>
                        )}
                    </TabsContent>
                    <TabsContent value="subcategoria">
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Resumen por Subcategoría</CardTitle>
                                <CardDescription>
                                    Markup (%) promedio para cada subcategoría en los datos filtrados.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-md max-h-96 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subcategoría</TableHead>
                                                <TableHead className="text-right">Registros</TableHead>
                                                <TableHead className="text-right">Markup (%) Promedio</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subCategorySummary.length > 0 ? subCategorySummary.map((item) => (
                                                <TableRow key={item.subCategory}>
                                                    <TableCell className="font-medium">{item.subCategory}</TableCell>
                                                    <TableCell className="text-right">{item.count}</TableCell>
                                                    <TableCell className={cn("text-right font-semibold", 
                                                        item.averageMarkup >= 30 ? "text-green-700" :
                                                        item.averageMarkup >= 20 ? "text-green-500" :
                                                        item.averageMarkup >= 10 ? "text-yellow-600" :
                                                        item.averageMarkup >= 5 ? "text-orange-500" :
                                                        "text-red-600"
                                                    )}>
                                                        {formatPercentage(item.averageMarkup)}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">
                                                        No hay datos de subcategorías para mostrar.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </>
            )
          }

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
                      <FormLabel>NOMBRE MADRE</FormLabel>
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
                      <FormLabel>Categoría Madre</FormLabel>
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

        <Dialog open={!!manualEntryInfo} onOpenChange={(isOpen) => !isOpen && setManualEntryInfo(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Entrada Manual de Costos</DialogTitle>
              <DialogDescription>
                Agrega los valores que faltan para la fila de Excel <span className="font-bold">{manualEntryInfo?.rowData[0]}</span>.
              </DialogDescription>
            </DialogHeader>
            <Form {...manualEntryForm}>
              <form onSubmit={manualEntryForm.handleSubmit(onManualEntrySubmit)} className="space-y-4">
                <FormField
                  control={manualEntryForm.control}
                  name="costoVentaML"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Venta en Mercado Libre</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={manualEntryForm.control}
                  name="cargoVenta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo por venta e impuestos (MXN)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={manualEntryForm.control}
                  name="costoEnvio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costos de envío (MXN)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setManualEntryInfo(null)}>Cancelar</Button>
                  <Button type="submit">Guardar Valores</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
