import { SiteHeader } from "@/components/site-header";
import { DatePicker } from "@/components/date-picker";
import { CompanySelect } from "@/components/company-select";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard-card";
import { supabasePROD } from "@/lib/supabase";

async function getTodaysEtiquetasCount() {
  try {
    const now = new Date();
    // Midnight in Mexico City (UTC-6) is 06:00:00 UTC.
    // We create a date object for the start of the current UTC day at 06:00.
    const startOfDayMexicoInUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0, 0));
    
    let gte, lt;

    if (now.getTime() < startOfDayMexicoInUTC.getTime()) {
      // If the current time is before 6 AM UTC, "today" in Mexico is the previous UTC day's range.
      lt = startOfDayMexicoInUTC.toISOString();
      const gteDate = new Date(startOfDayMexicoInUTC);
      gteDate.setUTCDate(gteDate.getUTCDate() - 1);
      gte = gteDate.toISOString();
    } else {
      // If the current time is after 6 AM UTC, "today" in Mexico is the current UTC day's range.
      gte = startOfDayMexicoInUTC.toISOString();
      const ltDate = new Date(startOfDayMexicoInUTC);
      ltDate.setUTCDate(ltDate.getUTCDate() + 1);
      lt = ltDate.toISOString();
    }
    
    const { count, error } = await supabasePROD
      .from("etiquetas_i")
      .select('*', { count: 'exact', head: true })
      .gte('created_at', gte)
      .lt('created_at', lt);

    if (error) {
      console.error("Error fetching today's etiquetas count:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    if (error instanceof Error) {
        console.error("Error in getTodaysEtiquetasCount:", error.message);
    } else {
        console.error("An unknown error occurred in getTodaysEtiquetasCount:", error);
    }
    return 0;
  }
}

async function getLeadingCompany() {
  try {
    const { data, error } = await supabasePROD
      .from('etiquetas_i')
      .select('organization');

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

export default async function DashboardPage() {
  const [todaysEtiquetasCount, leadingCompany] = await Promise.all([
    getTodaysEtiquetasCount(),
    getLeadingCompany()
  ]);

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
                  <DatePicker />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-primary-foreground text-sm font-medium px-2">Fecha de Fin</label>
                  <DatePicker />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-primary-foreground text-sm font-medium px-2">Empresa</label>
                  <CompanySelect />
                </div>
              </div>
            </div>

            <div className="flex items-center flex-shrink-0 gap-x-4">
              <Button
                className="bg-[#63A491] hover:bg-[#579282] text-white font-bold rounded-full text-base px-8 h-10 shadow-md"
              >
                Filtrar
              </Button>
              <Button
                className="bg-[#BABE65] hover:bg-[#A9AD5A] text-white font-bold rounded-full text-base px-8 h-10 shadow-md"
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-8">
            <DashboardCard title="ETIQUETAS DEL MES" value="1,234" />
            <DashboardCard title="ETIQUETAS (HOY)" value={todaysEtiquetasCount} />
            <DashboardCard title="EMPRESA LIDER" value={leadingCompany}/>
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
