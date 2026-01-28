'use client';

import { SiteHeader } from "@/components/site-header";
import { DatePicker } from "@/components/date-picker";
import { CompanySelect } from "@/components/company-select";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard-card";
import { supabasePROD } from "@/lib/supabase";
import React, { useState, useEffect, useCallback } from "react";

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
          startOfDay.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfDay.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
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
        const companyMap: { [key: string]: string } = {
            "mtm": "MTM",
            "tal": "TAL",
            "domeska": "DOMESKA",
            "hogarden": "HOGARDEN",
            "palo-de-rosa": "PALO DE ROSA"
        };
        return companyMap[filters.company] || filters.company.toUpperCase();
    }

    try {
      let query = supabasePROD
        .from('etiquetas_i')
        .select('organization');
  
      if (filters?.startDate || filters?.endDate) {
        if (filters.startDate) {
          const startOfDay = new Date(filters.startDate);
          startOfDay.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfDay.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
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

export default function DashboardPage() {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [company, setCompany] = useState<string | undefined>();
  
    const [etiquetasCount, setEtiquetasCount] = useState<number | string>('...');
    const [leadingCompany, setLeadingCompany] = useState<string>('...');
    const [monthlyEtiquetasCount, setMonthlyEtiquetasCount] = useState<string>("1,234");
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async (filters: { startDate?: Date | null, endDate?: Date | null, company?: string }) => {
        setIsLoading(true);
        setEtiquetasCount('...');
        setLeadingCompany('...');

        const companyFilter = filters.company ? (filters.company.toUpperCase()) : undefined;

        const [count, leader] = await Promise.all([
          getEtiquetasCount({ ...filters, company: companyFilter }),
          getLeadingCompany({ ...filters, company: companyFilter }),
        ]);
    
        setEtiquetasCount(count);
        setLeadingCompany(leader);
        setIsLoading(false);
      }, []);

    useEffect(() => {
        fetchData({});
    }, [fetchData]);

    const handleFilter = () => {
        fetchData({ startDate, endDate, company });
    };

    const handleClear = () => {
        setStartDate(null);
        setEndDate(null);
        setCompany(undefined);
        fetchData({});
    };

    const countCardTitle = (startDate || endDate || company) ? "ETIQUETAS" : "ETIQUETAS (HOY)";
    const leaderCardTitle = company ? "EMPRESA" : "EMPRESA LIDER";

  return (
    <div className="bg-white min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-screen-xl mx-auto">
        <SiteHeader />

        <main>
          <div className="flex items-stretch gap-4">
            <div className="bg-primary text-primary-foreground font-bold text-xl rounded-2xl px-6 flex items-center justify-center shadow-lg text-center">
                <span>Filtros<br/>de búsqueda</span>
            </div>
            
            <div className="bg-primary rounded-2xl p-4 flex-grow flex items-center shadow-lg">
              <div className="flex items-center gap-x-6 w-full">
                <div className="space-y-2 flex-1">
                  <label className="text-primary-foreground text-sm font-medium px-2">Fecha de inicio</label>
                  <DatePicker value={startDate} onChange={setStartDate} />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-primary-foreground text-sm font-medium px-2">Fecha de Fin</label>
                  <DatePicker value={endDate} onChange={setEndDate} />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-primary-foreground text-sm font-medium px-2">Empresa</label>
                  <CompanySelect value={company} onValueChange={setCompany} />
                </div>
              </div>
            </div>

            <div className="flex items-center flex-shrink-0 gap-x-4">
              <Button
                onClick={handleFilter}
                disabled={isLoading}
                className="bg-[#63A491] hover:bg-[#579282] text-white font-bold rounded-full text-base px-8 h-10 shadow-md"
              >
                {isLoading ? "Filtrando..." : "Filtrar"}
              </Button>
              <Button
                onClick={handleClear}
                disabled={isLoading}
                className="bg-[#BABE65] hover:bg-[#A9AD5A] text-white font-bold rounded-full text-base px-8 h-10 shadow-md"
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-8">
            <DashboardCard title="ETIQUETAS DEL MES" value={monthlyEtiquetasCount} />
            <DashboardCard title={countCardTitle} value={etiquetasCount} />
            <DashboardCard title={leaderCardTitle} value={leadingCompany}/>
            <DashboardCard title="PRÓXIMAMENTE" isFilled={true} />
            <DashboardCard title="PRÓXIMAMENTE" isFilled={true} />
          </div>

          <div className="mt-8 flex justify-center">
            <hr
              className="w-[70%]"
              style={{ borderColor: "#DCE1DE" }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
