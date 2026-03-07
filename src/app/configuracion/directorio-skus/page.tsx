'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, FolderTree, Folders, Tag } from 'lucide-react';
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

type SkuM = {
  sku_mdr: string;
  cat_mdr: string | null;
  sub_cat: string | null;
  sku: string | null;
};

type SkuAlterno = {
  sku: string;
  sku_mdr: string;
};

type GroupedSkus = {
  [category: string]: {
    count: number;
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
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: skuMData, error: skuMError } = await supabasePROD
          .from('sku_m')
          .select('sku_mdr, cat_mdr, sub_cat, sku');

        if (skuMError) throw skuMError;

        const { data: skuAlternoData, error: skuAlternoError } =
          await supabasePROD.from('sku_alterno').select('sku, sku_mdr');

        if (skuAlternoError) throw skuAlternoError;

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
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${type} copiado`,
        description: `"${text}" se ha copiado al portapapeles.`,
      });
    }).catch(err => {
      console.error("Error al copiar:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo copiar el ${type}.`,
      });
    });
  };

  const groupedAndFilteredSkus = useMemo(() => {
    if (skuMList.length === 0) return {};

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Filter skus first to find relevant sku_mdr
    const filteredAlternoBySku = skuAlternoList.filter(
      (sa) => sa.sku.toLowerCase().includes(lowerCaseSearchTerm)
    );
    const relevantSkuMdrsFromAlterno = new Set(filteredAlternoBySku.map(sa => sa.sku_mdr));

    // Filter sku_m based on search term or if they are related to a found SKU
    const filteredSkuM = skuMList.filter(
      (sm) =>
        sm.sku_mdr.toLowerCase().includes(lowerCaseSearchTerm) ||
        sm.cat_mdr?.toLowerCase().includes(lowerCaseSearchTerm) ||
        sm.sub_cat?.toLowerCase().includes(lowerCaseSearchTerm) ||
        relevantSkuMdrsFromAlterno.has(sm.sku_mdr) ||
        (sm.sku && sm.sku.toLowerCase().includes(lowerCaseSearchTerm))
    );

    const finalSkuMdrsInScope = new Set(filteredSkuM.map(sm => sm.sku_mdr));

    const grouped: GroupedSkus = {};

    filteredSkuM.forEach((sm) => {
        const category = sm.cat_mdr || 'Sin Categoría';
        const subCategory = sm.sub_cat || 'Sin Subcategoría';
        const skuMdr = sm.sku_mdr;

        if (!grouped[category]) {
            grouped[category] = { count: 0, subCategories: {} };
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
    
    skuAlternoList.forEach((sa) => {
      if (!finalSkuMdrsInScope.has(sa.sku_mdr)) return;

      const skuM = skuMList.find((sm) => sm.sku_mdr === sa.sku_mdr);
      if (skuM) {
        const category = skuM.cat_mdr || 'Sin Categoría';
        const subCategory = skuM.sub_cat || 'Sin Subcategoría';
        
        if (grouped[category]?.subCategories[subCategory]?.skuMdr[sa.sku_mdr]) {
          if (!searchTerm || sa.sku.toLowerCase().includes(lowerCaseSearchTerm) || skuM.sku?.toLowerCase().includes(lowerCaseSearchTerm)) {
              grouped[category].subCategories[subCategory].skuMdr[sa.sku_mdr].skus.push(sa.sku);
          } else if (filteredSkuM.some(fsm => fsm.sku_mdr === sa.sku_mdr)) {
             grouped[category].subCategories[subCategory].skuMdr[sa.sku_mdr].skus.push(sa.sku);
          }
        }
      }
    });

    // Calculate counts and clean up empty branches
    Object.keys(grouped).forEach((cat) => {
      let catCount = 0;
      Object.keys(grouped[cat].subCategories).forEach((subCat) => {
        let subCatCount = 0;
        Object.keys(grouped[cat].subCategories[subCat].skuMdr).forEach(
          (skuMdr) => {
            const skuMdrData = grouped[cat].subCategories[subCat].skuMdr[skuMdr];
            if (skuMdrData.officialSku && !skuMdrData.skus.includes(skuMdrData.officialSku)) {
              skuMdrData.skus.push(skuMdrData.officialSku);
            }
            
            const skusList = skuMdrData.skus;
            const count = skusList.length;
            
            if (count > 0) {
                grouped[cat].subCategories[subCat].skuMdr[skuMdr].skus = [...new Set(skusList)];
                grouped[cat].subCategories[subCat].skuMdr[skuMdr].count = [...new Set(skusList)].length;
                subCatCount += [...new Set(skusList)].length;
            } else {
                delete grouped[cat].subCategories[subCat].skuMdr[skuMdr];
            }
          }
        );
        if (subCatCount > 0) {
            grouped[cat].subCategories[subCat].count = subCatCount;
            catCount += subCatCount;
        } else {
            delete grouped[cat].subCategories[subCat];
        }
      });
      if (catCount > 0) {
        grouped[cat].count = catCount;
      } else {
        delete grouped[cat];
      }
    });

    return grouped;
  }, [skuMList, skuAlternoList, searchTerm]);

  const summaryStats = useMemo(() => {
    const categories = Object.keys(groupedAndFilteredSkus);
    let subCategoryCount = 0;
    let skuMdrCount = 0;

    categories.forEach(catKey => {
        const category = groupedAndFilteredSkus[catKey];
        const subCategories = Object.keys(category.subCategories);
        subCategoryCount += subCategories.length;
        subCategories.forEach(subCatKey => {
            const subCategory = category.subCategories[subCatKey];
            skuMdrCount += Object.keys(subCategory.skuMdr).length;
        });
    });

    return {
        categoryCount: categories.length,
        subCategoryCount,
        skuMdrCount
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
              <CardTitle>Buscar en el Directorio</CardTitle>
            </CardHeader>
            <CardContent>
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
                    Totales basados en la búsqueda actual. Haz clic en un elemento del directorio para copiar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <FolderTree className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.categoryCount}</p>
                      <p className="text-sm text-muted-foreground">Categorías</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Folders className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.subCategoryCount}</p>
                      <p className="text-sm text-muted-foreground">Subcategorías</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Tag className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{summaryStats.skuMdrCount}</p>
                      <p className="text-sm text-muted-foreground">Nombres Madre</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {Object.keys(groupedAndFilteredSkus).length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        {searchTerm ? "No se encontraron resultados para tu búsqueda." : "No hay SKUs para mostrar."}
                    </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-2 sm:p-4">
                    <Accordion
                      type="multiple"
                      className="w-full"
                    >
                      {Object.entries(groupedAndFilteredSkus).sort().map(
                        ([category, catData]) =>
                          catData.count > 0 && (
                            <AccordionItem value={category} key={category}>
                              <AccordionTrigger 
                                className="text-lg font-semibold hover:no-underline px-4"
                              >
                                <div className="flex items-center gap-3">
                                    <span className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(category, 'Categoría')}}>{category}</span>
                                    <Badge variant="secondary">{catData.count}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pl-4 sm:pl-6">
                                <Accordion type="multiple" className="w-full">
                                  {Object.entries(catData.subCategories).sort().map(
                                    ([subCategory, subCatData]) =>
                                      subCatData.count > 0 && (
                                        <AccordionItem
                                          value={subCategory}
                                          key={subCategory}
                                          className="border-l"
                                        >
                                          <AccordionTrigger 
                                            className="font-medium hover:no-underline px-4"
                                          >
                                            <div className="flex items-center gap-3">
                                                <span className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(subCategory, 'Subcategoría')}}>{subCategory}</span>
                                                <Badge variant="outline">{subCatData.count}</Badge>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent className="pl-4 sm:pl-6">
                                            <Accordion
                                              type="multiple"
                                              className="w-full"
                                            >
                                              {Object.entries(subCatData.skuMdr).sort().map(
                                                ([skuMdr, skuMdrData]) =>
                                                  skuMdrData.count > 0 && (
                                                    <AccordionItem
                                                      value={skuMdr}
                                                      key={skuMdr}
                                                      className="border-l"
                                                    >
                                                      <AccordionTrigger 
                                                        className="text-sm hover:no-underline px-4"
                                                      >
                                                        <div className="flex items-center gap-3">
                                                            <span className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(skuMdr, 'Nombre Madre')}}>{skuMdr}</span>
                                                            <Badge variant="outline" className="font-mono">{skuMdrData.count}</Badge>
                                                        </div>
                                                      </AccordionTrigger>
                                                      <AccordionContent className="pl-6 pt-2">
                                                        <ul className="space-y-1">
                                                            {skuMdrData.skus.sort().map((sku) => (
                                                                <li
                                                                key={sku}
                                                                className="text-sm text-muted-foreground list-disc list-inside flex items-center gap-2"
                                                                >
                                                                <span
                                                                    className={cn(
                                                                    "cursor-pointer hover:text-primary hover:underline",
                                                                    sku === skuMdrData.officialSku && "font-semibold text-primary"
                                                                    )}
                                                                    onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(sku, 'SKU')}}
                                                                >
                                                                    {sku}
                                                                </span>
                                                                {sku === skuMdrData.officialSku && (
                                                                    <Badge variant="outline" className="ml-2 border-primary text-primary">
                                                                        Oficial
                                                                    </Badge>
                                                                )}
                                                                </li>
                                                            ))}
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
