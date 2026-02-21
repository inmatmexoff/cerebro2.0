'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Chip, Spinner } from "@nextui-org/react";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package2, Repeat, Search, Filter, ChevronDown, ChevronsUpDown } from "lucide-react";
import { supabasePROD } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { CompanySelect } from "@/components/company-select";
import { cn } from "@/lib/utils";

const capitalize = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const columns = [
  {name: "TIENDA", uid: "tienda", sortable: true},
  {name: "# VENTA", uid: "num_venta", sortable: true},
  {name: "FECHA DE VENTA", uid: "fecha_venta", sortable: true},
  {name: "FECHA DE LLEGADA", uid: "fecha_llegada", sortable: true},
  {name: "FECHA REVISIÓN", uid: "fecha_revision", sortable: true},
  {name: "PRODUCTO", uid: "producto"},
  {name: "SKU", uid: "sku"},
  {name: "MOTIVO DEVOLUCIÓN", uid: "motivo_devo"},
  {name: "ESTADO DE LLEGADA", uid: "estado_llegada", sortable: true},
  {name: "REPORTE", uid: "reporte", sortable: true},
  {name: "EMPAQUETADOR", uid: "nombre_despacho"},
  {name: "SUPERVISADO POR", uid: "nombre_revision"},
  {name: "ERROR DE NOSOTROS", uid: "error_prop", sortable: true},
  {name: "OBSERVACIONES", uid: "observacion"},
  {name: "FACTURA", uid: "factura"},
  {name: "REVISIÓN", uid: "s_revision"},
];

const statusOptions = [
    { name: "Bueno", uid: "BUENO" },
    { name: "Regular", uid: "REGULAR" },
    { name: "Dañado", uid: "DANIADO" },
    { name: "Muy Dañado", uid: "MUY_DANIADO" },
];

const errorNosotrosOptions = [
    { name: "Sí", uid: "si" },
    { name: "No", uid: "no" },
];


const statusColorMap: Record<string, "success" | "warning" | "danger" | "default"> = {
  BUENO: "success",
  REGULAR: "warning",
  DANIADO: "danger",
  MUY_DANIADO: "danger",
};


const INITIAL_VISIBLE_COLUMNS = [
    "tienda", 
    "num_venta", 
    "fecha_llegada", 
    "producto",
    "sku",
    "estado_llegada",
    "error_prop",
];

const ROWS_PER_PAGE = 10;

