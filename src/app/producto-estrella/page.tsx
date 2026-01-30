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
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { CompanySelect } from '@/components/company-select';

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

const SimpleAnalysisView = ({
  onSwitchToMultiPeriod,
}: {
  onSwitchToMultiPeriod: () => void;
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold">
                Análisis de Productos Estrella
              </h1>
              <p className="text-muted-foreground">
                Los productos que representan el 80% del total de etiquetas
                impresas (Principio de Pareto).
              </p>
            </div>
          </div>
        </div>
        <Button onClick={onSwitchToMultiPeriod}>
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
                <DatePicker
                  id="fecha-inicio"
                  value={startDate}
                  onChange={setStartDate}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fecha-fin">Fecha Fin</Label>
                <DatePicker
                  id="fecha-fin"
                  value={endDate}
                  onChange={setEndDate}
                />
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
                <p className="text-sm text-muted-foreground">
                  PRODUCTOS ESTRELLA
                </p>
                <p className="text-4xl font-bold text-primary">83</p>
              </Card>
              <Card className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  ETIQUETAS TOTALES (HISTÓRICO)
                </p>
                <p className="text-4xl font-bold text-primary">35,140</p>
              </Card>
              <Card className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  ETIQUETAS DE PRODUCTOS ESTRELLA
                </p>
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
              Listado de los productos más importantes por volumen de impresión
              en el histórico.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Producto</TableHead>
                  <TableHead className="text-right">
                    Etiquetas Impresas
                  </TableHead>
                  <TableHead className="text-right">% del Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {starProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.id}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.etiquetas.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.totalPercent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

type Period = {
  id: number;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  company: string;
};

const MultiPeriodAnalysisView = ({
  onSwitchToSimple,
}: {
  onSwitchToSimple: () => void;
}) => {
  const [periods, setPeriods] = useState<Period[]>([
    {
      id: Date.now(),
      name: 'DOMESKA',
      startDate: null,
      endDate: null,
      company: 'domeska',
    },
    {
      id: Date.now() + 1,
      name: 'TAL',
      startDate: null,
      endDate: null,
      company: 'tal',
    },
  ]);

  const addPeriod = () => {
    setPeriods([
      ...periods,
      {
        id: Date.now(),
        name: '',
        startDate: null,
        endDate: null,
        company: 'all',
      },
    ]);
  };

  const removePeriod = (id: number) => {
    setPeriods(periods.filter((p) => p.id !== id));
  };

  const updatePeriod = (id: number, field: keyof Period, value: any) => {
    setPeriods(
      periods.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-bold">
                Análisis de Productos Estrella
              </h1>
              <p className="text-muted-foreground">
                Comparativa de productos 80/20 en diferentes periodos.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={onSwitchToSimple}>
          <BarChartBig className="w-4 h-4 mr-2" />
          Análisis Simple
        </Button>
      </header>
      <main>
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Periodos</CardTitle>
            <CardDescription>
              Define los periodos que deseas comparar. Puedes añadir o quitar
              periodos según necesites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="flex flex-wrap items-end gap-4 p-4 border rounded-lg"
                >
                  <div className="grid gap-1.5 flex-1 min-w-[180px]">
                    <Label htmlFor={`name-${period.id}`}>Nombre Periodo</Label>
                    <Input
                      id={`name-${period.id}`}
                      value={period.name}
                      onChange={(e) =>
                        updatePeriod(period.id, 'name', e.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[180px]">
                    <Label htmlFor={`start-date-${period.id}`}>
                      Fecha Inicio
                    </Label>
                    <DatePicker
                      id={`start-date-${period.id}`}
                      value={period.startDate}
                      onChange={(date) =>
                        updatePeriod(period.id, 'startDate', date)
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[180px]">
                    <Label htmlFor={`end-date-${period.id}`}>Fecha Fin</Label>
                    <DatePicker
                      id={`end-date-${period.id}`}
                      value={period.endDate}
                      onChange={(date) =>
                        updatePeriod(period.id, 'endDate', date)
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[180px]">
                    <Label htmlFor={`company-${period.id}`}>Empresa</Label>
                    <CompanySelect
                      value={period.company}
                      onValueChange={(value) =>
                        updatePeriod(period.id, 'company', value)
                      }
                    />
                  </div>
                  {periods.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePeriod(period.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-6">
              <Button variant="outline" onClick={addPeriod}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Periodo
              </Button>
              <Button>Ejecutar Análisis</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default function ProductoEstrellaPage() {
  const [analysisType, setAnalysisType] = useState<'simple' | 'multi'>(
    'simple'
  );

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      {analysisType === 'simple' ? (
        <SimpleAnalysisView
          onSwitchToMultiPeriod={() => setAnalysisType('multi')}
        />
      ) : (
        <MultiPeriodAnalysisView
          onSwitchToSimple={() => setAnalysisType('simple')}
        />
      )}
    </div>
  );
}
