'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DatePicker } from '@/components/date-picker';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { supabasePROD } from '@/lib/supabase';

export default function AnalisisSkuPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [skus, setSkus] = useState<{ id: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabasePROD
          .from('sku_alterno')
          .select('sku')
          .order('sku', { ascending: true });

        if (error) {
          throw error;
        }

        if (data) {
          const formattedSkus = data.map((item) => ({
            id: item.sku,
            label: item.sku,
          }));
          setSkus(formattedSkus);
        }
      } catch (err: any) {
        setError('No se pudieron cargar los SKUs. Inténtalo de nuevo.');
        console.error('Error fetching SKUs:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSkus();
  }, []);

  const filteredSkusForSearch = React.useMemo(() => {
    if (!searchTerm) {
      return [];
    }
    return skus.filter((sku) =>
      sku.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, skus]);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Análisis Avanzado por SKU</h1>
            <p className="text-muted-foreground">
              Filtra y analiza el rendimiento de SKUs específicos por etiquetas y
              piezas.
            </p>
          </div>
        </header>

        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="grid gap-1.5 flex-grow-[2] min-w-[240px]">
                  <Label>Seleccionar SKU</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal text-left"
                        disabled={isLoading || !!error}
                      >
                        <span className="text-muted-foreground">
                          {isLoading
                            ? 'Cargando SKUs...'
                            : 'Seleccionar SKUs...'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-medium">Seleccionar SKUs</p>
                        <p className="text-xs text-muted-foreground">
                          Desmarca los SKUs que no quieras incluir.
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {isLoading ? (
                            <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Cargando...
                            </div>
                          ) : error ? (
                            <div className="p-4 text-sm text-center text-red-600">
                              {error}
                            </div>
                          ) : skus.length > 0 ? (
                            skus.map((sku) => (
                              <div
                                key={sku.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`check-${sku.id}`}
                                  defaultChecked
                                />
                                <Label
                                  htmlFor={`check-${sku.id}`}
                                  className="text-sm font-normal cursor-pointer flex-1"
                                >
                                  {sku.label}
                                </Label>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-center text-muted-foreground">
                              No hay SKUs disponibles.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-2 border-t">
                        <Button className="w-full">Filtrar</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
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
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Analizar SKUs Seleccionados
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consultar SKU's</CardTitle>
              <CardDescription>
                Busca en la lista de SKUs en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-sku"
                  placeholder="Escribe para buscar..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading || !!error}
                />
              </div>
              <div className="mt-4 border rounded-md max-h-72 overflow-y-auto">
                <ul className="divide-y divide-border">
                  {isLoading ? (
                    <li className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cargando SKUs...
                    </li>
                  ) : error ? (
                    <li className="p-4 text-sm text-center text-red-600">
                      {error}
                    </li>
                  ) : filteredSkusForSearch.length > 0 ? (
                    filteredSkusForSearch.map((sku) => (
                      <li key={sku.id} className="p-3 text-sm">
                        {sku.label}
                      </li>
                    ))
                  ) : (
                    <li className="p-4 text-sm text-center text-muted-foreground">
                      {skus.length === 0
                        ? 'No hay SKUs disponibles.'
                        : searchTerm
                        ? 'No se encontraron resultados.'
                        : 'Escribe para empezar a buscar.'}
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
