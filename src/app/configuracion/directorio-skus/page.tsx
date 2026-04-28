'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Loader2,
  FolderTree,
  Folders,
  Tag,
  Download,
} from 'lucide-react';
import { supabasePROD } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CompanySelect } from '@/components/company-select';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

type SkuM = {
  sku_mdr: string;
  cat_mdr: string | null;
  sub_cat: string | null;
  sku: string | null;
};

type SkuAlterno = {
  sku: string;
  sku_mdr: string;
  empresa: string | null;
};

type GroupedSkus = {
  [category: string]: {
    count: number;
    subCategoryCount: number;
    subCategories: {
      [subCategory: string]: {
        count: number;
        skuMdr: {
          [skuMdr: string]: {
            count: number;
            skus: string[];
            officialSku: string | null;
          };
        };
      };
    };
  };
};

export default function DirectorioSkusPage() {
  const [skuMList, setSkuMList] = useState<SkuM[]>([]);
  const [skuAlternoList, setSkuAlternoList] = useState<SkuAlterno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Helper function to fetch all records from a table with pagination
        const fetchAll = async (tableName: string, columns: string) => {
          const BATCH_SIZE = 1000;
          let records: any[] = [];
          let from = 0;
          while (true) {
            const { data, error } = await supabasePROD
              .from(tableName)
              .select(columns)
              .range(from, from + BATCH_SIZE - 1);

            if (error) throw error;
            if (data) {
              records = records.concat(data);
            }
            if (!data || data.length < BATCH_SIZE) {
              break;
            }
            from += BATCH_SIZE;
          }
          return records;
        };

        const [skuMData, skuAlternoData] = await Promise.all([
          fetchAll('sku_m', 'sku_mdr, cat_mdr, sub_cat, sku'),
          fetchAll('sku_alterno', 'sku, sku_mdr, empresa'),
        ]);

        setSkuMList(skuMData || []);
        setSkuAlternoList(skuAlternoData || []);
      } catch (err: any) {
        setError('No se pudieron cargar los datos de SKUs.');
        console.error('Error fetching SKU data:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCopyToClipboard = (text: string, type: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: `${type} copiado`,
          description: `"${text}" se ha copiado al portapapeles.`,
        });
      })
      .catch((err) => {
        console.error('Error al copiar:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `No se pudo copiar el ${type}.`,
        });
      });
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast({
      title: 'Iniciando exportación',
      description: 'Esto puede tardar unos momentos...',
    });

    try {
      // 1. Fetch all necessary data
      const { data: skuMData, error: skuMError } = await supabasePROD
        .from('sku_m')
        .select('*');
      if (skuMError) throw skuMError;

      const { data: allSkuAlternoData, error: skuAlternoError } =
        await supabasePROD.from('sku_alterno').select('*');
      if (skuAlternoError) throw skuAlternoError;

      const { data: allSkuCostosData, error: allSkuCostosError } =
        await supabasePROD
          .from('sku_costos')
          .select('sku_mdr, landed_cost, proveedor, piezas_xcontenedor, fecha_desde')
          .order('fecha_desde', { ascending: false });
      if (allSkuCostosError) throw allSkuCostosError;

      const latestCosts = new Map<string, any>();
      allSkuCostosData?.forEach((cost) => {
        if (!latestCosts.has(cost.sku_mdr)) {
          latestCosts.set(cost.sku_mdr, cost);
        }
      });

      // 2. Join the data
      const skuMMap = new Map(skuMData.map((m) => [m.sku_mdr, m]));

      const exportedData = allSkuAlternoData.map((alterno) => {
        const master = skuMMap.get(alterno.sku_mdr);
        const cost = latestCosts.get(alterno.sku_mdr);

        return {
          'SKU Alterno': alterno.sku,
          Empresa: alterno.empresa,
          'SKU MDR (Nombre Madre)': alterno.sku_mdr,
          'SKU Oficial (en sku_m)': master?.sku ?? alterno.sku,
          'Categoria Madre': master?.cat_mdr,
          'Sub Categoria': master?.sub_cat,
          'Tiempo Estimado (min)': master?.esti_time,
          'Piezas por SKU': master?.piezas_por_sku,
          'Empaquetado Master': master?.empaquetado_master,
          'Tipo Empaquetado': master?.tip_empa,
          'Piezas por Empaquetado Master': master?.pz_empaquetado_master,
          'Landed Cost (último)': cost?.landed_cost,
          'Proveedor (último costo)': cost?.proveedor,
          'Piezas por Contenedor (último costo)': cost?.piezas_xcontenedor,
          'Fecha último costo': cost?.fecha_desde,
        };
      });

      // 3. Create and download Excel
      const worksheet = XLSX.utils.json_to_sheet(exportedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Directorio_SKUs');
      XLSX.writeFile(workbook, 'directorio_completo_skus.xlsx');

      toast({
        title: 'Exportación completada',
        description: 'El archivo se ha descargado.',
      });
    } catch (err: any) {
      console.error('Error exporting data:', err);
      toast({
        variant: 'destructive',
        title: 'Error de exportación',
        description: err.message || 'No se pudieron exportar los datos.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const groupedAndFilteredSkus = useMemo(() => {
    if (skuMList.length === 0) return {};

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const effectiveCompanyFilter =
      companyFilter && companyFilter !== 'all'
        ? companyFilter.replace(/-/g, ' ').toUpperCase()
        : null;

    // Filter alterno list by company
    const companyFilteredAlternoList = effectiveCompanyFilter
      ? skuAlternoList.filter(
          (sa) => sa.empresa && sa.empresa.toUpperCase() === effectiveCompanyFilter
        )
      : skuAlternoList;

    // Filter skus first to find relevant sku_mdr
    const filteredAlternoBySku = companyFilteredAlternoList.filter((sa) =>
      sa.sku.toLowerCase().includes(lowerCaseSearchTerm)
    );
    const relevantSkuMdrsFromAlterno = new Set(
      filteredAlternoBySku.map((sa) => sa.sku_mdr)
    );

    // Get visible sku_mdrs from the company filter. If no company is selected, all are visible.
    const companyVisibleSkuMdrs = new Set(
      companyFilteredAlternoList.map((sa) => sa.sku_mdr)
    );

    // Filter sku_m based on search term or if they are related to a found SKU
    const filteredSkuM = skuMList.filter(
      (sm) =>
        // Company filter check
        (!effectiveCompanyFilter || companyVisibleSkuMdrs.has(sm.sku_mdr)) &&
        // Search filter check
        (sm.sku_mdr.toLowerCase().includes(lowerCaseSearchTerm) ||
          sm.cat_mdr?.toLowerCase().includes(lowerCaseSearchTerm) ||
          sm.sub_cat?.toLowerCase().includes(lowerCaseSearchTerm) ||
          relevantSkuMdrsFromAlterno.has(sm.sku_mdr) ||
          (sm.sku && sm.sku.toLowerCase().includes(lowerCaseSearchTerm)))
    );

    const finalSkuMdrsInScope = new Set(filteredSkuM.map((sm) => sm.sku_mdr));

    const grouped: GroupedSkus = {};

    filteredSkuM.forEach((sm) => {
      const category = sm.cat_mdr || 'Sin Categoría';
      const subCategory = sm.sub_cat || 'Sin Subcategoría';
      const skuMdr = sm.sku_mdr;

      if (!grouped[category]) {
        grouped[category] = { count: 0, subCategoryCount: 0, subCategories: {} };
      }
      if (!grouped[category].subCategories[subCategory]) {
        grouped[category].subCategories[subCategory] = { count: 0, skuMdr: {} };
      }
      if (!grouped[category].subCategories[subCategory].skuMdr[skuMdr]) {
        grouped[category].subCategories[subCategory].skuMdr[skuMdr] = {
          count: 0,
          skus: [],
          officialSku: sm.sku,
        };
      }
    });

    companyFilteredAlternoList.forEach((sa) => {
      if (!finalSkuMdrsInScope.has(sa.sku_mdr)) return;

      const skuM = skuMList.find((sm) => sm.sku_mdr === sa.sku_mdr);
      if (skuM) {
        const category = skuM.cat_mdr || 'Sin Categoría';
        const subCategory = skuM.sub_cat || 'Sin Subcategoría';

        if (grouped[category]?.subCategories[subCategory]?.skuMdr[sa.sku_mdr]) {
          if (
            !searchTerm ||
            sa.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
            (skuM.sku && skuM.sku.toLowerCase().includes(lowerCaseSearchTerm))
          ) {
            grouped[category].subCategories[subCategory].skuMdr[
              sa.sku_mdr
            ].skus.push(sa.sku);
          } else if (filteredSkuM.some((fsm) => fsm.sku_mdr === sa.sku_mdr)) {
            grouped[category].subCategories[subCategory].skuMdr[
              sa.sku_mdr
            ].skus.push(sa.sku);
          }
        }
      }
    });

    // Calculate counts and clean up empty branches
    Object.keys(grouped).forEach((cat) => {
      let catCount = 0;
      let subCatGroupCount = 0;
      Object.keys(grouped[cat].subCategories).forEach((subCat) => {
        let subCatCount = 0;
        Object.keys(grouped[cat].subCategories[subCat].skuMdr).forEach(
          (skuMdr) => {
            const skuMdrData = grouped[cat].subCategories[subCat].skuMdr[skuMdr];
            if (
              skuMdrData.officialSku &&
              !skuMdrData.skus.includes(skuMdrData.officialSku)
            ) {
              skuMdrData.skus.push(skuMdrData.officialSku);
            }

            const skusList = skuMdrData.skus;
            const count = skusList.length;

            if (count > 0) {
              grouped[cat].subCategories[subCat].skuMdr[skuMdr].skus = [
                ...new Set(skusList),
              ];
              grouped[cat].subCategories[subCat].skuMdr[skuMdr].count = [
                ...new Set(skusList),
              ].length;
              subCatCount += [...new Set(skusList)].length;
            } else {
              delete grouped[cat].subCategories[subCat].skuMdr[skuMdr];
            }
          }
        );
        if (subCatCount > 0) {
          grouped[cat].subCategories[subCat].count = subCatCount;
          catCount += subCatCount;
          subCatGroupCount++;
        } else {
          delete grouped[cat].subCategories[subCat];
        }
      });
      if (catCount > 0) {
        grouped[cat].count = catCount;
        grouped[cat].subCategoryCount = subCatGroupCount;
      } else {
        delete grouped[cat];
      }
    });

    return grouped;
  }, [skuMList, skuAlternoList, searchTerm, companyFilter]);

  const summaryStats = useMemo(() => {
    const categories = Object.keys(groupedAndFilteredSkus);
    let subCategoryCount = 0;
    let skuMdrCount = 0;

    categories.forEach((catKey) => {
      const category = groupedAndFilteredSkus[catKey];
      const subCategories = Object.keys(category.subCategories);
      subCategoryCount += subCategories.length;
      subCategories.forEach((subCatKey) => {
        const subCategory = category.subCategories[subCatKey];
        skuMdrCount += Object.keys(subCategory.skuMdr).length;
      });
    });

    return {
      categoryCount: categories.length,
      subCategoryCount,
      skuMdrCount,
    };
  }, [groupedAndFilteredSkus]);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link
            href="/configuracion/carga-sku"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Carga de SKUs
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Directorio de SKUs</h1>
            <p className="text-muted-foreground">
              Consulta la jerarquía de SKUs por categoría, subcategoría y nombre
              madre.
            </p>
          </div>
        </header>

        <main className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Buscar en el Directorio</CardTitle>
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isExporting ? 'Exportando...' : 'Exportar Todo'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-skus"
                    placeholder="Buscar por SKU, Nombre Madre, Categoría..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <CompanySelect
                  value={companyFilter}
                  onValueChange={setCompanyFilter}
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Directorio</CardTitle>
                  <CardDescription>
                    Totales basados en la búsqueda actual. Haz clic en un
                    elemento del directorio para copiar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <FolderTree className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {summaryStats.categoryCount}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Categorías
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Folders className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {summaryStats.subCategoryCount}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Subcategorías
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Tag className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {summaryStats.skuMdrCount}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Nombres Madre
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4 mt-4 text-sm text-muted-foreground">
                    <h5 className="font-semibold text-foreground mb-2">
                      Simbología de Contadores
                    </h5>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Categoría:</span>
                        <Badge variant="outline"># Subcategorías</Badge>
                        <Badge variant="secondary"># SKUs</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Subcategoría:</span>
                        <Badge variant="outline"># SKUs</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Nombre Madre:</span>
                        <Badge variant="outline" className="font-mono">
                          # SKUs
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">SKU Oficial:</span>
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          Oficial
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {Object.keys(groupedAndFilteredSkus).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {searchTerm
                      ? 'No se encontraron resultados para tu búsqueda.'
                      : 'No hay SKUs para mostrar.'}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-2 sm:p-4">
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(groupedAndFilteredSkus)
                        .sort()
                        .map(
                          ([category, catData]) =>
                            catData.count > 0 && (
                              <AccordionItem value={category} key={category}>
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className="cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyToClipboard(
                                          category,
                                          'Categoría'
                                        );
                                      }}
                                    >
                                      {category}
                                    </span>
                                    <Badge variant="outline">
                                      {catData.subCategoryCount}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {catData.count}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-4 sm:pl-6">
                                  <Accordion type="multiple" className="w-full">
                                    {Object.entries(catData.subCategories)
                                      .sort()
                                      .map(
                                        ([subCategory, subCatData]) =>
                                          subCatData.count > 0 && (
                                            <AccordionItem
                                              value={subCategory}
                                              key={subCategory}
                                              className="border-l"
                                            >
                                              <AccordionTrigger className="font-medium hover:no-underline px-4">
                                                <div className="flex items-center gap-3">
                                                  <span
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCopyToClipboard(
                                                        subCategory,
                                                        'Subcategoría'
                                                      );
                                                    }}
                                                  >
                                                    {subCategory}
                                                  </span>
                                                  <Badge variant="outline">
                                                    {subCatData.count}
                                                  </Badge>
                                                </div>
                                              </AccordionTrigger>
                                              <AccordionContent className="pl-4 sm:pl-6">
                                                <Accordion
                                                  type="multiple"
                                                  className="w-full"
                                                >
                                                  {Object.entries(
                                                    subCatData.skuMdr
                                                  )
                                                    .sort()
                                                    .map(
                                                      ([skuMdr, skuMdrData]) =>
                                                        skuMdrData.count >
                                                          0 && (
                                                          <AccordionItem
                                                            value={skuMdr}
                                                            key={skuMdr}
                                                            className="border-l"
                                                          >
                                                            <AccordionTrigger className="text-sm hover:no-underline px-4">
                                                              <div className="flex items-center gap-3">
                                                                <span
                                                                  className="cursor-pointer"
                                                                  onClick={(
                                                                    e
                                                                  ) => {
                                                                    e.stopPropagation();
                                                                    handleCopyToClipboard(
                                                                      skuMdr,
                                                                      'Nombre Madre'
                                                                    );
                                                                  }}
                                                                >
                                                                  {skuMdr}
                                                                </span>
                                                                <Badge
                                                                  variant="outline"
                                                                  className="font-mono"
                                                                >
                                                                  {
                                                                    skuMdrData.count
                                                                  }
                                                                </Badge>
                                                              </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pl-6 pt-2">
                                                              <ul className="space-y-1">
                                                                {skuMdrData.skus
                                                                  .sort()
                                                                  .map(
                                                                    (sku) => (
                                                                      <li
                                                                        key={
                                                                          sku
                                                                        }
                                                                        className="text-sm text-muted-foreground list-disc list-inside flex items-center gap-2"
                                                                      >
                                                                        <span
                                                                          className={cn(
                                                                            'cursor-pointer hover:text-primary hover:underline',
                                                                            sku ===
                                                                              skuMdrData.officialSku &&
                                                                              'font-semibold text-primary'
                                                                          )}
                                                                          onClick={(
                                                                            e
                                                                          ) => {
                                                                            e.stopPropagation();
                                                                            handleCopyToClipboard(
                                                                              sku,
                                                                              'SKU'
                                                                            );
                                                                          }}
                                                                        >
                                                                          {sku}
                                                                        </span>
                                                                        {sku ===
                                                                          skuMdrData.officialSku && (
                                                                          <Badge
                                                                            variant="outline"
                                                                            className="ml-2 border-primary text-primary"
                                                                          >
                                                                            Oficial
                                                                          </Badge>
                                                                        )}
                                                                      </li>
                                                                    )
                                                                  )}
                                                              </ul>
                                                            </AccordionContent>
                                                          </AccordionItem>
                                                        )
                                                    )}
                                                </Accordion>
                                              </AccordionContent>
                                            </AccordionItem>
                                          )
                                      )}
                                  </Accordion>
                                </AccordionContent>
                              </AccordionItem>
                            )
                        )}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
