'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, PackageSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabasePROD } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Define the type for our SKU data
type SkuOficial = {
  sku: string;
  sku_mdr: string;
  cat_mdr: string | null;
  piezas_por_sku: number | null;
  esti_time: number | null;
};

export default function RepositorioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SkuOficial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search term
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 2) {
        performSearch(searchTerm.trim());
      } else {
        setResults([]);
        if (hasSearched) {
          setHasSearched(false);
        }
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const { data, error } = await supabasePROD
        .from('sku_m')
        .select('sku, sku_mdr, cat_mdr, piezas_por_sku, esti_time')
        .or(`sku.ilike.%${term}%,sku_mdr.ilike.%${term}%`)
        .limit(50);

      if (error) {
        throw error;
      }

      if (data) {
        setResults(data);
      }
    } catch (err: any) {
      setError('No se pudieron obtener los resultados. Inténtalo de nuevo.');
      console.error('Error searching SKUs:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold">Repositorio de SKUs Oficiales</h1>
            <p className="text-muted-foreground">
              Busca y consulta los SKUs oficiales registrados en el sistema.
            </p>
          </div>
        </header>

        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buscar SKU Oficial</CardTitle>
              <CardDescription>
                Busca por SKU o SKU MDR. La búsqueda se iniciará automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-sku"
                  placeholder="Escribe el SKU o SKU MDR..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU Oficial</TableHead>
                      <TableHead>SKU MDR</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Piezas x SKU</TableHead>
                      <TableHead className="text-right">Tiempo Est. (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <span>Buscando...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                       <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-red-600">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : results.length > 0 ? (
                      results.map((sku) => (
                        <TableRow key={sku.sku_mdr}>
                          <TableCell className="font-medium">{sku.sku || '-'}</TableCell>
                          <TableCell>{sku.sku_mdr}</TableCell>
                          <TableCell>{sku.cat_mdr || '-'}</TableCell>
                          <TableCell className="text-right">{sku.piezas_por_sku ?? '-'}</TableCell>
                          <TableCell className="text-right">{sku.esti_time ?? '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                           <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <PackageSearch className="h-12 w-12"/>
                                <p className="font-semibold">{hasSearched ? "No se encontraron resultados." : "Escribe al menos 3 caracteres para buscar."}</p>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
