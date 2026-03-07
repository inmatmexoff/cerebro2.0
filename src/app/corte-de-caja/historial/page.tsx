'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, ChevronsUpDown, Filter, PackageSearch, Download, Copy, Check, Pencil, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { supabasePROD } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySelect } from '@/components/company-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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
    landed_cost: number | null;
    venta_xpublicidad: boolean;
    sku: string;
    num_publi: string;
    tienda: string;
    tip_publi: string;
    total_final: number | null;
    markup: number | null;
    sub_cat: string | null;
};

type SortDescriptor = {
  column: keyof SaleRecord;
  direction: 'ascending' | 'descending';
};

const formSchema = z.object({
  sku_mdr: z.string().min(1, 'NOMBRE MADRE es requerido.'),
  cat_mdr: z.string().min(1, 'Categoría Madre es requerida.'),
  landed_cost: z.coerce
    .number()
    .positive('Landed cost debe ser un número positivo.'),
});

const ROWS_PER_PAGE = 20;
type ColorSummarySortKey = 'count' | 'publications' | 'skus' | 'unidades' | 'total' | 'percentageOfTotal' | 'pedidos' | 'porcentaje_pedidos_rango' | 'porcentaje_unidades_rango' | 'utilidad_promedio_por_pedido_rango';
type SkuSummarySortKey = 'sku' | 'unidades' | 'totalPorUnidad' | 'total' | 'porcentajeDelTotal';