export default function DevolucionesPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // FILTERS
    const [filterValue, setFilterValue] = useState("");
    const [debouncedFilterValue, setDebouncedFilterValue] = useState("");
    const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
    const [errorFilter, setErrorFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [company, setCompany] = useState<string | undefined>();
    const [appliedFilters, setAppliedFilters] = useState<{
        startDate: Date | null;
        endDate: Date | null;
        company: string | undefined;
        status: Set<string>;
        error: string;
    }>({
        startDate: null,
        endDate: null,
        company: undefined,
        status: new Set(),
        error: "all",
    });

    // TABLE STATE
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [page, setPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [sortDescriptor, setSortDescriptor] = useState({
        column: "fecha_llegada",
        direction: "descending",
    });

     useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilterValue(filterValue);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [filterValue]);

    const fetchReturns = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const from = (page - 1) * ROWS_PER_PAGE;
            const to = from + ROWS_PER_PAGE - 1;

            let query = supabasePROD
              .from('devoluciones')
              .select('*', { count: 'exact' });
    
            if(debouncedFilterValue) {
                query = query.or(`num_venta::text.ilike.%${debouncedFilterValue}%,producto.ilike.%${debouncedFilterValue}%,sku.ilike.%${debouncedFilterValue}%`);
            }

            if(appliedFilters.company && appliedFilters.company !== 'all') {
                query = query.eq('tienda', appliedFilters.company);
            }

            if(appliedFilters.status.size > 0) {
                query = query.in('estado_llegada', Array.from(appliedFilters.status));
            }

            if(appliedFilters.error !== 'all') {
                query = query.eq('error_prop', appliedFilters.error === 'si');
            }

            if(appliedFilters.startDate) {
                query = query.gte('fecha_llegada', appliedFilters.startDate.toISOString());
            }

            if(appliedFilters.endDate) {
                const endOfDay = new Date(appliedFilters.endDate);
                endOfDay.setHours(23, 59, 59, 999);
                query = query.lte('fecha_llegada', endOfDay.toISOString());
            }

            query = query.order(sortDescriptor.column, { ascending: sortDescriptor.direction === 'ascending' }).range(from, to);

            const { data, error: dbError, count } = await query;

            if (dbError) {
              throw dbError;
            }
            setReturns(data || []);
            setTotalRows(count || 0);

          } catch (err: any) {
            setError("No se pudieron cargar las devoluciones.");
            console.error("Error fetching returns:", err.message);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las devoluciones.' });
          } finally {
            setIsLoading(false);
          }
    }, [page, debouncedFilterValue, appliedFilters, sortDescriptor, toast]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const returnsTodayCount = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return returns.filter(r => {
            if (!r.fecha_llegada) return false;
            const arrivalDate = new Date(r.fecha_llegada);
            return arrivalDate.toDateString() === today.toDateString();
        }).length;
    }, [returns]);

    const mostFrequentReason = React.useMemo(() => {
        if (returns.length === 0) {
            return { reason: "No hay datos", count: 0 };
        }

        const reasonCounts = returns.reduce((acc, curr) => {
            if (curr.motivo_devo) {
                acc[curr.motivo_devo] = (acc[curr.motivo_devo] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        if (Object.keys(reasonCounts).length === 0) {
            return { reason: "Sin motivo especificado", count: 0 };
        }

        const mostFrequent = Object.entries(reasonCounts).reduce((a, b) => b[1] > a[1] ? b : a);

        return { reason: mostFrequent[0], count: mostFrequent[1] };
    }, [returns]);

    const headerColumns = React.useMemo(() => {
        if (visibleColumns.size === columns.length) return columns;
        return columns.filter((column) => visibleColumns.has(column.uid));
    }, [visibleColumns]);

    const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE) || 1;

    const renderCell = React.useCallback((item: any, columnKey: string) => {
        const cellValue = item[columnKey];

        switch (columnKey) {
            case "estado_llegada":
                return (
                <Chip className="capitalize" color={statusColorMap[cellValue] || 'default'} size="sm" variant="flat">
                    {cellValue ? String(cellValue).replace(/_/g, ' ').toLowerCase() : '-'}
                </Chip>
                );
            case "error_prop":
                return (
                    <Chip className="capitalize" color={cellValue ? "danger" : "default"} size="sm" variant="flat">
                        {cellValue ? 'Sí' : 'No'}
                    </Chip>
                );
            case "reporte":
            case "factura":
                return (
                    <Chip className="capitalize" color={cellValue ? "success" : "default"} size="sm" variant="flat">
                        {cellValue ? 'Sí' : 'No'}
                    </Chip>
                );
            case "fecha_venta":
            case "fecha_llegada":
            case "fecha_revision":
                return cellValue ? new Date(cellValue).toLocaleDateString('es-MX') : '-';
            default:
                return cellValue;
        }
    }, []);

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({ startDate, endDate, company, status: statusFilter, error: errorFilter });
    };

    const handleClearFilters = () => {
        setFilterValue("");
        setDebouncedFilterValue("");
        setStartDate(null);
        setEndDate(null);
        setCompany(undefined);
        setStatusFilter(new Set());
        setErrorFilter("all");
        setPage(1);
        setAppliedFilters({ startDate: null, endDate: null, company: undefined, status: new Set(), error: "all" });
    };

    const handleSort = (columnUid: string) => {
        if (sortDescriptor.column === columnUid) {
            setSortDescriptor({
                ...sortDescriptor,
                direction: sortDescriptor.direction === 'ascending' ? 'descending' : 'ascending',
            });
        } else {
            setSortDescriptor({ column: columnUid, direction: 'ascending' });
        }
    }


  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
            <header>
                <Link
                    href="/"
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Dashboard
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Devoluciones</h1>
                    <p className="text-muted-foreground">
                    Gestiona y consulta el historial de devoluciones.
                    </p>
                </div>
            </header>
            <main>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Devoluciones de Hoy</CardTitle>
                            <Package2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? <Spinner size="sm"/> : returnsTodayCount}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <CardTitle className="text-sm font-medium">Motivo Principal</CardTitle>
                            <Repeat className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                         <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? <Spinner size="sm"/> : mostFrequentReason.count}</div>
                            <p className="text-xs text-muted-foreground truncate" title={mostFrequentReason.reason}>
                                {mostFrequentReason.reason}
                            </p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Devoluciones</CardTitle>
                        <CardDescription>
                            Mostrando {returns.length} de {totalRows} devoluciones.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-4">
                             <div className="flex flex-col md:flex-row justify-between gap-3 items-end">
                                <div className="relative w-full md:max-w-xs">
                                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                     <Input
                                        placeholder="Buscar por # venta, producto..."
                                        value={filterValue}
                                        onChange={(e) => setFilterValue(e.target.value)}
                                        className="pl-8 w-full"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Columnas <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {columns.map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.uid}
                                            className="capitalize"
                                            checked={visibleColumns.has(column.uid)}
                                            onCheckedChange={(checked) => {
                                                setVisibleColumns(prev => {
                                                    const next = new Set(prev);
                                                    if(checked) {
                                                        next.add(column.uid);
                                                    } else {
                                                        next.delete(column.uid);
                                                    }
                                                    return next;
                                                })
                                            }}
                                        >
                                            {column.name}
                                        </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                     <Link href="/devoluciones/import-excel">
                                        <Button variant="outline">
                                            Importar Excel
                                        </Button>
                                    </Link>
                                    <Link href="/devoluciones/nueva">
                                    <Button>
                                        Nueva Devolución
                                    </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-end gap-4 border-t pt-4">
                                <div className="grid gap-1.5 flex-grow min-w-[180px]">
                                    <Label>Fecha Inicio</Label>
                                    <DatePicker value={startDate} onChange={setStartDate} />
                                </div>
                                <div className="grid gap-1.5 flex-grow min-w-[180px]">
                                    <Label>Fecha Fin</Label>
                                    <DatePicker value={endDate} onChange={setEndDate} />
                                </div>
                                <div className="grid gap-1.5 flex-grow min-w-[180px]">
                                    <Label>Empresa</Label>
                                    <CompanySelect value={company} onValueChange={setCompany} />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="h-9">
                                            <Filter className="w-4 h-4 mr-2"/>
                                            Filtros
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>Estado de Llegada</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {statusOptions.map((option) => (
                                            <DropdownMenuCheckboxItem
                                                key={option.uid}
                                                checked={statusFilter.has(option.uid)}
                                                onCheckedChange={(checked) => {
                                                    setStatusFilter(prev => {
                                                        const next = new Set(prev);
                                                        if (checked) next.add(option.uid);
                                                        else next.delete(option.uid);
                                                        return next;
                                                    })
                                                }}
                                            >{option.name}</DropdownMenuCheckboxItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Error de Nosotros</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {errorNosotrosOptions.map((option) => (
                                             <DropdownMenuCheckboxItem
                                                key={option.uid}
                                                checked={errorFilter === option.uid}
                                                onCheckedChange={(checked) => setErrorFilter(checked ? option.uid : 'all')}
                                            >{option.name}</DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleApplyFilters}>Aplicar</Button>
                                    <Button size="sm" variant="ghost" onClick={handleClearFilters}>Limpiar</Button>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {headerColumns.map((column) => (
                                             <TableHead key={column.uid} 
                                                className={cn(column.sortable && "cursor-pointer")}
                                                onClick={() => column.sortable && handleSort(column.uid)}
                                             >
                                                <div className="flex items-center gap-2">
                                                    {column.name}
                                                    {sortDescriptor.column === column.uid && (
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
                                            <TableCell colSpan={headerColumns.length} className="h-24 text-center">
                                                <Spinner label="Cargando..." />
                                            </TableCell>
                                        </TableRow>
                                    ) : returns.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={headerColumns.length} className="h-24 text-center">
                                                No se encontraron devoluciones.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        returns.map((item) => (
                                            <TableRow key={item.id}>
                                                {headerColumns.map((column) => (
                                                     <TableCell key={column.uid}>
                                                        {renderCell(item, column.uid)}
                                                     </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
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
