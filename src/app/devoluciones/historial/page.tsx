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
import { ArrowLeft, Package2, Repeat, Search, Filter, ChevronDown, ChevronsUpDown, AlertTriangle, Copy } from "lucide-react";
import { supabasePROD } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { CompanySelect } from "@/components/company-select";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const columns = [
  {name: "#", uid: "rowIndex", sortable: false},
  {name: "# VENTA", uid: "num_venta", sortable: true},
  {name: "FECHA DE VENTA", uid: "fecha_venta", sortable: true},
  {name: "FECHA ESTADO", uid: "fecha_status", sortable: true},
  {name: "ESTADO", uid: "status", sortable: true},
  {name: "TIENDA", uid: "tienda", sortable: true},
  {name: "SKU", uid: "sku"},
  {name: "SUBCATEGORIA", uid: "sub_cat", sortable: true},
  {name: "PRODUCTO", uid: "titulo_publi"},
  {name: "UNIDADES", uid: "unidades", sortable: true},
  {name: "TOTAL", uid: "total", sortable: true},
  {name: "RESULTADO", uid: "resultado", sortable: true},
  {name: "MOTIVO DEL RESULTADO", uid: "motivo_resultado"},
  {name: "RECLAMO ABIERTO", uid: "reclamo_abierto", sortable: true},
  {name: "FECHA REVISIÓN", uid: "fecha_revision", sortable: true},
];

const INITIAL_VISIBLE_COLUMNS = [
    "rowIndex",
    "num_venta", 
    "fecha_venta", 
    "fecha_status",
    "status",
    "tienda",
    "sku",
    "sub_cat",
    "resultado",
    "reclamo_abierto",
];

const ROWS_PER_PAGE = 10;

