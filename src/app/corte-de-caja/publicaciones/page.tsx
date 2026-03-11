'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const statusMap: { [key: string]: { label: string; color: string } } = {
  active: { label: 'Activa', color: 'bg-green-100 text-green-800' },
  paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
  closed: { label: 'Cerrada', color: 'bg-red-100 text-red-800' },
  under_review: { label: 'En revisión', color: 'bg-blue-100 text-blue-800' },
};

export default function PublicacionesPage() {
  const [publications, setPublications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const fetchPublications = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Get user ID
      const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401 || userResponse.status === 403) {
            throw new Error('El token de acceso no es válido o ha expirado. Por favor, vuelve a conectar tu cuenta.');
        }
        throw new Error('No se pudo obtener la información del usuario de Mercado Libre.');
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      // 2. Get publication IDs
      let allItemIds: string[] = [];
      let offset = 0;
      const limit = 50; 

      while (true) {
        const itemsResponse = await fetch(
          `https://api.mercadolibre.com/users/${userId}/items/search?offset=${offset}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!itemsResponse.ok) {
          throw new Error('No se pudieron obtener las publicaciones.');
        }

        const itemsData = await itemsResponse.json();
        const itemIds = itemsData.results || [];
        allItemIds = allItemIds.concat(itemIds);

        if (itemIds.length < limit || (itemsData.paging && itemsData.paging.total <= allItemIds.length)) {
          break;
        }
        offset += limit;
      }
      
      // 3. Get publication details in batches
      let allPublications: any[] = [];
      const batchSize = 20;

      for (let i = 0; i < allItemIds.length; i += batchSize) {
        const batchIds = allItemIds.slice(i, i + batchSize).join(',');
        const detailsResponse = await fetch(`https://api.mercadolibre.com/items?ids=${batchIds}`, {
             headers: {
              Authorization: `Bearer ${token}`,
            },
        });
        if (!detailsResponse.ok) {
            console.error(`Error fetching details for batch starting at index ${i}`);
            continue; // Skip batch on error
        }

        const detailsData = await detailsResponse.json();
        const publicationsWithDetails = detailsData.map((item: any) => item.body);
        allPublications = allPublications.concat(publicationsWithDetails);
      }
      
      setPublications(allPublications);

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ml_access_token');
    setAccessToken(token);

    if (token) {
      fetchPublications(token);
    } else {
      setIsLoading(false);
    }
  }, [fetchPublications]);
  
  const handleRetry = () => {
    if (accessToken) {
        fetchPublications(accessToken);
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Cargando publicaciones...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-8 bg-destructive/10 rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-destructive">{error}</h3>
          <p className="mt-2 text-sm text-destructive/80">
            {error.includes('expirado') 
                ? 'Tu sesión con Mercado Libre ha caducado.' 
                : 'No pudimos conectarnos con Mercado Libre.'}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
            </Button>
            <Button asChild variant="outline">
                <Link href="/mercadolibre">Reconectar Cuenta</Link>
            </Button>
          </div>
        </div>
      );
    }

    if (!accessToken) {
       return (
        <div className="text-center p-8 bg-yellow-50 border-l-4 border-yellow-400">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <h3 className="mt-4 text-lg font-semibold text-yellow-800">Conexión requerida</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Para ver tus publicaciones, primero necesitas conectar tu cuenta de Mercado Libre.
          </p>
          <Button asChild className="mt-6">
            <Link href="/mercadolibre">Conectar con Mercado Libre</Link>
          </Button>
        </div>
      );
    }
    
    if (publications.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-semibold">No se encontraron publicaciones.</p>
          <p className="text-sm mt-1">Parece que no tienes ninguna publicación activa o pausada.</p>
        </div>
      )
    }

    return (
       <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publications.map((pub) => (
              <TableRow key={pub.id}>
                <TableCell>
                  <Image
                    src={pub.thumbnail.replace('http://', 'https://')}
                    alt={pub.title}
                    width={50}
                    height={50}
                    className="rounded-md object-cover"
                  />
                </TableCell>
                <TableCell className="font-medium max-w-sm truncate">{pub.title}</TableCell>
                <TableCell className="text-right font-mono">
                  {pub.price.toLocaleString('es-MX', {
                    style: 'currency',
                    currency: pub.currency_id,
                  })}
                </TableCell>
                <TableCell className="text-center">
                    <Badge className={statusMap[pub.status]?.color || 'bg-gray-100 text-gray-800'}>
                        {statusMap[pub.status]?.label || pub.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{pub.available_quantity}</TableCell>
                <TableCell className="text-center">
                  <Button asChild variant="ghost" size="sm">
                    <a href={pub.permalink} target="_blank" rel="noopener noreferrer">
                      Ver <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
       </div>
    );
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
            <h1 className="text-3xl font-bold">Mis Publicaciones</h1>
            <p className="text-muted-foreground">
              Consulta todas tus publicaciones de Mercado Libre.
            </p>
          </div>
        </header>

        <main>
          <Card>
            <CardHeader>
              <CardTitle>Listado de Publicaciones</CardTitle>
              <CardDescription>
                {`Se encontraron ${publications.length} publicaciones.`}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderContent()}</CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
