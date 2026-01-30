'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/date-picker';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

// Mock data
const skus = [
  { id: 'MSREF JALADERACONOJILLO', label: 'MSREF JALADERACONOJILLO' },
  {
    id: 'RACK_OFICINA_ECO_KD_GRIS_1PZA_MDF',
    label: 'RACK_OFICINA_ECO_KD_GRIS_1PZA_MDF',
  },
  {
    id: 'RAC_OFI_ECO_KD_GRL1PZ_MET_MDF_1.8',
    label: 'RAC_OFI_ECO_KD_GRL1PZ_MET_MDF_1.8',
  },
  {
    id: 'RAC_OFI_ECO_KD_GRI_2PZ_MET_MDF_1.8',
    label: 'RAC_OFI_ECO_KD_GRI_2PZ_MET_MDF_1.8',
  },
  {
    id: 'RAC_OFI_ECO_KD_GRL3PZ_MET_MDF_1.8',
    label: 'RAC_OFI_ECO_KD_GRL3PZ_MET_MDF_1.8',
  },
];

export default function AnalisisSkuPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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

        <main>
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="grid gap-1.5 flex-grow-[2] min-w-[240px]">
                  <Label>Buscar SKU</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal text-left"
                      >
                        <span className="text-muted-foreground">RAC</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-medium">
                          Seleccionar SKUs
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Desmarca los SKUs que no quieras incluir.
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {skus.map((sku) => (
                            <div
                              key={sku.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox id={sku.id} defaultChecked />
                              <Label
                                htmlFor={sku.id}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {sku.label}
                              </Label>
                            </div>
                          ))}
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
        </main>
      </div>
    </div>
  );
}
