'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CorteDeCajaPage() {
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
            <h1 className="text-3xl font-bold">Corte de Caja</h1>
            <p className="text-muted-foreground">
              Revisa y gestiona los cortes de caja.
            </p>
          </div>
        </header>
        <main>
          {/* El contenido de la página irá aquí */}
        </main>
      </div>
    </div>
  );
}
