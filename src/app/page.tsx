'use client';

import { SiteHeader } from "@/components/site-header";
import { DatePicker } from "@/components/date-picker";
import { CompanySelect } from "@/components/company-select";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard-card";
import { supabasePROD } from "@/lib/supabase";
import React, { useCallback } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import UsersTable from "@/components/users-table";
import { ClientOnly } from "@/components/client-only";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Star, Barcode } from "lucide-react";
import { Separator } from "@/components/ui/separator";

async function getEtiquetasCount(filters?: { startDate?: Date | null, endDate?: Date | null, company?: string }) {
    try {
      let query = supabasePROD
        .from("etiquetas_i")
        .select('*', { count: 'exact', head: true });
  
      if (filters?.company) {
        query = query.eq('organization', filters.company);
      }
  
      if (filters?.startDate || filters?.endDate) {
        if (filters.startDate) {
          const startOfDay = new Date(filters.startDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfDay.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      } else { // If no specific dates, default to today
        const now = new Date();
        const startOfDayMexicoInUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0, 0));
        
        let gte, lt;
  
        if (now.getTime() < startOfDayMexicoInUTC.getTime()) {
          lt = startOfDayMexicoInUTC.toISOString();
          const gteDate = new Date(startOfDayMexicoInUTC);
          gteDate.setUTCDate(gteDate.getUTCDate() - 1);
          gte = gteDate.toISOString();
        } else {
          gte = startOfDayMexicoInUTC.toISOString();
          const ltDate = new Date(startOfDayMexicoInUTC);
          ltDate.setUTCDate(ltDate.getUTCDate() + 1);
          lt = ltDate.toISOString();
        }
        
        query = query.gte('created_at', gte).lt('created_at', lt);
      }
      
      const { count, error } = await query;
  
      if (error) {
        console.error("Error fetching etiquetas count:", error.message);
        return 0;
      }
  
      return count ?? 0;
    } catch (error) {
      if (error instanceof Error) {
          console.error("Error in getEtiquetasCount:", error.message);
      } else {
          console.error("An unknown error occurred in getEtiquetasCount:", error);
      }
      return 0;
    }
}
  
async function getLeadingCompany(filters?: { startDate?: Date | null, endDate?: Date | null, company?: string }) {
    if (filters?.company) {
        return filters.company;
    }

    try {
      let query = supabasePROD
        .from('etiquetas_i')
        .select('organization');
  
      if (filters?.startDate || filters?.endDate) {
        if (filters.startDate) {
          const startOfDay = new Date(filters.startDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfDay.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      } else { // Default to today
        const now = new Date();
        const startOfDayMexicoInUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0, 0));
        
        let gte, lt;
  
        if (now.getTime() < startOfDayMexicoInUTC.getTime()) {
          lt = startOfDayMexicoInUTC.toISOString();
          const gteDate = new Date(startOfDayMexicoInUTC);
          gteDate.setUTCDate(gteDate.getUTCDate() - 1);
          gte = gteDate.toISOString();
        } else {
          gte = startOfDayMexicoInUTC.toISOString();
          const ltDate = new Date(startOfDayMexicoInUTC);
          ltDate.setUTCDate(ltDate.getUTCDate() + 1);
          lt = ltDate.toISOString();
        }
        
        query = query.gte('created_at', gte).lt('created_at', lt);
      }
  
      const { data, error } = await query;
  
      if (error) {
        console.error("Error fetching organizations:", error.message);
        return "N/A";
      }
  
      if (!data || data.length === 0) {
        return "N/A";
      }
  
      const counts: { [key: string]: number } = data.reduce((acc: { [key: string]: number }, { organization }) => {
        if (organization) {
          acc[organization] = (acc[organization] || 0) + 1;
        }
        return acc;
      }, {});
  
      if (Object.keys(counts).length === 0) {
        return "N/A";
      }
  
      const leadingCompany = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      
      return leadingCompany;
    } catch (error) {
      if (error instanceof Error) {
          console.error("Error in getLeadingCompany:", error.message);
      } else {
          console.error("An unknown error occurred in getLeadingCompany:", error);
      }
      return "N/A";
    }
}

