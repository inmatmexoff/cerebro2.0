'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  BarChartBig,
  Filter,
  X,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/date-picker';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';

// Mock data for the table
const starProducts = [
  {
    id: 'b0dc0c-ce82-5c1c-a96a-aa530cdd61d7',
    name: 'Anaquel Metalico Inmatmex 5 Niveles- Diseño Y Durabilidad Metal',
    etiquetas: 3611,
    totalPercent: '10.28%',
  },
   {
    id: 'a1b2c3-d4e5-f6g7-h8i9-j0k1l2m3n4o5',
    name: 'Exhibidor de alambre para botanas y frituras',
    etiquetas: 2890,
    totalPercent: '8.23%',
  },
];

export default function ProductoEstrellaPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-400" />
              <div>
                <h1 className="text-3xl font-bold">Análisis de Productos Estrella</h1>
                <p className="text-muted-foreground">
                  Los productos que representan el 80% del total de etiquetas impresas (Principio de Pareto).
                </p>
              </div>
            </div>
          </div>
          <Button>
            <BarChartBig className="w-4 h-4 mr-2" />
            Analizar Multiperiodo
          </Button>
        </header>

        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
                  <DatePicker id="fecha-inicio" value={startDate} onChange={setStartDate} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha-fin">Fecha Fin</Label>
                  <DatePicker id="fecha-fin" value={endDate} onChange={setEndDate} />
                </div>
                <Button>
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
                <Button variant="ghost">
                  <X className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Resumen del Análisis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center py-4">
                  <p className="text-sm text-muted-foreground">PRODUCTOS ESTRELLA</p>
                  <p className="text-4xl font-bold text-primary">83</p>
                </Card>
                <Card className="text-center py-4">
                  <p className="text-sm text-muted-foreground">ETIQUETAS TOTALES (HISTÓRICO)</p>
                  <p className="text-4xl font-bold text-primary">35,140</p>
                </Card>
                <Card className="text-center py-4">
                  <p className="text-sm text-muted-foreground">ETIQUETAS DE PRODUCTOS ESTRELLA</p>
                  <p className="text-4xl font-bold text-primary">28,172</p>
                </Card>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Cobertura del 80/20</p>
                  <p className="text-sm font-bold text-primary">80.2%</p>
                </div>
                <Progress value={80.2} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle de Productos Estrella</CardTitle>
              <p className="text-sm text-muted-foreground">
                Listado de los productos más importantes por volumen de impresión en el histórico.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Producto</TableHead>
                    <TableHead className="text-right">Etiquetas Impresas</TableHead>
                    <TableHead className="text-right">% del Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {starProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.id}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{product.etiquetas.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{product.totalPercent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