export default function HistorialCortesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // FILTERS
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [company, setCompany] = useState<string | undefined>();
  const [subCategoryFilter, setSubCategoryFilter] = useState<Set<string>>(new Set());
  const [allSubCategories, setAllSubCategories] = useState<string[]>([]);
  const [subCategorySearch, setSubCategorySearch] = useState('');

  const [appliedFilters, setAppliedFilters] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    company: string | undefined;
    subCategory: Set<string>;
  }>({
    startDate: null,
    endDate: null,
    company: undefined,
    subCategory: new Set(),
  });

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'fecha_venta',
    direction: 'descending',
  });
  
  const [granTotalFilter, setGranTotalFilter] = useState<'all' | 'negative' | 'positive' | 'low_profit'>('all');
  const [showHighShippingCost, setShowHighShippingCost] = useState(false);
  const [isRowColoringActive, setIsRowColoringActive] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'sku' | 'color' | 'subcategoria'>('color');
  const [markupFilter, setMarkupFilter] = useState<'all' | 'darkGreen' | 'lightGreen' | 'orange' | 'yellow' | 'red'>('all');
  const [skuSummary, setSkuSummary] = useState<any[]>([]);
  const [colorSummary, setColorSummary] = useState<any[]>([]);
  const [filteredPublications, setFilteredPublications] = useState<string[]>([]);
  const [filteredSkus, setFilteredSkus] = useState<string[]>([]);
  const [colorSummarySort, setColorSummarySort] = useState<{ key: ColorSummarySortKey; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });
  const [skuSummarySort, setSkuSummarySort] = React.useState<{ key: SkuSummarySortKey; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });
  const [totalUniquePubs, setTotalUniquePubs] = useState(0);
  const [totalUniqueSkus, setTotalUniqueSkus] = useState(0);
  const [unfilteredTotals, setUnfilteredTotals] = React.useState({
    utilidadBruta: 0,
    landedCost: 0,
    ingresosPorProductos: 0,
  });
  const [executiveKpis, setExecutiveKpis] = React.useState({
    gananciaPromedioPorPedido: 0,
    utilidadPromedioPorUnidad: 0,
    porcentajePedidosMargenBajo: 0,
  });
  const [totalUnidades, setTotalUnidades] = React.useState(0);
  const [totalPedidos, setTotalPedidos] = React.useState(0);

  const [editingInfo, setEditingInfo] = useState<{ sale: SaleRecord, originalLandedCost: number } | null>(null);
  const [isUpdatingCost, setIsUpdatingCost] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        sku_mdr: '',
        cat_mdr: '',
        landed_cost: 0,
      },
  });

  useEffect(() => {
    const getUnfilteredTotals = async () => {
      const { data: salesData, error } = await supabasePROD.from('ml_sales').select('*');
      if (error || !salesData) {
        console.error("Error fetching all sales for totals:", error?.message);
        return;
      }
      
      const skus = [...new Set(salesData.map(s => s.sku).filter(Boolean))];
      const skuToMdrMap = new Map();
      const mdrToPriceMap = new Map();

      if (skus.length > 0) {
        const { data: skuAlternoData, error: skuAlternoError } = await supabasePROD
          .from('sku_alterno')
          .select('sku, sku_mdr')
          .in('sku', skus);
        if (skuAlternoError) return;
        skuAlternoData.forEach((item) => skuToMdrMap.set(item.sku, item.sku_mdr));

        const foundSkus = new Set(skuAlternoData.map(item => item.sku));
        const remainingSkus = skus.filter(sku => !foundSkus.has(sku));

        if (remainingSkus.length > 0) {
          const { data: skuMData, error: skuMError } = await supabasePROD
            .from('sku_m')
            .select('sku, sku_mdr')
            .in('sku', remainingSkus);
          if (skuMError) return;
          skuMData.forEach((item) => skuToMdrMap.set(item.sku, item.sku_mdr));
        }

        const mdrs = [...new Set(Array.from(skuToMdrMap.values()))].filter(Boolean);
        if (mdrs.length > 0) {
          const { data: skuCostosData, error: skuCostosError } = await supabasePROD
            .from('sku_costos')
            .select('sku_mdr, landed_cost, id')
            .in('sku_mdr', mdrs)
            .order('id', { ascending: false });

          if (skuCostosError) return;
          if (skuCostosData) {
            for (const item of skuCostosData) {
              if (!mdrToPriceMap.has(item.sku_mdr)) {
                mdrToPriceMap.set(item.sku_mdr, item.landed_cost);
              }
            }
          }
        }
      }

      const totals = salesData.reduce((acc, sale) => {
          const unidades = sale.unidades || 1;
          const skuMdr = skuToMdrMap.get(sale.sku);
          const landedCostPerUnit = skuMdr ? mdrToPriceMap.get(skuMdr) || 0 : 0;
          const totalLandedCost = landedCostPerUnit * unidades;
          const totalFromDb = sale.total || 0;
          let utilidadBruta = totalFromDb - totalLandedCost;
          
          const saleStatus = sale.status || '';
          if (totalFromDb === 0 && !saleStatus.toLowerCase().startsWith('paquete de')) {
              utilidadBruta = 0;
          }
          
          acc.utilidadBruta += utilidadBruta;
          acc.landedCost += totalLandedCost;
          acc.ingresosPorProductos += sale.ing_xunidad || 0;
          return acc;
      }, { utilidadBruta: 0, landedCost: 0, ingresosPorProductos: 0 });

      setUnfilteredTotals(totals);
    };

    getUnfilteredTotals();
  }, []);
  
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        const { data, error } = await supabasePROD
          .from('sku_m')
          .select('sub_cat');

        if (error) throw error;
        
        if (data) {
          const uniqueSubCats = [...new Set(data.map(item => item.sub_cat).filter(Boolean))].sort();
          setAllSubCategories(uniqueSubCats);
        }
      } catch (err: any) {
        console.error("Error fetching subcategories:", err.message);
      }
    };
    fetchSubCategories();
  }, []);

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({ startDate, endDate, company, subCategory: subCategoryFilter });
  };

  const handleClearFilters = () => {
    setPage(1);
    setStartDate(null);
    setEndDate(null);
    setCompany(undefined);
    setSubCategoryFilter(new Set());
    setAppliedFilters({ startDate: null, endDate: null, company: undefined, subCategory: new Set() });
  };

  const filteredSubCategories = React.useMemo(() => {
    if (!subCategorySearch) return allSubCategories;
    return allSubCategories.filter(subCat =>
      subCat.toLowerCase().includes(subCategorySearch.toLowerCase())
    );
  }, [allSubCategories, subCategorySearch]);

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
    setPage(1);
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
        let subCategorySkus: string[] | undefined;
        if (appliedFilters.subCategory.size > 0) {
            const { data: skuMData, error: skuMError } = await supabasePROD
                .from('sku_m')
                .select('sku_mdr, sku')
                .in('sub_cat', Array.from(appliedFilters.subCategory));

            if (skuMError) throw skuMError;

            if (!skuMData || skuMData.length === 0) {
                setSales([]);
                setTotalRows(0);
                setIsLoading(false);
                return;
            }
            
            const skuMdrFromSubCat = skuMData.map(item => item.sku_mdr).filter(Boolean);
            const skusFromSkuM = skuMData.map(item => item.sku).filter(Boolean);
            let allSkusForSubCat = [...skusFromSkuM];

            if (skuMdrFromSubCat.length > 0) {
                const { data: skuAlternoData, error: skuAlternoError } = await supabasePROD
                    .from('sku_alterno')
                    .select('sku')
                    .in('sku_mdr', skuMdrFromSubCat);
                if (skuAlternoError) throw skuAlternoError;
                if (skuAlternoData) {
                    allSkusForSubCat = [...new Set([...allSkusForSubCat, ...skuAlternoData.map(item => item.sku)])];
                }
            }

            if (allSkusForSubCat.length === 0) {
                setSales([]);
                setTotalRows(0);
                setIsLoading(false);
                return;
            }
            subCategorySkus = allSkusForSubCat;
        }

        let query = supabasePROD.from('ml_sales').select('*', { count: 'exact' });

        if (subCategorySkus) {
            query = query.in('sku', subCategorySkus);
        }

        if (debouncedSearchTerm) {
            query = query.or(
                `sku.ilike.%${debouncedSearchTerm}%,num_venta.ilike.%${debouncedSearchTerm}%,status.ilike.%${debouncedSearchTerm}%,num_publi.ilike.%${debouncedSearchTerm}%`
            );
        }

        if (appliedFilters.startDate) {
            const startOfDay = new Date(appliedFilters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            query = query.gte('fecha_venta', startOfDay.toISOString());
        }
        if (appliedFilters.endDate) {
            const nextDayStart = new Date(appliedFilters.endDate);
            nextDayStart.setDate(nextDayStart.getDate() + 1);
            nextDayStart.setHours(0, 0, 0, 0);
            query = query.lt('fecha_venta', nextDayStart.toISOString());
        }
        
        if (appliedFilters.company && appliedFilters.company !== 'all') {
            const companyFilterValue = appliedFilters.company.replace(/-/g, ' ').toUpperCase();
            query = query.eq('tienda', companyFilterValue);
        }

        const { data: initialData, error: initialError, count } = await query.range(0, 0);
        if (initialError) throw initialError;
        
        const totalRecords = count || 0;
        setTotalRows(totalRecords);
        if (totalRecords === 0) {
            setSales([]);
            setIsLoading(false);
            return;
        }

        const allData = [];
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < totalRecords; i += CHUNK_SIZE) {
            const { data: chunk, error: chunkError } = await query.range(i, i + CHUNK_SIZE - 1);
            if (chunkError) throw chunkError;
            if (chunk) allData.push(...chunk);
        }
        
        const salesData = allData;

        const skusInPage = [...new Set(salesData.map(s => s.sku).filter(Boolean))];
        const skuToMdrMap = new Map();
        const mdrToSubCatMap = new Map();
        const mdrToPriceMap = new Map();

        if (skusInPage.length > 0) {
            const { data: skuAlternoData, error: skuAlternoError } = await supabasePROD
                .from('sku_alterno')
                .select('sku, sku_mdr')
                .in('sku', skusInPage);
            if (skuAlternoError) throw skuAlternoError;
            skuAlternoData.forEach((item) => skuToMdrMap.set(item.sku, item.sku_mdr));

            const foundSkus = new Set(skuAlternoData.map(item => item.sku));
            const remainingSkus = skusInPage.filter(sku => !foundSkus.has(sku));

            if (remainingSkus.length > 0) {
                const { data: skuMData, error: skuMError } = await supabasePROD
                    .from('sku_m')
                    .select('sku, sku_mdr')
                    .in('sku', remainingSkus);
                if (skuMError) throw skuMError;
                skuMData.forEach((item) => skuToMdrMap.set(item.sku, item.sku_mdr));
            }

            const mdrs = [...new Set(Array.from(skuToMdrMap.values()))].filter(Boolean);
            if (mdrs.length > 0) {
                const { data: skuMSubCatData, error: skuMSubCatError } = await supabasePROD
                    .from('sku_m')
                    .select('sku_mdr, sub_cat')
                    .in('sku_mdr', mdrs);
                if (skuMSubCatError) throw skuMSubCatError;
                if (skuMSubCatData) {
                    skuMSubCatData.forEach(item => {
                        if (item.sub_cat) mdrToSubCatMap.set(item.sku_mdr, item.sub_cat);
                    });
                }

                const { data: skuCostosData, error: skuCostosError } = await supabasePROD
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

        const enrichedData = salesData.map(sale => {
            const unidades = sale.unidades || 1;
            const skuMdr = skuToMdrMap.get(sale.sku);
            const subCat = skuMdr ? mdrToSubCatMap.get(skuMdr) : null;
            const landedCostPerUnit = skuMdr ? mdrToPriceMap.get(skuMdr) || 0 : 0;
            const totalLandedCost = landedCostPerUnit * unidades;
            const totalFromDb = sale.total || 0;
            let utilidadBruta = totalFromDb - totalLandedCost;
            
            const saleStatus = sale.status || '';
            if (totalFromDb === 0 && !saleStatus.toLowerCase().startsWith('paquete de')) {
                utilidadBruta = 0;
            }

            const markup = totalLandedCost > 0 ? (utilidadBruta / totalLandedCost) * 100 : 0;

            return {
                ...sale,
                landed_cost: totalLandedCost,
                total_final: parseFloat(utilidadBruta.toFixed(2)),
                markup,
                sub_cat: subCat,
            };
        });

        setSales(enrichedData as SaleRecord[]);

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
}, [debouncedSearchTerm, appliedFilters, toast]);

  const handleEditClick = async (sale: SaleRecord) => {
    if (!sale.sku) {
      toast({ variant: 'destructive', title: 'SKU no encontrado', description: 'Esta fila no tiene un SKU para editar.' });
      return;
    }

    form.reset({ sku_mdr: '', cat_mdr: '', landed_cost: 0 });
    setEditingInfo({ sale, originalLandedCost: sale.landed_cost || 0 });

    try {
        const response = await fetch(`/api/sku-details/${sale.sku}`);
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

  async function onUpdateSubmit(values: z.infer<typeof formSchema>) {
    if (!editingInfo) return;
    setIsUpdatingCost(true);
    try {
        const payload = {
            data: [
                {
                    sku: editingInfo.sale.sku,
                    sku_mdr: values.sku_mdr,
                    cat_mdr: values.cat_mdr,
                    landed_cost: values.landed_cost,
                    proveedor: null,
                    piezas_xcontenedor: null,
                },
            ],
            type: 'oficial'
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

        setSales(currentSales => {
            return currentSales.map(s => {
                if (s.id === editingInfo.sale.id) {
                    const newLandedCostPerUnit = values.landed_cost;
                    const unidades = s.unidades || 1;
                    const newTotalLandedCost = newLandedCostPerUnit * unidades;
                    const totalFromDb = s.total || 0;
                    let newUtilidadBruta = totalFromDb - newTotalLandedCost;

                    const saleStatus = s.status || '';
                    if (totalFromDb === 0 && !saleStatus.toLowerCase().startsWith('paquete de')) {
                        newUtilidadBruta = 0;
                    }

                    const newMarkup = newTotalLandedCost > 0 ? (newUtilidadBruta / newTotalLandedCost) * 100 : 0;
                    
                    return {
                        ...s,
                        landed_cost: newTotalLandedCost,
                        total_final: parseFloat(newUtilidadBruta.toFixed(2)),
                        markup: newMarkup,
                    };
                }
                return s;
            });
        });
  
        toast({
            title: 'Éxito',
            description: `Costo para SKU ${editingInfo.sale.sku} actualizado.`,
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


  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const filteredItems = React.useMemo(() => {
    return sales.filter((sale) => {
        let utilidadBrutaMatch = true;
        if (granTotalFilter === 'negative') {
            utilidadBrutaMatch = (sale.total_final ?? 0) < 0;
        } else if (granTotalFilter === 'positive') {
            utilidadBrutaMatch = (sale.total_final ?? 0) >= 0;
        } else if (granTotalFilter === 'low_profit') {
            utilidadBrutaMatch = (sale.total_final ?? 0) < 30;
        }

        const highShippingCostMatch = !showHighShippingCost || (sale.costo_envio ?? 0) <= -300;
        
        let markupMatch = true;
        if (markupFilter !== 'all') {
            const markupValue = sale.markup;
            const utilidadBruta = sale.total_final;
             if (typeof markupValue === 'number') {
                switch (markupFilter) {
                    case 'darkGreen': markupMatch = markupValue >= 30; break;
                    case 'lightGreen': markupMatch = markupValue >= 20 && markupValue < 30; break;
                    case 'orange': markupMatch = markupValue >= 10 && markupValue < 20; break;
                    case 'yellow': markupMatch = markupValue >= 5 && markupValue < 10; break;
                    case 'red': markupMatch = markupValue < 5 && utilidadBruta !== 0; break;
                }
            } else {
                markupMatch = markupFilter === 'red' && utilidadBruta !== 0;
            }
        }

        return utilidadBrutaMatch && highShippingCostMatch && markupMatch;
    });
  }, [sales, granTotalFilter, showHighShippingCost, markupFilter]);
  
  const topMarkupSales = React.useMemo(() => {
    return [...filteredItems]
      .filter(sale => sale.markup !== null && sale.markup !== undefined)
      .sort((a, b) => (b.markup! - a.markup!))
      .slice(0, 5);
  }, [filteredItems]);


  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
        const first = a[sortDescriptor.column as keyof SaleRecord];
        const second = b[sortDescriptor.column as keyof SaleRecord];

        if (first === null) return 1;
        if (second === null) return -1;

        const cmp = first < second ? -1 : first > second ? 1 : 0;
        return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [filteredItems, sortDescriptor]);
  
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return sortedItems.slice(start, end);
  }, [page, sortedItems]);

  const totalPages = Math.ceil(sortedItems.length / ROWS_PER_PAGE) || 1;

  const utilidadBrutaSum = React.useMemo(() => filteredItems.reduce((acc, item) => acc + (item.total_final || 0), 0), [filteredItems]);
  const totalSum = React.useMemo(() => filteredItems.reduce((acc, item) => acc + (item.total || 0), 0), [filteredItems]);
  const landedCostSum = React.useMemo(() => filteredItems.reduce((acc, item) => acc + (item.landed_cost || 0), 0), [filteredItems]);
  const ingresosPorProductosSum = React.useMemo(() => filteredItems.reduce((acc, item) => acc + (item.ing_xunidad || 0), 0), [filteredItems]);
  const cargoVentaSum = React.useMemo(() => filteredItems.reduce((acc, item) => acc + (item.cargo_venta || 0), 0), [filteredItems]);
  const costoEnvioSum = React.useMemo(() => filteredItems.reduce((acc, item) => acc + (item.costo_envio || 0), 0), [filteredItems]);

  const colorCounters = React.useMemo(() => {
    const counters = { darkGreen: 0, lightGreen: 0, orange: 0, yellow: 0, red: 0 };
    filteredItems.forEach(sale => {
      const markupValue = sale.markup;
      const utilidadBruta = sale.total_final;
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
  }, [filteredItems]);
  
  const subCategorySummary = React.useMemo(() => {
    if (filteredItems.length === 0) return [];

    const summary = filteredItems.reduce((acc, sale) => {
        const subCat = sale.sub_cat || 'Sin Subcategoría';
        if (!acc[subCat]) {
            acc[subCat] = { totalUtilidad: 0, totalLandedCost: 0, count: 0, publications: new Set<string>() };
        }

        if (typeof sale.total_final === 'number') {
            acc[subCat].totalUtilidad += sale.total_final;
        }
        if (typeof sale.landed_cost === 'number' && sale.landed_cost > 0) { 
            acc[subCat].totalLandedCost += sale.landed_cost;
        }
        if (sale.num_publi) {
            acc[subCat].publications.add(sale.num_publi);
        }
        acc[subCat].count += 1;
        return acc;
    }, {} as Record<string, { totalUtilidad: number; totalLandedCost: number; count: number; publications: Set<string> }>);

    return Object.entries(summary).map(([subCategory, data]) => ({
        subCategory,
        averageMarkup: data.totalLandedCost > 0 ? (data.totalUtilidad / data.totalLandedCost) * 100 : 0,
        count: data.count,
        publications: Array.from(data.publications),
    })).sort((a, b) => b.averageMarkup - a.averageMarkup);
  }, [filteredItems]);


  useEffect(() => {
    if (filteredItems.length === 0) {
        setSkuSummary([]);
        setFilteredPublications([]);
        setFilteredSkus([]);
        setColorSummary([]);
        setTotalUniquePubs(0);
        setTotalUniqueSkus(0);
        return;
    }
    
    const summary: { [key: string]: { pubId: string; sku: string; unidades: number; total: number; } } = {};
    const dataToSummarize = filteredItems;
    
    const allPubsInFilteredData = new Set<string>();
    const allSkusInFilteredData = new Set<string>();

    dataToSummarize.forEach(row => {
        const pubId = String(row.num_publi || '').trim();
        const sku = String(row.sku || '').trim();
        
        if(pubId) allPubsInFilteredData.add(pubId);
        if(sku) allSkusInFilteredData.add(sku);

        if ((pubId || sku) && (row.total_final || 0) < 0) {
            const key = `${pubId}|${sku}`;
            if (!summary[key]) {
                summary[key] = { pubId: pubId || '-', sku: sku || '-', unidades: 0, total: 0 };
            }
            const unidades = row.unidades || 0;
            const total = row.total_final || 0;
            summary[key].unidades += unidades;
            summary[key].total += total;
        }
    });

    setTotalUniquePubs(allPubsInFilteredData.size);
    setTotalUniqueSkus(allSkusInFilteredData.size);

    const summaryValues = Object.values(summary);
    
    const totalOfLosses = summaryValues.reduce((sum, item) => sum + item.total, 0);

    const enrichedSummary = summaryValues
      .map(item => {
          const totalPorUnidad = (item.unidades > 0) ? item.total / item.unidades : 0;
          const porcentajeDelTotal = (totalOfLosses !== 0) ? (item.total / totalOfLosses) * 100 : 0;
          
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
        darkGreen: { label: '>= 30%', colorClass: 'bg-green-200 border-green-400', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, pedidos: new Set<string>() },
        lightGreen: { label: '20-29.9%', colorClass: 'bg-green-100 border-green-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, pedidos: new Set<string>() },
        orange: { label: '10-19.9%', colorClass: 'bg-orange-100 border-orange-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, pedidos: new Set<string>() },
        yellow: { label: '5-9.9%', colorClass: 'bg-yellow-100 border-yellow-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, pedidos: new Set<string>() },
        red: { label: '< 5%', colorClass: 'bg-red-100 border-red-300', publications: new Set<string>(), skus: new Set<string>(), unidades: 0, total: 0, pedidos: new Set<string>() },
    };
    
    const allPedidosInFiltered = new Set(dataToSummarize.map(i => i.num_venta));
    const allUnidadesInFiltered = dataToSummarize.reduce((acc, i) => acc + (i.unidades || 0), 0);
    setTotalPedidos(allPedidosInFiltered.size);
    setTotalUnidades(allUnidadesInFiltered);

    dataToSummarize.forEach(row => {
        const markupValue = row.markup;
        let category: (typeof summaryByColor)[keyof typeof summaryByColor] | null = null;

        if (typeof markupValue === 'number') {
            if (markupValue >= 30) category = summaryByColor.darkGreen;
            else if (markupValue >= 20) category = summaryByColor.lightGreen;
            else if (markupValue >= 10) category = summaryByColor.orange;
            else if (markupValue >= 5) category = summaryByColor.yellow;
            else if (markupValue < 5 && row.total_final !== 0) category = summaryByColor.red;
        } else if (row.total_final !== 0) {
            category = summaryByColor.red;
        }

        if (category) {
            const pubId = String(row.num_publi || '').trim();
            const sku = String(row.sku || '').trim();
            const numVenta = String(row.num_venta || '').trim();
            const unidades = row.unidades || 0;
            const total = row.total_final || 0;

            if (pubId) category.publications.add(pubId);
            if (sku) category.skus.add(sku);
            if (numVenta) category.pedidos.add(numVenta);
            category.unidades += unidades;
            category.total += total;
        }
    });

    const pedidosMargenBajo = summaryByColor.red.pedidos.size;

    setExecutiveKpis({
      gananciaPromedioPorPedido: allPedidosInFiltered.size > 0 ? utilidadBrutaSum / allPedidosInFiltered.size : 0,
      utilidadPromedioPorUnidad: allUnidadesInFiltered > 0 ? utilidadBrutaSum / allUnidadesInFiltered : 0,
      porcentajePedidosMargenBajo: allPedidosInFiltered.size > 0 ? (pedidosMargenBajo / allPedidosInFiltered.size) * 100 : 0
    });

    const summaryWithPercentage = Object.entries(summaryByColor).map(([key, cat]) => ({
        ...cat,
        count: colorCounters[key as keyof typeof colorCounters],
        percentageOfTotal: utilidadBrutaSum !== 0 ? (cat.total / utilidadBrutaSum) * 100 : 0,
        porcentaje_pedidos_rango: allPedidosInFiltered.size > 0 ? (cat.pedidos.size / allPedidosInFiltered.size) * 100 : 0,
        porcentaje_unidades_rango: allUnidadesInFiltered > 0 ? (cat.unidades / allUnidadesInFiltered) * 100 : 0,
        utilidad_promedio_por_pedido_rango: cat.pedidos.size > 0 ? cat.total / cat.pedidos.size : 0,
    }));

    setColorSummary(summaryWithPercentage);

  }, [filteredItems, utilidadBrutaSum, colorCounters, skuSummarySort]);

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
  
  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  const headers = [
    { key: 'num_venta', label: 'ID Venta' },
    { key: 'fecha_venta', label: 'Fecha' },
    { key: 'status', label: 'Estado' },
    { key: 'sku', label: 'SKU' },
    { key: 'sub_cat', label: 'Subcategoría' },
    { key: 'num_publi', label: '# de Publicación' },
    { key: 'unidades', label: 'Unidades' },
    { key: 'ing_xunidad', label: 'Costo Venta ML' },
    { key: 'cargo_venta', label: 'Cargo x Venta' },
    { key: 'costo_envio', label: 'Costo Envío' },
    { key: 'ing_xenvio', label: 'Ingreso x Envío' },
    { key: 'cargo_difpeso', label: 'Cargo Dif. Peso' },
    { key: 'anu_reembolsos', label: 'Anulaciones' },
    { key: 'venta_xpublicidad', label: 'Venta x Pub.' },
    { key: 'tienda', label: 'Tienda' },
    { key: 'tip_publi', label: 'Tipo Pub.' },
    { key: 'total', label: 'Total' },
    { key: 'landed_cost', label: 'Landed Cost Total' },
    { key: 'total_final', label: 'Utilidad Bruta' },
    { key: 'markup', label: 'Markup (%)' },
  ];

  const currencyColumns = ['ing_xunidad', 'cargo_venta', 'costo_envio', 'ing_xenvio', 'cargo_difpeso', 'anu_reembolsos', 'total', 'landed_cost', 'total_final'];
  const numericColumns = ['unidades', ...currencyColumns, 'markup'];


  const isFiltered = debouncedSearchTerm !== '' || granTotalFilter !== 'all' || showHighShippingCost || appliedFilters.startDate || appliedFilters.endDate || (appliedFilters.company && appliedFilters.company !== 'all') || markupFilter !== 'all' || appliedFilters.subCategory.size > 0;

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
        const newDirection = (key === 'sku') ? 'asc' : 'desc';
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
        '# de Publicación': item.pubId,
        'Unidades': item.unidades,
        'Pérdida x Unidad': item.totalPorUnidad,
        'Pérdida Total': item.total,
        '% del Total': `${item.porcentajeDelTotal.toFixed(2)}%`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen SKU con Pérdidas');
    XLSX.writeFile(workbook, 'resumen_sku_perdidas.xlsx');
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
                                    Mostrando <span className="font-bold text-lg text-foreground">{sortedItems.length}</span> de {grandTotal} registros.
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
                                placeholder="Buscar por SKU, ID, # de Publicación..."
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
                                <DropdownMenuLabel>Filtrar Utilidad Bruta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'negative'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'negative' : 'all');
                                        if (checked) setMarkupFilter('all');
                                        setPage(1);
                                    }}
                                >
                                    Solo negativos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'positive'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'positive' : 'all');
                                        if (checked) setMarkupFilter('all');
                                        setPage(1);
                                    }}
                                >
                                    0 o positivos
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={granTotalFilter === 'low_profit'}
                                    onCheckedChange={(checked) => {
                                        setGranTotalFilter(checked ? 'low_profit' : 'all');
                                        if (checked) setMarkupFilter('all');
                                        setPage(1);
                                    }}
                                >
                                    Utilidad Bruta &lt; $30
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Otros Filtros</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={showHighShippingCost}
                                    onCheckedChange={(checked) => {
                                        setShowHighShippingCost(checked as boolean);
                                        if (checked) setMarkupFilter('all');
                                        setPage(1);
                                    }}
                                >
                                    Costo Envío &lt;= -$300
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center space-x-2">
                            <Switch id="row-coloring" checked={isRowColoringActive} onCheckedChange={setIsRowColoringActive} />
                            <Label htmlFor="row-coloring">Colorear Filas</Label>
                        </div>
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
                     <div className="grid gap-1.5 flex-grow min-w-[180px]">
                        <Label>Empresa</Label>
                        <CompanySelect value={company} onValueChange={setCompany} />
                    </div>
                    <div className="grid gap-1.5 flex-grow min-w-[180px]">
                        <Label>Subcategoría</Label>
                        <Popover onOpenChange={(open) => !open && setSubCategorySearch('')}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal">
                                    <span>{subCategoryFilter.size > 0 ? `${subCategoryFilter.size} seleccionada(s)` : 'Seleccionar'}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput 
                                        placeholder="Buscar..."
                                        value={subCategorySearch}
                                        onValueChange={setSubCategorySearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                        <CommandGroup>
                                        {filteredSubCategories.map((subCat) => (
                                        <CommandItem
                                            key={subCat}
                                            onSelect={() => {
                                                setSubCategoryFilter(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(subCat)) {
                                                        next.delete(subCat);
                                                    } else {
                                                        next.add(subCat);
                                                    }
                                                    return next;
                                                })
                                            }}
                                        >
                                            <div className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                subCategoryFilter.has(subCat) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                            )}>
                                                <Check className={cn("h-4 w-4")} />
                                            </div>
                                            <span>{subCat}</span>
                                        </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleApplyFilters}>
                            Aplicar Filtros
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                            Limpiar
                        </Button>
                    </div>
                </div>
                <div className="pt-4 mt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">
                        Resumen de Totales (Filtrado)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">Utilidad Bruta</div>
                        <div className={cn('font-bold text-lg', utilidadBrutaSum >= 0 ? 'text-green-700' : 'text-red-700')}>
                            {formatCurrency(utilidadBrutaSum)}
                        </div>
                         {isFiltered ? (
                            <div className="flex justify-between items-baseline text-sm mt-1">
                                <span className="text-muted-foreground">
                                    de {formatCurrency(unfilteredTotals.utilidadBruta)}
                                </span>
                                <span className="font-mono font-semibold">
                                    {unfilteredTotals.utilidadBruta !== 0
                                    ? `${((utilidadBrutaSum / unfilteredTotals.utilidadBruta) * 100).toFixed(1)}%`
                                    : '0.0%'}
                                </span>
                            </div>
                            ) : (
                            <div className="mt-1 space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">vs Landed Cost</span>
                                    <span className="font-mono font-semibold">
                                        {landedCostSum > 0 ? `${((utilidadBrutaSum / landedCostSum) * 100).toFixed(1)}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">vs Costo Venta ML</span>
                                    <span className="font-mono font-semibold">
                                        {ingresosPorProductosSum > 0 ? `${((utilidadBrutaSum / ingresosPorProductosSum) * 100).toFixed(1)}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-bold text-lg text-foreground">
                            {formatCurrency(totalSum)}
                        </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                            Landed Cost Total
                        </div>
                        <div className="font-bold text-lg text-foreground">
                            {formatCurrency(landedCostSum)}
                        </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                           Costo de Venta en Mercado Libre
                        </div>
                        <div className="font-bold text-lg text-foreground">
                            {formatCurrency(ingresosPorProductosSum)}
                        </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                            Cargos x Venta
                        </div>
                        <div className="font-bold text-lg text-foreground">
                            {formatCurrency(cargoVentaSum)}
                        </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-muted-foreground">
                            Costos x Envío
                        </div>
                        <div className="font-bold text-lg text-foreground">
                            {formatCurrency(costoEnvioSum)}
                        </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                          <div className="text-muted-foreground">Utilidad Promedio por Pedido</div>
                          <div className="font-bold text-lg text-foreground">
                            {formatCurrency(executiveKpis.gananciaPromedioPorPedido)}
                          </div>
                        </div>
                         <div className="p-3 bg-muted/50 rounded-md">
                          <div className="text-muted-foreground">Utilidad Promedio por Unidad</div>
                          <div className="font-bold text-lg text-foreground">
                            {formatCurrency(executiveKpis.utilidadPromedioPorUnidad)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md">
                          <div className="text-muted-foreground">% Pedidos Margen Bajo</div>
                          <div className="font-bold text-lg text-foreground">
                            {executiveKpis.porcentajePedidosMargenBajo.toFixed(2)}%
                          </div>
                        </div>
                    </div>
                </div>
                 <div className="pt-4 mt-4 border-t">
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
                <div className="border rounded-md overflow-auto max-h-[70vh]">
                    <ShadcnTable>
                        <TableHeader className="sticky top-0 bg-background z-10">
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
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((sale) => (
                                    <TableRow 
                                        key={sale.id}
                                        className={cn(
                                            (sale.status || '').toLowerCase().startsWith('paquete de') && 'bg-gray-100 hover:bg-gray-200/80 data-[state=selected]:bg-gray-200',
                                            isRowColoringActive && typeof sale.markup === 'number' && {
                                                'bg-green-200 hover:bg-green-300/80 data-[state=selected]:bg-green-300': sale.markup >= 30,
                                                'bg-green-100 hover:bg-green-200/80 data-[state=selected]:bg-green-200': sale.markup >= 20 && sale.markup < 30,
                                                'bg-orange-100 hover:bg-orange-200/80 data-[state=selected]:bg-orange-200': sale.markup >= 10 && sale.markup < 20,
                                                'bg-yellow-100 hover:bg-yellow-200/80 data-[state=selected]:bg-yellow-200': sale.markup >= 5 && sale.markup < 10,
                                                'bg-red-100 hover:bg-red-200/80 data-[state=selected]:bg-red-200': sale.markup < 5 && sale.total_final !== 0,
                                            },
                                            isRowColoringActive && typeof sale.markup !== 'number' && sale.total_final !== 0 && 'bg-red-100 hover:bg-red-200/80 data-[state=selected]:bg-red-200'
                                        )}
                                    >
                                    {headers.map((header) => {
                                        const cellValue = sale[header.key as keyof SaleRecord];
                                        let formattedValue: React.ReactNode;

                                        if (header.key === 'landed_cost') {
                                            const cost = cellValue as number | null;
                                            const showPencil = cost === null || cost === 0 || cost === 1;
                                            if (showPencil && sale.sku) {
                                                formattedValue = (
                                                    <div className="flex items-center justify-end gap-2 -mr-4">
                                                        <span>{formatCurrency(cost)}</span>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(sale)}>
                                                            <Pencil className="h-4 w-4 text-primary" />
                                                        </Button>
                                                    </div>
                                                );
                                            } else {
                                                formattedValue = formatCurrency(cost);
                                            }
                                        } else if (header.key === 'fecha_venta') {
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
                                        } else if ((header.key === 'num_publi' || header.key === 'sku' || header.key === 'num_venta') && cellValue) {
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
                                            <TableCell 
                                                key={header.key} 
                                                className={cn({
                                                    'text-right': numericColumns.includes(header.key),
                                                    'font-medium text-red-600': header.key === 'total_final' && (cellValue as number | null) !== null && (cellValue as number) < 0,
                                                    'font-medium text-green-700': header.key === 'total_final' && (cellValue as number | null) !== null && (cellValue as number) >= 0,
                                                },
                                                !isRowColoringActive && header.key === 'markup' && (
                                                  (typeof cellValue === 'number' && {
                                                      'bg-green-200': cellValue >= 30,
                                                      'bg-green-100': cellValue >= 20 && cellValue < 30,
                                                      'bg-orange-100': cellValue >= 10 && cellValue < 20,
                                                      'bg-yellow-100': cellValue >= 5 && cellValue < 10,
                                                      'bg-red-100': cellValue < 5 && sale.total_final !== 0,
                                                  }) ||
                                                  (typeof cellValue !== 'number' && sale.total_final !== 0 && 'bg-red-100')
                                                ))}>
                                                {formattedValue}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                     <TableCell colSpan={headers.length} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <PackageSearch className="h-12 w-12"/>
                                            <p className="font-semibold">No se encontraron resultados.</p>
                                            <p className="text-sm">Intenta ajustar tus filtros de búsqueda.</p>
                                       </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </ShadcnTable>
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Top 5 Ventas por Markup
                    </CardTitle>
                    <CardDescription>Las 5 ventas con el mayor markup en los datos filtrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {topMarkupSales.length > 0 ? (
                        <ul className="space-y-2">
                            {topMarkupSales.map((sale) => (
                                <li key={sale.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                                  <div>
                                    <span
                                        className="font-mono cursor-pointer hover:text-primary"
                                        onClick={() => handleCopyToClipboard(sale.num_venta)}
                                    >
                                        #{sale.num_venta}
                                    </span>
                                    <p className="text-xs text-muted-foreground">SKU: {sale.sku}</p>
                                  </div>
                                <Badge variant="outline" className="font-semibold text-primary border-primary">
                                    {formatPercentage(sale.markup)}
                                </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">No hay datos de markup para mostrar.</p>
                    )}
                </CardContent>
            </Card>

            {sales.length > 0 && (
                <Tabs 
                defaultValue="color" 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as 'sku' | 'color' | 'subcategoria')} 
                className="mt-6"
                >
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="sku">Resumen por SKU</TabsTrigger>
                    <TabsTrigger value="color">Por Rentabilidad</TabsTrigger>
                    <TabsTrigger value="subcategoria">Por Subcategoría</TabsTrigger>
                </TabsList>
                <TabsContent value="sku">
                    {skuSummary.length > 0 ? (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Resumen de SKUs con Pérdidas</CardTitle>
                                <CardDescription>
                                    Listas de todos los números de publicación y SKUs que coinciden con los filtros y han generado pérdidas.
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
                                    <h4 className="font-semibold">Detalle de Pérdidas</h4>
                                    <Button variant="outline" size="sm" onClick={handleDownloadSkuSummaryXLSX}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Descargar Resumen
                                    </Button>
                                </div>
                                <div className="border rounded-md max-h-96 overflow-y-auto">
                                    <ShadcnTable>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead onClick={() => handleSkuSummarySort('sku')} className="cursor-pointer">
                                                    <div className="flex items-center gap-1">SKU <ChevronsUpDown className="h-4 w-4" /></div>
                                                </TableHead>
                                                <TableHead># de Publicación</TableHead>
                                                <TableHead onClick={() => handleSkuSummarySort('unidades')} className="cursor-pointer text-right">
                                                    <div className="flex items-center justify-end gap-1">Unidades <ChevronsUpDown className="h-4 w-4" /></div>
                                                </TableHead>
                                                <TableHead onClick={() => handleSkuSummarySort('totalPorUnidad')} className="cursor-pointer text-right">
                                                    <div className="flex items-center justify-end gap-1">Pérdida x Unidad <ChevronsUpDown className="h-4 w-4" /></div>
                                                </TableHead>
                                                <TableHead onClick={() => handleSkuSummarySort('total')} className="cursor-pointer text-right">
                                                    <div className="flex items-center justify-end gap-1">Pérdida Total <ChevronsUpDown className="h-4 w-4" /></div>
                                                </TableHead>
                                                <TableHead onClick={() => handleSkuSummarySort('porcentajeDelTotal')} className="cursor-pointer text-right">
                                                    <div className="flex items-center justify-end gap-1">% del Total <ChevronsUpDown className="h-4 w-4" /></div>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {skuSummary.map((item) => (
                                                <TableRow key={`${item.pubId}-${item.sku}`}>
                                                    <TableCell className="font-medium">{item.sku}</TableCell>
                                                    <TableCell>
                                                        <span
                                                            className="cursor-pointer hover:text-primary"
                                                            onClick={() => handleCopyToClipboard(item.pubId)}
                                                            title={`Copiar ${item.pubId}`}
                                                        >
                                                            {item.pubId}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.unidades}</TableCell>
                                                    <TableCell className="text-right">{item.totalPorUnidad.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                                    <TableCell className="text-right text-red-600 font-semibold">{item.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TableCell>
                                                    <TableCell className="text-right font-mono">{item.porcentajeDelTotal.toFixed(2)}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </ShadcnTable>
                                </div>
                            </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="mt-6"><CardContent className="p-6 text-center text-muted-foreground">No hay pérdidas en los datos filtrados para mostrar.</CardContent></Card>
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
                            <div className="overflow-auto max-h-96">
                            <ShadcnTable>
                                <TableHeader className="sticky top-0 bg-background z-10">
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
                                        <TableCell className="font-bold">{totalPedidos.toLocaleString()}</TableCell>
                                        <TableCell className="font-bold">100.00%</TableCell>
                                        <TableCell className="font-bold">{totalUniquePubs.toLocaleString()}</TableCell>
                                        <TableCell className="font-bold">{totalUniqueSkus.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">{totalUnidades.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">100.00%</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(executiveKpis.gananciaPromedioPorPedido)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(colorSummary.reduce((acc, item) => acc + item.total, 0))}</TableCell>
                                        <TableCell className="text-right font-bold">100.00%</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </ShadcnTable>
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
                                Markup (%) promedio y desglose de publicaciones para cada subcategoría en los datos filtrados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full">
                                {subCategorySummary.length > 0 ? subCategorySummary.map((item) => (
                                    <AccordionItem value={item.subCategory} key={item.subCategory}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <span className="font-medium text-left">{item.subCategory}</span>
                                                <div className="flex items-center gap-4 text-right">
                                                    <Badge variant="outline">{item.publications.length} pub.</Badge>
                                                    <span className={cn("font-semibold", 
                                                        item.averageMarkup >= 30 ? "text-green-700" :
                                                        item.averageMarkup >= 20 ? "text-green-500" :
                                                        item.averageMarkup >= 10 ? "text-yellow-600" :
                                                        item.averageMarkup >= 5 ? "text-orange-500" :
                                                        "text-red-600"
                                                    )}>
                                                        {formatPercentage(item.averageMarkup)}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                                <ul className="pl-8 pt-2 space-y-1 list-disc list-inside">
                                                {item.publications.map((pub: string) => (
                                                    <li key={pub} className="text-sm text-muted-foreground">
                                                        <span
                                                            className="cursor-pointer hover:text-primary hover:underline"
                                                            onClick={() => handleCopyToClipboard(pub)}
                                                            title={`Copiar ${pub}`}
                                                        >
                                                            # de publicación: {pub}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                )) : (
                                    <div className="text-center text-muted-foreground p-6">
                                        No hay datos de subcategorías para mostrar.
                                    </div>
                                )}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
              </Tabs>
            )}
        </main>
      </div>
      <Dialog
          open={!!editingInfo}
          onOpenChange={(isOpen) => !isOpen && setEditingInfo(null)}
      >
          <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
              <DialogTitle>Editar Costo de Producto</DialogTitle>
              <DialogDescription>
              Actualiza el costo y la información para el SKU:{' '}
              <span className="font-bold">{editingInfo?.sale.sku}</span>
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
    </div>
  );
}