async function getMonthlyEtiquetasCount(filters?: { startDate?: Date | null, endDate?: Date | null, company?: string }) {
    try {
      let query = supabasePROD
        .from("etiquetas_i")
        .select('*', { count: 'exact', head: true });

      if (filters?.company) {
        query = query.eq('organization', filters.company);
      }

      if (filters?.startDate || filters?.endDate) {
        if (filters.startDate) {
          const startOfDay = new Date(filters.startDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfDay.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      } else { 
        const now = new Date();
        const firstDayOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const lastDayOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        query = query.gte('created_at', firstDayOfMonthUTC.toISOString()).lte('created_at', lastDayOfMonthUTC.toISOString());
      }
      
      const { count, error } = await query;

      if (error) {
        console.error("Error fetching monthly etiquetas count:", error.message);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      if (error instanceof Error) {
          console.error("Error in getMonthlyEtiquetasCount:", error.message);
      } else {
          console.error("An unknown error occurred in getMonthlyEtiquetasCount:", error);
      }
      return 0;
    }
}

async function getEtiquetasPorEmpresa(filters?: { startDate?: Date | null, endDate?: Date | null }) {
    try {
      let query = supabasePROD
        .from('etiquetas_i')
        .select('organization');
  
      if (filters?.startDate || filters?.endDate) {
        if (filters.startDate) {
          const startOfDay = new Date(filters.startDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfDay.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      } else { // Default to today
        const now = new Date();
        const startOfDayMexicoInUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0, 0));
        
        let gte, lt;
  
        if (now.getTime() < startOfDayMexicoInUTC.getTime()) {
          lt = startOfDayMexicoInUTC.toISOString();
          const gteDate = new Date(startOfDayMexicoInUTC);
          gteDate.setUTCDate(gteDate.getUTCDate() - 1);
          gte = gteDate.toISOString();
        } else {
          gte = startOfDayMexicoInUTC.toISOString();
          const ltDate = new Date(startOfDayMexicoInUTC);
          ltDate.setUTCDate(ltDate.getUTCDate() + 1);
          lt = ltDate.toISOString();
        }
        
        query = query.gte('created_at', gte).lt('created_at', lt);
      }
  
      const { data, error } = await query;
  
      if (error) {
        console.error("Error fetching organizations for chart:", error.message);
        return [];
      }
  
      if (!data || data.length === 0) {
        return [];
      }
  
      const counts: { [key: string]: number } = data.reduce((acc: { [key: string]: number }, { organization }) => {
        if (organization) {
          acc[organization] = (acc[organization] || 0) + 1;
        }
        return acc;
      }, {});
  
      if (Object.keys(counts).length === 0) {
        return [];
      }

      const colorMap: { [key: string]: string } = {
        'MTM': '#1B5E20',        // Verde Oscuro
        'HOGARDEN': '#90EE90',  // Verde Claro
        'DOMESKA': '#9370DB',   // Morado
        'TAL': '#4682B4',        // Azul
        'PALO DE ROSA': '#FFB6C1' // Rosa
      };
  
      const result = Object.entries(counts)
        .filter(([_, value]) => value > 0)
        .map(([label, value]) => {
          const upperLabel = label.toUpperCase();
          return ({
              id: upperLabel,
              value,
              label: upperLabel,
              color: colorMap[upperLabel] || '#cccccc'
          })
      });

      result.sort((a, b) => a.label.localeCompare(b.label));
      
      return result;
    } catch (error) {
      if (error instanceof Error) {
          console.error("Error in getEtiquetasPorEmpresa:", error.message);
      } else {
          console.error("An unknown error occurred in getEtiquetasPorEmpresa:", error);
      }
      return [];
    }
}

export default function DashboardPage() {
    const [startDate, setStartDate] = React.useState<Date | null>(null);
    const [endDate, setEndDate] = React.useState<Date | null>(null);
    const [company, setCompany] = React.useState<string | undefined>();
  
    const [etiquetasCount, setEtiquetasCount] = React.useState<number | string>('...');
    const [leadingCompany, setLeadingCompany] = React.useState<string>('...');
    const [monthlyEtiquetasCount, setMonthlyEtiquetasCount] = React.useState<number | string>('...');
    const chartDataRef = React.useRef<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [chartIsVisible, setChartIsVisible] = React.useState(true);
    
    const isFilterApplied = !!(startDate || endDate || company);
    const countCardTitle = isFilterApplied ? 'ETIQUETAS (FILTRADO)' : 'ETIQUETAS (HOY)';
    const monthlyCardTitle = 'ETIQUETAS (MES)';
    const leaderCardTitle = isFilterApplied ? 'LÍDER (FILTRADO)' : 'EMPRESA LÍDER';

    const fetchData = React.useCallback(async (filters: { startDate?: Date | null, endDate?: Date | null, company?: string }) => {
        setIsLoading(true);
        setEtiquetasCount('...');
        setLeadingCompany('...');
        setMonthlyEtiquetasCount('...');

        const companyFilter = filters.company 
            ? filters.company.replace(/-/g, ' ').toUpperCase() 
            : undefined;

        const { company: originalCompany, ...dateFilters } = filters;

        const effectiveCompanyFilter = companyFilter || (filters.company ? filters.company.toUpperCase() : undefined);

        const [count, leader, monthlyCount, etiquetasPorEmpresa] = await Promise.all([
          getEtiquetasCount({ ...filters, company: effectiveCompanyFilter }),
          getLeadingCompany({ ...filters, company: effectiveCompanyFilter }),
          getMonthlyEtiquetasCount({ ...filters, company: effectiveCompanyFilter }),
          getEtiquetasPorEmpresa(dateFilters),
        ]);
    
        setEtiquetasCount(count);
        setLeadingCompany(leader);
        setMonthlyEtiquetasCount(monthlyCount);
        chartDataRef.current = etiquetasPorEmpresa;
        setIsLoading(false);
      }, []);

    React.useEffect(() => {
        fetchData({});
    }, [fetchData]);

    const handleFilter = async () => {
        setChartIsVisible(false);
        await fetchData({ startDate, endDate, company: company === 'all' ? undefined : company });
        setChartIsVisible(true);
    };

    const handleClear = async () => {
        setStartDate(null);
        setEndDate(null);
        setCompany(undefined);
        setChartIsVisible(false);
        await fetchData({});
        setChartIsVisible(true);
    };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          paintOrder: 'stroke',
          stroke: '#000000',
          strokeWidth: '2px',
          strokeLinecap: 'butt',
          strokeLinejoin: 'miter',
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-muted/50 min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-screen-xl mx-auto">
        <SiteHeader />

        <main>
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-6">
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Fecha de inicio</Label>
                  <DatePicker value={startDate} onChange={setStartDate} />
                </div>
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Fecha de Fin</Label>
                  <DatePicker value={endDate} onChange={setEndDate} />
                </div>
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label>Empresa</Label>
                  <CompanySelect value={company} onValueChange={setCompany} />
                </div>
                <div className="flex items-center gap-x-2">
                  <Button onClick={handleFilter} disabled={isLoading}>
                    <Search className="mr-2 h-4 w-4" />
                    {isLoading ? "Filtrando..." : "Filtrar"}
                  </Button>
                  <Button onClick={handleClear} disabled={isLoading} variant="ghost">
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8">
            {isFilterApplied && (
              <p className="text-center font-semibold text-gray-600 mb-4">
                Se está aplicando un filtro
              </p>
            )}
            {isFilterApplied ? (
              <div className="grid grid-cols-2 gap-6 px-4 sm:px-0">
                <DashboardCard
                  className="col-span-2"
                  title="ETIQUETAS"
                  value={etiquetasCount}
                />
                <DashboardCard title={leaderCardTitle} value={leadingCompany} />
                <DashboardCard
                  title="PRODUCTO ESTRELLA"
                  isFilled={false}
                  href="/producto-estrella"
                  icon={<Star className="h-8 w-8 text-primary" fill="currentColor" />}
                />
                <div className="col-span-2 flex justify-center">
                  <div className="w-1/2">
                    <DashboardCard
                      title="ANALISIS POR SKU"
                      isFilled={false}
                      href="/analisis-sku"
                      icon={<Barcode className="h-8 w-8 text-primary" />}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {typeof etiquetasCount === 'number' && etiquetasCount > 0 && etiquetasCount === monthlyEtiquetasCount ? (
                  <DashboardCard
                    className="col-span-2 md:col-span-1 lg:col-span-2"
                    title="ETIQUETAS"
                    value={etiquetasCount}
                  />
                ) : (
                  <>
                    <DashboardCard
                      className="col-span-2 md:col-span-1"
                      title={monthlyCardTitle}
                      value={monthlyEtiquetasCount}
                    />
                    <DashboardCard
                      title={countCardTitle}
                      value={etiquetasCount}
                    />
                  </>
                )}
                <DashboardCard title={leaderCardTitle} value={leadingCompany}/>
                <DashboardCard 
                  title="PRODUCTO ESTRELLA" 
                  isFilled={false} 
                  href="/producto-estrella"
                  icon={<Star className="h-8 w-8 text-primary" fill="currentColor" />}
                />
                <DashboardCard
                  title="ANALISIS POR SKU"
                  isFilled={false}
                  href="/analisis-sku"
                  icon={<Barcode className="h-8 w-8 text-primary" />}
                />
              </div>
            )}
          </div>


          <Separator className="my-8 w-[70%] mx-auto" />

          <div className="mt-8 flex justify-center items-center" style={{ minHeight: '500px', width: '100%' }}>
            {isLoading ? (
              <p className="text-gray-500 font-semibold">Cargando...</p>
            ) : chartIsVisible ? (
              chartDataRef.current.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={chartDataRef.current}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={250}
                      fill="#8884d8"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {chartDataRef.current.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 font-semibold">No hay datos para mostrar.</p>
              )
            ) : (
                <Button onClick={() => setChartIsVisible(true)} className="bg-[#63A491] hover:bg-[#579282] text-white font-bold rounded-full text-base px-8 h-10 shadow-md">
                    Mostrar Gráfico
                </Button>
            )}
          </div>
          <Separator className="my-8 w-[70%] mx-auto" />
          <div className="mt-8">
            <ClientOnly>
              <UsersTable />
            </ClientOnly>
          </div>
        </main>
      </div>
    </div>
  );
}
