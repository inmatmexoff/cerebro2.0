'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cable, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { ML_APP_ID, ML_RENDER_REDIRECT_URI } from '@/lib/ml-config';

export default function MercadoLibreClient() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  const errorParam = searchParams.get('error');

  const [responseData, setResponseData] = useState<any | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  useEffect(() => {
    if (dataParam) {
      try {
        const parsedData = JSON.parse(dataParam);
        setResponseData(parsedData);
        if (parsedData.tokens && parsedData.tokens.access_token) {
          // Store the access token and refresh token in local storage
          localStorage.setItem('ml_access_token', parsedData.tokens.access_token);
          localStorage.setItem('ml_refresh_token', parsedData.tokens.refresh_token);
          // Also store expiry time
          const expiryTime = new Date().getTime() + (parsedData.tokens.expires_in * 1000);
          localStorage.setItem('ml_token_expiry', expiryTime.toString());
        }
      } catch (e) {
        setResponseError('Error al procesar la respuesta del servidor.');
      }
    }
    if (errorParam) {
      setResponseError(errorParam);
    }
  }, [dataParam, errorParam]);


  const handleLogin = () => {
    if (!ML_APP_ID) {
        alert("El App ID de Mercado Libre no está configurado.");
        return;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ML_APP_ID,
      redirect_uri: ML_RENDER_REDIRECT_URI,
    });

    window.location.href = `https://auth.mercadolibre.com.mx/authorization?${params}`;
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
            <h1 className="text-3xl font-bold">Conectar con Mercado Libre</h1>
            <p className="text-muted-foreground">
              Autoriza la aplicación para acceder a tus datos de Mercado Libre. El resultado se mostrará en esta misma pantalla.
            </p>
          </div>
        </header>

        <main>
          {responseData || responseError ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {responseError ? <XCircle className="text-destructive" /> : <CheckCircle className="text-primary" />}
                  {responseError ? 'Error de Autenticación' : 'Conexión Exitosa'}
                </CardTitle>
                 <CardDescription>
                  {responseError 
                    ? 'Ocurrió un error durante el proceso de autenticación.' 
                    : 'La conexión se ha establecido correctamente. Ya puedes acceder a las funcionalidades que utilizan la API de Mercado Libre.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {responseError ? (
                    <div className="text-destructive bg-destructive/10 p-4 rounded-md">
                        <p className="font-semibold">Mensaje de error:</p>
                        <p>{responseError}</p>
                    </div>
                ) : responseData ? (
                    <div className="space-y-2">
                        <p className="font-semibold text-primary">
                            ¡Conexión exitosa!
                        </p>
                        <p className="text-sm">
                            Hemos guardado tu token de acceso en tu navegador. Ahora puedes ir a la sección de publicaciones.
                        </p>
                         <Button asChild className="mt-4">
                            <Link href="/corte-de-caja/publicaciones">Ver mis publicaciones</Link>
                        </Button>
                    </div>
                ) : null}
                 <Button asChild variant="link" className="px-0 mt-4">
                    <Link href="/mercadolibre">Volver a intentar</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                <CardTitle>Integración de Mercado Libre</CardTitle>
                <CardDescription>
                    Haz clic en el botón para conectar tu cuenta de Mercado Libre de forma segura.
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
                    <p>Asegúrate de que la siguiente URL esté registrada como "Redirect URI" en tu aplicación de Mercado Libre:</p>
                    <p className="font-mono bg-muted p-2 rounded-md mt-2 break-all">{ML_RENDER_REDIRECT_URI}</p>
                </CardFooter>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