export default function HistorialDevolucionesPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // FILTERS
    const [filterValue, setFilterValue] = useState("");
    const [debouncedFilterValue, setDebouncedFilterValue] = useState("");
    const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
    const [reclamoFilter, setReclamoFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [company, setCompany] = useState<string | undefined>();
    const [dateFilterType, setDateFilterType] = useState<'fecha_venta' | 'fecha_status'>('fecha_venta');
    
    const [appliedFilters, setAppliedFilters] = useState<{
        startDate: Date | null;
        endDate: Date | null;
        company: string | undefined;
        status: Set<string>;
        reclamo: string;
        dateType: 'fecha_venta' | 'fecha_status';
    }>({
        startDate: null,
        endDate: null,
        company: undefined,
        status: new Set(),
        reclamo: "all",
        dateType: 'fecha_venta',
    });

    // TABLE STATE
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [page, setPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [sortDescriptor, setSortDescriptor] = useState({
        column: "fecha_venta",
        direction: "descending",
    });

    const safeParseDate = (dateString: string | null) => {
        if (!dateString) return null;
        // If it's a date-only string (YYYY-MM-DD), append time to parse it as local time
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return new Date(`${dateString}T00:00:00`);
        }
        // Otherwise, parse as-is (likely a timestamptz string)
        return new Date(dateString);
    }

     useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilterValue(filterValue.trim());
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [filterValue]);

    const fetchReturns = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            let query = supabasePROD
              .from('devoluciones_ml')
              .select('*', { count: 'exact' });
    
            if (debouncedFilterValue) {
                if (/^[0-9]+$/.test(debouncedFilterValue)) {
                    query = query.or(`num_venta.eq.${debouncedFilterValue},titulo_publi.ilike.%${debouncedFilterValue}%,sku.ilike.%${debouncedFilterValue}%`);
                } else {
                    query = query.or(`titulo_publi.ilike.%${debouncedFilterValue}%,sku.ilike.%${debouncedFilterValue}%`);
                }
            }

            if(appliedFilters.company && appliedFilters.company !== 'all') {
                query = query.eq('tienda', appliedFilters.company);
            }
            
            if(appliedFilters.status.size > 0) {
                query = query.in('resultado', Array.from(appliedFilters.status));
            }

            if(appliedFilters.reclamo !== 'all') {
                query = query.eq('reclamo_abierto', appliedFilters.reclamo === 'si');
            }

            const dateColumn = appliedFilters.dateType;

            if (appliedFilters.startDate) {
                const startOfDay = new Date(appliedFilters.startDate);
                startOfDay.setHours(0, 0, 0, 0);
                query = query.gte(dateColumn, startOfDay.toISOString());
            }

            if (appliedFilters.endDate) {
                const nextDayStart = new Date(appliedFilters.endDate);
                nextDayStart.setDate(nextDayStart.getDate() + 1);
                nextDayStart.setHours(0, 0, 0, 0);
                query = query.lt(dateColumn, nextDayStart.toISOString());
            }

            const { data, error: dbError, count } = await query;

            if (dbError) {
              throw dbError;
            }

            if (!data || data.length === 0) {
                setReturns([]);
                setTotalRows(0);
                setIsLoading(false);
                return;
            }

            const skusInData = [...new Set(data.map(r => r.sku).filter(Boolean))];
            const skuToMdrMap = new Map();
            const mdrToSubCatMap = new Map();

            if (skusInData.length > 0) {
                const { data: skuAlternoData, error: skuAlternoError } = await supabasePROD
                    .from('sku_alterno')
                    .select('sku, sku_mdr')
                    .in('sku', skusInData);
                if (skuAlternoError) throw skuAlternoError;
                skuAlternoData.forEach((item) => skuToMdrMap.set(item.sku, item.sku_mdr));

                const mdrs = [...new Set(Array.from(skuToMdrMap.values()))].filter(Boolean);
                if (mdrs.length > 0) {
                    const { data: skuMData, error: skuMError } = await supabasePROD
                        .from('sku_m')
                        .select('sku_mdr, sub_cat')
                        .in('sku_mdr', mdrs);
                    if (skuMError) throw skuMError;
                    if(skuMData) {
                        skuMData.forEach(item => mdrToSubCatMap.set(item.sku_mdr, item.sub_cat));
                    }
                }
            }

            const enrichedData = data.map(r => {
                const skuMdr = skuToMdrMap.get(r.sku);
                const subCat = skuMdr ? mdrToSubCatMap.get(skuMdr) : null;
                return { ...r, sub_cat: subCat };
            });

            setReturns(enrichedData);
            setTotalRows(count || 0);

          } catch (err: any) {
            setError("No se pudieron cargar las devoluciones.");
            console.error("Error fetching returns:", err.message);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las devoluciones.' });
          } finally {
            setIsLoading(false);
          }
    }, [debouncedFilterValue, appliedFilters, toast]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const stats = React.useMemo(() => {
        if (isLoading) {
            return {
                today: '...',
                topReason: { reason: '...', count: '...' },
                reclamos: '...',
                byResult: {},
                byCompanyToday: [],
            };
        }
    
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        const returnsToday = returns.filter(r => {
            if (!r.fecha_status) return false;
            const statusDate = safeParseDate(r.fecha_status);
            return statusDate && statusDate.toDateString() === today.toDateString();
        });
    
        const reasonCounts = returns.reduce((acc, curr) => {
            if (curr.motivo_resultado) {
                acc[curr.motivo_resultado] = (acc[curr.motivo_resultado] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    
        const topReason = Object.keys(reasonCounts).length > 0
            ? Object.entries(reasonCounts).reduce((a, b) => b[1] > a[1] ? b : a)
            : ["Sin motivo", 0];
    
        const reclamosCount = returns.filter(r => r.reclamo_abierto).length;
    
        const resultCounts = returns.reduce((acc, curr) => {
            if (curr.resultado) {
                acc[curr.resultado] = (acc[curr.resultado] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    
        const companyTodayCounts = returnsToday.reduce((acc, curr) => {
            if (curr.tienda) {
                acc[curr.tienda] = (acc[curr.tienda] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    
        return {
            today: returnsToday.length,
            topReason: { reason: topReason[0], count: topReason[1] },
            reclamos: reclamosCount,
            byResult: resultCounts,
            byCompanyToday: Object.entries(companyTodayCounts).sort((a,b) => b[1] - a[1]),
        };
    }, [returns, isLoading]);

    const resultOptions = React.useMemo(() => {
        return [...new Set(returns.map(r => r.resultado).filter(Boolean))].map(r => ({ name: r, uid: r }));
    }, [returns]);

    const sortedReturns = React.useMemo(() => {
        return [...returns].sort((a, b) => {
            const first = a[sortDescriptor.column];
            const second = b[sortDescriptor.column];

            if (first === null || first === undefined) return 1;
            if (second === null || second === undefined) return -1;
            
            let cmp: number;
            if (typeof first === 'string' && typeof second === 'string') {
              cmp = first.localeCompare(second);
            } else {
              cmp = first < second ? -1 : first > second ? 1 : 0;
            }
    
            return sortDescriptor.direction === 'descending' ? -cmp : cmp;
        });
      }, [returns, sortDescriptor]);

    const paginatedReturns = React.useMemo(() => {
        const start = (page - 1) * ROWS_PER_PAGE;
        const end = start + ROWS_PER_PAGE;
        return sortedReturns.slice(start, end);
    }, [page, sortedReturns]);

    const headerColumns = React.useMemo(() => {
        if (visibleColumns.size === columns.length) return columns;
        return columns.filter((column) => visibleColumns.has(column.uid));
    }, [visibleColumns]);

    const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE) || 1;

    const renderCell = React.useCallback((item: any, columnKey: string) => {
        const cellValue = item[columnKey];

        switch (columnKey) {
            case "resultado":
                return (
                <Chip className="capitalize" size="sm" variant="flat">
                    {cellValue || '-'}
                </Chip>
                );
            case "reclamo_abierto":
            case "venta_xpublicidad":
            case "kit":
            case "varios_productos":
                return (
                    <Chip className="capitalize" color={cellValue ? "warning" : "default"} size="sm" variant="flat">
                        {cellValue ? 'Sí' : 'No'}
                    </Chip>
                );
            case "fecha_venta":
            case "fecha_status":
            case "fecha_revision":
                const date = safeParseDate(cellValue);
                return date ? date.toLocaleDateString('es-MX') : '-';
            default:
                return cellValue;
        }
    }, []);

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({ startDate, endDate, company, status: statusFilter, reclamo: reclamoFilter, dateType: dateFilterType });
    };

    const handleClearFilters = () => {
        setFilterValue("");
        setDebouncedFilterValue("");
        setStartDate(null);
        setEndDate(null);
        setCompany(undefined);
        setStatusFilter(new Set());
        setReclamoFilter("all");
        setDateFilterType('fecha_venta');
        setPage(1);
        setAppliedFilters({ startDate: null, endDate: null, company: undefined, status: new Set(), reclamo: "all", dateType: 'fecha_venta' });
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

    const handleCopyReport = () => {
        if (returns.length === 0) {
          toast({
            variant: "destructive",
            title: "No hay datos para copiar",
          });
          return;
        }
    
        const formatDateRange = () => {
            if (appliedFilters.startDate && appliedFilters.endDate) {
                if (appliedFilters.startDate.toDateString() === appliedFilters.endDate.toDateString()) {
                    return appliedFilters.startDate.toLocaleDateString('es-MX');
                }
                return `${appliedFilters.startDate.toLocaleDateString('es-MX')} - ${appliedFilters.endDate.toLocaleDateString('es-MX')}`;
            }
            if (appliedFilters.startDate) {
                return `DESDE ${appliedFilters.startDate.toLocaleDateString('es-MX')}`;
            }
            if (appliedFilters.endDate) {
                return `HASTA ${appliedFilters.endDate.toLocaleDateString('es-MX')}`;
            }
            return "TODOS LOS REGISTROS";
        };
    
        const groupedByCompany = returns.reduce((acc, curr) => {
          const company = curr.tienda || "SIN EMPRESA";
          if (!acc[company]) {
            acc[company] = [];
          }
          acc[company].push({
            num_venta: curr.num_venta,
            sub_cat: curr.sub_cat || 'SIN SUBCATEGORIA',
          });
          return acc;
        }, {} as Record<string, { num_venta: string; sub_cat: string }[]>);
    
        let reportText = `REPORTE DE DEVOLUCIONES ${formatDateRange()}\n\n`;
        
        for (const company in groupedByCompany) {
            const items = groupedByCompany[company];
            reportText += `${company} # DE DEVOLUCIONES ${items.length}\n`;
            items.forEach(item => {
                reportText += `[${item.num_venta}] [${item.sub_cat}]\n`;
            });
            reportText += '\n';
        }
    
        navigator.clipboard.writeText(reportText.trim()).then(() => {
            toast({
                title: "Reporte Copiado",
                description: "El reporte de devoluciones ha sido copiado al portapapeles."
            });
        }).catch(err => {
            toast({
                variant: "destructive",
                title: "Error al copiar",
                description: "No se pudo copiar el reporte."
            });
            console.error('Copy to clipboard failed: ', err);
        });
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
                    <h1 className="text-3xl font-bold">Historial de Devoluciones ML</h1>
                    <p className="text-muted-foreground">
                        Gestiona y consulta el historial de devoluciones de Mercado Libre.
                    </p>
                </div>
            </header>
            <main>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Devoluciones de Hoy</CardTitle>
                            <Package2 className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? <Spinner size="sm"/> : stats.today}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Reclamos Abiertos</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? <Spinner size="sm"/> : stats.reclamos}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <CardTitle className="text-sm font-medium">Motivo Principal</CardTitle>
                            <Repeat className="h-4 w-4 text-secondary" />
                        </CardHeader>
                         <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? <Spinner size="sm"/> : stats.topReason.count}</div>
                            <p className="text-xs text-muted-foreground truncate" title={stats.topReason.reason}>
                                {stats.topReason.reason}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-base">Desglose de Devoluciones (Filtrado)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="resultado">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="resultado">Por Resultado</TabsTrigger>
                                <TabsTrigger value="empresa">Por Empresa (Hoy)</TabsTrigger>
                            </TabsList>
                            <TabsContent value="resultado" className="pt-4">
                                {isLoading ? <div className="flex justify-center"><Spinner size="sm"/></div> : (
                                    Object.keys(stats.byResult).length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        {Object.entries(stats.byResult).map(([resultado, count]) => (
                                            <div key={resultado} className="p-2 bg-muted/50 rounded-md">
                                                <p className="text-sm text-muted-foreground capitalize">{resultado.replace(/_/g, ' ').toLowerCase()}</p>
                                                <div className="text-xl font-bold">{count as number}</div>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay datos de resultados.</p>
                                    )
                                )}
                            </TabsContent>
                            <TabsContent value="empresa" className="pt-4">
                                {isLoading ? <div className="flex justify-center"><Spinner size="sm"/></div> : (
                                    stats.byCompanyToday.length > 0 ? (
                                        <ul className="space-y-2">
                                        {stats.byCompanyToday.map(([company, count]) => (
                                            <li key={company} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                                                <span className="font-medium text-muted-foreground">{company}</span>
                                                <span className="font-bold text-lg">{count}</span>
                                            </li>
                                        ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay devoluciones hoy.</p>
                                    )
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Devoluciones de ML</CardTitle>
                        <CardDescription>
                            Mostrando {paginatedReturns.length} de {totalRows} devoluciones.
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
                                    <Button variant="outline" onClick={handleCopyReport}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copiar Reporte
                                    </Button>
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
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-end gap-4 border-t pt-4">
                                <div className="grid gap-1.5 flex-grow min-w-[180px]">
                                    <Label>Tipo de Fecha</Label>
                                    <Select value={dateFilterType} onValueChange={(value) => setDateFilterType(value as 'fecha_venta' | 'fecha_status')}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fecha_venta">Fecha de Venta</SelectItem>
                                            <SelectItem value="fecha_status">Fecha de Estado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                        <DropdownMenuLabel>Resultado</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {resultOptions.map((option) => (
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
                                        <DropdownMenuLabel>Reclamo Abierto</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem
                                            checked={reclamoFilter === 'si'}
                                            onCheckedChange={(checked) => setReclamoFilter(checked ? 'si' : 'all')}
                                        >Sí</DropdownMenuCheckboxItem>
                                         <DropdownMenuCheckboxItem
                                            checked={reclamoFilter === 'no'}
                                            onCheckedChange={(checked) => setReclamoFilter(checked ? 'no' : 'all')}
                                        >No</DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleApplyFilters}>Aplicar</Button>
                                    <Button size="sm" variant="ghost" onClick={handleClearFilters}>Limpiar</Button>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-md overflow-x-auto max-h-[70vh]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        {headerColumns.map((column) => (
                                             <TableHead key={column.uid} 
                                                className={cn(column.sortable && "cursor-pointer", "whitespace-nowrap")}
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
                                    ) : paginatedReturns.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={headerColumns.length} className="h-24 text-center">
                                                No se encontraron devoluciones.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedReturns.map((item, index) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);

                                            const isDelivered = item.entregado === true;
                                            const isNotDelivered = !item.entregado;
                                            const statusDate = safeParseDate(item.fecha_status);
                                            const isStatusDatePast = statusDate ? statusDate < today : false;

                                            const highlightRed = isNotDelivered && isStatusDatePast;

                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    className={cn({
                                                        'bg-red-100 hover:bg-red-200/80 data-[state=selected]:bg-red-200': highlightRed,
                                                        'bg-green-100 hover:bg-green-200/80 data-[state=selected]:bg-green-200': isDelivered,
                                                    })}
                                                >
                                                    {headerColumns.map((column) => (
                                                         <TableCell key={column.uid} className="whitespace-nowrap">
                                                             {column.uid === 'rowIndex' 
                                                                ? (page - 1) * ROWS_PER_PAGE + index + 1 
                                                                : renderCell(item, column.uid)
                                                            }
                                                         </TableCell>
                                                    ))}
                                                </TableRow>
                                            );
                                        })
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
