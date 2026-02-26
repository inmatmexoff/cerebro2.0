'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CostoHistorico = {
  id: number;
  sku_mdr: string;
  landed_cost: number | null;
  proveedor: string | null;
  created_at: string;
};

export default function HistorialCostosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [results, setResults] = useState<CostoHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search term
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 2 || searchTerm.trim().length === 0) {
        setDebouncedSearchTerm(searchTerm.trim());
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      setHasSearched(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        if (debouncedSearchTerm) {
          params.append('sku_mdr', debouncedSearchTerm);
        }
        
        const response = await fetch(`/api/historial-costos?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al obtener los datos.');
        }

        const data = await response.json();
        setResults(data);

      } catch (err: any) {
        setError('No se pudieron obtener los resultados. Inténtalo de nuevo.');
        console.error('Error searching cost history:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

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
            <h1 className="text-3xl font-bold">Historial de Landed Costs</h1>
            <p className="text-muted-foreground">
              Busca y consulta el historial de cambios en los costos de los productos.
            </p>
          </div>
        </header>

        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buscar por NOMBRE MADRE</CardTitle>
              <CardDescription>
                La búsqueda se iniciará automáticamente al escribir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-sku"
                  placeholder="Escribe el NOMBRE MADRE..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados del Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>NOMBRE MADRE</TableHead>
                      <TableHead className="text-right">Landed Cost</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Fecha de Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <span>Buscando...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                       <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-red-600">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : results.length > 0 ? (
                      results.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.sku_mdr}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.landed_cost !== null 
                                ? item.landed_cost.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) 
                                : '-'}
                          </TableCell>
                          <TableCell>{item.proveedor || '-'}</TableCell>
                          <TableCell className="text-right">{formatDate(item.created_at)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                           <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <History className="h-12 w-12"/>
                                <p className="font-semibold">{hasSearched ? "No se encontraron resultados." : "Escribe para buscar o deja en blanco para ver todo el historial."}</p>
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
