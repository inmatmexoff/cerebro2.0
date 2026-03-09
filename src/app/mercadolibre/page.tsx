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
} from '@/components/ui/card';
import { ML_APP_ID, ML_CALLBACK_PATH } from '@/lib/ml-config';

export default function MercadoLibrePage() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  const errorParam = searchParams.get('error');

  const [responseData, setResponseData] = useState<any | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  useEffect(() => {
    if (dataParam) {
      try {
        setResponseData(JSON.parse(dataParam));
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
    // Dynamically construct the redirect URI using the window's origin.
    // This is crucial to avoid using "localhost", which Mercado Libre blocks.
    const redirectUri = `${window.location.origin}${ML_CALLBACK_PATH}`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ML_APP_ID,
      redirect_uri: redirectUri,
    });

    // Using the Mexico-specific authorization URL.
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
                    : 'Estos son los tokens de acceso que tu API de proxy ha obtenido de Mercado Libre. No se almacenan en el navegador.'
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
                    <div>
                        <p className="font-semibold mb-2">
                            {responseData.message}
                        </p>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                            {JSON.stringify(responseData.tokens, null, 2)}
                        </pre>
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
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
