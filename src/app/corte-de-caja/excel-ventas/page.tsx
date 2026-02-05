'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExcelVentasPage() {
  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link
            href="/corte-de-caja"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Corte de Caja
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Excel de Ventas</h1>
            <p className="text-muted-foreground">
              Genera y descarga el reporte de ventas en formato Excel.
            </p>
          </div>
        </header>
        <main className="flex justify-center items-center py-16">
          <Button>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Generar Excel de Ventas
          </Button>
        </main>
      </div>
    </div>
  );
}
