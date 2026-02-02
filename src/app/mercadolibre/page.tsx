'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Cable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ML_APP_ID, ML_CALLBACK_PATH } from '@/lib/ml-config';

export default function MercadoLibrePage() {
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
              Autoriza la aplicación para acceder a tus datos de Mercado Libre.
            </p>
          </div>
        </header>

        <main>
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
        </main>
      </div>
    </div>
  );
}
