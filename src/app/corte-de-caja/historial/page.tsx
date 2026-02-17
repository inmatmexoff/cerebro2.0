'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, ChevronsUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

// Expanded SaleRecord to include more columns
type SaleRecord = {
    id: number;
    num_venta: string;
    fecha_venta: string;
    status: string;
    unidades: number | null;
    ing_xunidad: number | null;
    cargo_venta: number | null;
    ing_xenvio: number | null;
    costo_envio: number | null;
    cargo_difpeso: number | null;
    anu_reembolsos: number | null;
    total: number | null;
    venta_xpublicidad: boolean;
    sku: string;
    num_publi: string;
    tienda: string;
    tip_publi: string;
    total_final: number | null;
    markup: number | null;
};

type SortDescriptor = {
  column: keyof SaleRecord;
  direction: 'ascending' | 'descending';
};

const ROWS_PER_PAGE = 20;

export default function HistorialCortesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [appliedDateFilters, setAppliedDateFilters] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'fecha_venta',
    direction: 'descending',
  });
  
  const [granTotalFilter, setGranTotalFilter] = useState<'all' | 'negative' | 'positive'>('all');
  const [showHighShippingCost, setShowHighShippingCost] = useState(false);
  
  const handleApplyDateFilter = () => {
    setPage(1);
    setAppliedDateFilters({ startDate, endDate });
  };

  const handleClearDateFilter = () => {
    setPage(1);
    setStartDate(null);
    setEndDate(null);
    setAppliedDateFilters({ startDate: null, endDate: null });
  };

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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset page when search term changes
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    const getGrandTotal = async () => {
        const { count, error } = await supabasePROD
            .from('ml_sales')
            .select('id', { count: 'exact', head: true });
        if (!error && count !== null) {
            setGrandTotal(count);
        }
    };
    getGrandTotal();
  }, []);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const from = (page - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      let query = supabasePROD.from('ml_sales').select('*', { count: 'exact' });

      if (debouncedSearchTerm) {
        query = query.or(
          `sku.ilike.%${debouncedSearchTerm}%,num_venta.ilike.%${debouncedSearchTerm}%,status.ilike.%${debouncedSearchTerm}%,num_publi.ilike.%${debouncedSearchTerm}%`
        );
      }
      
      if (granTotalFilter === 'negative') {
        query = query.lt('total_final', 0);
      } else if (granTotalFilter === 'positive') {
        query = query.gte('total_final', 0);
      }

      if (showHighShippingCost) {
          query = query.lte('costo_envio', -300);
      }

      if (appliedDateFilters.startDate) {
        const startOfDay = new Date(appliedDateFilters.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte('fecha_venta', startOfDay.toISOString());
      }
      if (appliedDateFilters.endDate) {
        const endOfDay = new Date(appliedDateFilters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('fecha_venta', endOfDay.toISOString());
      }

      query = query
        .order(sortDescriptor.column, {
          ascending: sortDescriptor.direction === 'ascending',
        })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      setSales(data as SaleRecord[]);
      setTotalRows(count || 0);

    } catch (err: any) {
      setError('No se pudo cargar el historial de ventas.');
      toast({
        variant: 'destructive',
        title: 'Error de Carga',
        description: err.message,
      });
      console.error('Error fetching sales history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearchTerm, sortDescriptor, toast, granTotalFilter, showHighShippingCost, appliedDateFilters]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);

  const handleSort = (column: keyof SaleRecord) => {
    if (sortDescriptor.column === column) {
      setSortDescriptor({
        ...sortDescriptor,
        direction: sortDescriptor.direction === 'ascending' ? 'descending' : 'ascending',
      });
    } else {
      setSortDescriptor({
        column,
        direction: 'ascending',
      });
    }
    setPage(1);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  };
  
  const headers = [
    { key: 'num_venta', label: 'ID Venta' },
    { key: 'fecha_venta', label: 'Fecha' },
    { key: 'status', label: 'Estado' },
    { key: 'sku', label: 'SKU' },
    { key: 'num_publi', label: '# de Publicación' },
    { key: 'unidades', label: 'Unidades' },
    { key: 'ing_xunidad', label: 'Ingresos x Prod.' },
    { key: 'cargo_venta', label: 'Cargo x Venta' },
    { key: 'costo_envio', label: 'Costo Envío' },
    { key: 'ing_xenvio', label: 'Ingreso x Envío' },
    { key: 'cargo_difpeso', label: 'Cargo Dif. Peso' },
    { key: 'anu_reembolsos', label: 'Anulaciones' },
    { key: 'venta_xpublicidad', label: 'Venta x Pub.' },
    { key: 'tienda', label: 'Tienda' },
    { key: 'tip_publi', label: 'Tipo Pub.' },
    { key: 'total', label: 'Total' },
    { key: 'total_final', label: 'Gran Total' },
    { key: 'markup', label: 'Markup (%)' },
  ];

  const currencyColumns = ['ing_xunidad', 'cargo_venta', 'costo_envio', 'ing_xenvio', 'cargo_difpeso', 'anu_reembolsos', 'total', 'total_final'];
  const numericColumns = ['unidades', ...currencyColumns, 'markup'];


  const isFiltered = debouncedSearchTerm !== '' || granTotalFilter !== 'all' || showHighShippingCost || appliedDateFilters.startDate || appliedDateFilters.endDate;

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
            <h1 className="text-3xl font-bold">Historial de Ventas Guardadas</h1>
            <p className="text-muted-foreground">
              Consulta el historial de todas las ventas procesadas y guardadas en el sistema.
            </p>
          </div>
        </header>
        <main>
          <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Historial de Ventas</CardTitle>
                        <CardDescription>
                            {isLoading
                            ? 'Buscando registros...'
                            : isFiltered ? (
                                <>
                                    Mostrando <span className="font-bold text-lg text-foreground">{totalRows}</span> de {grandTotal} registros.
                                </>
                            ) : (
                                <>
                                     <span className="font-bold text-lg text-foreground">{totalRows}</span> {totalRows === 1 ? 'registro en total' : 'registros en total.'}
                                </>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-auto flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por SKU, ID, Publicación..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 w-full"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="shrink-0">
                                    <Filter className="w-4 h-4 mr-2" />
                                    Filtros
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Filtrar Gran Total</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'negative'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'negative' : 'all');
                                        setPage(1);
                                    }}
                                >
                                    Solo negativos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'positive'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'positive' : 'all');
                                        setPage(1);
                                    }}
                                >
                                    0 o positivos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Otros Filtros</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={showHighShippingCost}
                                    onCheckedChange={(checked) => {
                                        setShowHighShippingCost(checked as boolean);
                                        setPage(1);
                                    }}
                                >
                                    Costo Envío &lt;= -$300
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-end gap-4 border-t pt-4 mt-4">
                    <div className="grid gap-1.5 flex-grow min-w-[180px]">
                        <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
                        <DatePicker
                            id="fecha-inicio"
                            value={startDate}
                            onChange={setStartDate}
                        />
                    </div>
                    <div className="grid gap-1.5 flex-grow min-w-[180px]">
                        <Label htmlFor="fecha-fin">Fecha Fin</Label>
                        <DatePicker
                            id="fecha-fin"
                            value={endDate}
                            onChange={setEndDate}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleApplyDateFilter}>
                            Aplicar Fechas
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleClearDateFilter}>
                            Limpiar
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map((header) => (
                                    <TableHead key={header.key} className="cursor-pointer" onClick={() => handleSort(header.key as keyof SaleRecord)}>
                                        <div className="flex items-center gap-2">
                                           {header.label}
                                           {sortDescriptor.column === header.key && (
                                                <ChevronsUpDown className="h-4 w-4" />
                                           )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={headers.length} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        <span>Cargando historial...</span>
                                    </div>
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={headers.length} className="h-24 text-center text-red-600">
                                        {error}
                                    </TableCell>
                                </TableRow>
                            ) : sales.length > 0 ? (
                                sales.map((sale) => (
                                    <TableRow 
                                        key={sale.id}
                                        className={cn(
                                            typeof sale.markup === 'number' && {
                                                'bg-green-200 hover:bg-green-300/80 data-[state=selected]:bg-green-300': sale.markup >= 30,
                                                'bg-green-100 hover:bg-green-200/80 data-[state=selected]:bg-green-200': sale.markup >= 20 && sale.markup < 30,
                                                'bg-orange-100 hover:bg-orange-200/80 data-[state=selected]:bg-orange-200': sale.markup >= 10 && sale.markup < 20,
                                                'bg-yellow-100 hover:bg-yellow-200/80 data-[state=selected]:bg-yellow-200': sale.markup >= 5 && sale.markup < 10,
                                                'bg-red-100 hover:bg-red-200/80 data-[state=selected]:bg-red-200': sale.markup < 5,
                                            }
                                        )}
                                    >
                                    {headers.map((header) => {
                                        const cellValue = sale[header.key as keyof SaleRecord];
                                        let formattedValue: React.ReactNode;

                                        if (header.key === 'fecha_venta') {
                                            formattedValue = formatDate(cellValue as string | null);
                                        } else if (header.key === 'markup') {
                                            if (typeof cellValue === 'number') {
                                                formattedValue = `${cellValue.toFixed(2)}%`;
                                            } else {
                                                formattedValue = '-';
                                            }
                                        } else if (currencyColumns.includes(header.key)) {
                                            formattedValue = formatCurrency(cellValue as number | null);
                                        } else if (header.key === 'venta_xpublicidad') {
                                            formattedValue = (cellValue as boolean) ? 'Sí' : 'No';
                                        } else if (header.key === 'num_publi' && cellValue) {
                                            formattedValue = (
                                                <span
                                                    className="cursor-pointer hover:text-primary hover:font-medium"
                                                    onClick={() => handleCopyToClipboard(String(cellValue))}
                                                >
                                                    {String(cellValue)}
                                                </span>
                                            );
                                        } else if (cellValue === null || cellValue === undefined) {
                                            formattedValue = '-';
                                        } else {
                                            formattedValue = String(cellValue);
                                        }

                                        return (
                                            <TableCell key={header.key} className={cn({
                                                'text-right': numericColumns.includes(header.key),
                                                'font-medium text-red-600': header.key === 'total_final' && (cellValue as number | null) !== null && (cellValue as number) < 0,
                                                'font-medium text-green-700': header.key === 'total_final' && (cellValue as number | null) !== null && (cellValue as number) >= 0,
                                            })}>
                                                {formattedValue}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={headers.length} className="h-24 text-center">
                                        No se encontraron registros.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                         <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                                Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading}>
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
