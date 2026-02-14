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

type SaleRecord = {
  id: number;
  num_venta: string;
  fecha_venta: string;
  status: string;
  unidades: number | null;
  sku: string;
  total: number | null;
  total_final: number | null;
  costo_envio: number | null;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'fecha_venta',
    direction: 'descending',
  });
  
  const [granTotalFilter, setGranTotalFilter] = useState<'all' | 'negative' | 'positive'>('all');
  const [showHighShippingCost, setShowHighShippingCost] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset page when search term changes
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const from = (page - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      let query = supabasePROD.from('ml_sales').select('*', { count: 'exact' });

      if (debouncedSearchTerm) {
        query = query.or(
          `sku.ilike.%${debouncedSearchTerm}%,num_venta.ilike.%${debouncedSearchTerm}%,status.ilike.%${debouncedSearchTerm}%`
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
  }, [page, debouncedSearchTerm, sortDescriptor, toast, granTotalFilter, showHighShippingCost]);

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
    { key: 'unidades', label: 'Unidades' },
    { key: 'total', label: 'Total' },
    { key: 'costo_envio', label: 'Costo Envío' },
    { key: 'total_final', label: 'Gran Total' },
  ];

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
                            Mostrando {sales.length} de {totalRows} registros.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-auto flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por SKU, ID, Estado..."
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
                                    <TableRow key={sale.id}>
                                        <TableCell>{sale.num_venta}</TableCell>
                                        <TableCell>{formatDate(sale.fecha_venta)}</TableCell>
                                        <TableCell>{sale.status}</TableCell>
                                        <TableCell>{sale.sku}</TableCell>
                                        <TableCell className="text-right">{sale.unidades ?? '-'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(sale.costo_envio)}</TableCell>
                                        <TableCell className={cn('text-right font-medium', (sale.total_final ?? 0) < 0 ? 'text-red-600' : 'text-green-700')}>
                                            {formatCurrency(sale.total_final)}
                                        </TableCell>
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
