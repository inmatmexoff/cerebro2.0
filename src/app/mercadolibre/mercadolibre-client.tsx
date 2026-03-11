'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Cable,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
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
import { ML_APP_ID, ML_REDIRECT_URI } from '@/lib/ml-config';

const statusMap: { [key: string]: { label: string; color: string } } = {
  active: { label: 'Activa', color: 'bg-green-100 text-green-800' },
  paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
  closed: { label: 'Cerrada', color: 'bg-red-100 text-red-800' },
  under_review: { label: 'En revisión', color: 'bg-blue-100 text-blue-800' },
};

export default function MercadoLibreClient() {
  const searchParams = useSearchParams();

  // Connection state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('loading');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Publications state
  const [publications, setPublications] = useState<any[]>([]);
  const [isLoadingPublications, setIsLoadingPublications] = useState(true);
  const [publicationsError, setPublicationsError] = useState<string | null>(
    null
  );

  const fetchPublications = useCallback(async (token: string) => {
    setIsLoadingPublications(true);
    setPublicationsError(null);
    try {
      // 1. Get user ID
      const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401 || userResponse.status === 403) {
          throw new Error(
            'El token de acceso no es válido o ha expirado. Por favor, vuelve a conectar tu cuenta.'
          );
        }
        throw new Error(
          'No se pudo obtener la información del usuario de Mercado Libre.'
        );
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

        if (
          itemIds.length < limit ||
          (itemsData.paging && itemsData.paging.total <= allItemIds.length)
        ) {
          break;
        }
        offset += limit;
      }

      // 3. Get publication details in batches
      let allPublications: any[] = [];
      const batchSize = 20;

      for (let i = 0; i < allItemIds.length; i += batchSize) {
        const batchIds = allItemIds.slice(i, i + batchSize).join(',');
        const detailsResponse = await fetch(
          `https://api.mercadolibre.com/items?ids=${batchIds}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!detailsResponse.ok) {
          console.error(
            `Error fetching details for batch starting at index ${i}`
          );
          continue; // Skip batch on error
        }

        const detailsData = await detailsResponse.json();
        const publicationsWithDetails = detailsData.map((item: any) => item.body);
        allPublications = allPublications.concat(publicationsWithDetails);
      }

      setPublications(allPublications);
    } catch (err: any) {
      setPublicationsError(err.message || 'Ocurrió un error inesperado.');
      // If fetching fails due to token, clear it and force re-login
      if (err.message.includes('expirado')) {
          localStorage.removeItem('ml_access_token');
          localStorage.removeItem('ml_refresh_token');
          localStorage.removeItem('ml_token_expiry');
          setAccessToken(null);
          setConnectionStatus('idle');
      }
    } finally {
      setIsLoadingPublications(false);
    }
  }, []);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    const errorParam = searchParams.get('error');

    // Case 1: Redirected back with an error from our backend or ML
    if (errorParam) {
      setConnectionError(errorParam);
      setConnectionStatus('error');
      return;
    }

    // Case 2: Redirected back with data from our backend
    if (dataParam) {
      try {
        const parsedData = JSON.parse(dataParam);
        if (parsedData.tokens && parsedData.tokens.access_token) {
          const { access_token, refresh_token, expires_in } = parsedData.tokens;
          localStorage.setItem('ml_access_token', access_token);
          localStorage.setItem('ml_refresh_token', refresh_token);
          const expiryTime = new Date().getTime() + expires_in * 1000;
          localStorage.setItem('ml_token_expiry', expiryTime.toString());
          
          setAccessToken(access_token);
          setConnectionStatus('success');
          fetchPublications(access_token);
        } else {
            throw new Error("La respuesta del servidor no contenía un token de acceso.");
        }
      } catch (e: any) {
        setConnectionError(e.message || 'Error al procesar la respuesta del servidor.');
        setConnectionStatus('error');
      }
      return;
    }

    // Case 3: Normal page load, check for existing token
    const existingToken = localStorage.getItem('ml_access_token');
    const expiry = localStorage.getItem('ml_token_expiry');
    const isTokenValid =
      existingToken && expiry && new Date().getTime() < parseInt(expiry, 10);

    if (isTokenValid) {
      setAccessToken(existingToken);
      setConnectionStatus('success');
      fetchPublications(existingToken);
    } else {
      setConnectionStatus('idle');
    }
  }, [searchParams, fetchPublications]);

  const handleLogin = () => {
    if (!ML_APP_ID) {
      alert('El App ID de Mercado Libre no está configurado.');
      return;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ML_APP_ID,
      redirect_uri: ML_REDIRECT_URI,
    });

    window.location.href = `https://auth.mercadolibre.com.mx/authorization?${params}`;
  };

  const renderContent = () => {
    if (connectionStatus === 'loading') {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Verificando conexión...</p>
        </div>
      );
    }

    if (connectionStatus === 'error') {
      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="text-destructive" />
              Error de Autenticación
            </CardTitle>
            <CardDescription>
              Ocurrió un error durante el proceso de autenticación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-destructive bg-destructive/10 p-4 rounded-md">
              <p className="font-semibold">Mensaje de error:</p>
              <p>{connectionError}</p>
            </div>
            <Button asChild variant="link" className="px-0 mt-4">
              <Link href="/mercadolibre">Volver a intentar</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (connectionStatus === 'idle') {
      return (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Integración de Mercado Libre</CardTitle>
            <CardDescription>
              Haz clic en el botón para conectar tu cuenta de Mercado Libre de
              forma segura.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Cable className="w-16 h-16 text-primary mb-4" />
            <Button onClick={handleLogin} className="w-full">
              Conectar con Mercado Libre
            </Button>
          </CardContent>
          <CardFooter className="flex-col items-start text-xs text-muted-foreground p-4 border-t">
            <p className="font-semibold">Configuración Requerida:</p>
            <p>
              Asegúrate de que la siguiente URL esté registrada como "Redirect
              URI" en tu aplicación de Mercado Libre:
            </p>
            <p className="font-mono bg-muted p-2 rounded-md mt-2 break-all">
              {ML_REDIRECT_URI}
            </p>
          </CardFooter>
        </Card>
      );
    }

    if (connectionStatus === 'success') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Listado de Publicaciones</CardTitle>
            <CardDescription>
              {`Se encontraron ${publications.length} publicaciones.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPublications ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">
                  Cargando publicaciones...
                </p>
              </div>
            ) : publicationsError ? (
              <div className="text-center p-8 bg-destructive/10 rounded-lg">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold text-destructive">
                  {publicationsError}
                </h3>
                <p className="mt-2 text-sm text-destructive/80">
                  No pudimos cargar tus publicaciones desde Mercado Libre.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <Button onClick={() => accessToken && fetchPublications(accessToken)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : publications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">No se encontraron publicaciones.</p>
                <p className="text-sm mt-1">
                  Parece que no tienes ninguna publicación activa o pausada.
                </p>
              </div>
            ) : (
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
                        <TableCell className="font-medium max-w-sm truncate">
                          {pub.title}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {pub.price.toLocaleString('es-MX', {
                            style: 'currency',
                            currency: pub.currency_id,
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              statusMap[pub.status]?.color ||
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {statusMap[pub.status]?.label || pub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {pub.available_quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button asChild variant="ghost" size="sm">
                            <a
                              href={pub.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Ver <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
  };

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
            <h1 className="text-3xl font-bold">Mercado Libre</h1>
            <p className="text-muted-foreground">
              {connectionStatus === 'success'
                ? 'Consulta tus publicaciones.'
                : 'Conecta tu cuenta para ver tus publicaciones.'}
            </p>
          </div>
        </header>

        <main>{renderContent()}</main>
      </div>
    </div>
  );
}
