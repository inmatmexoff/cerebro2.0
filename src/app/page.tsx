import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { DatePicker } from "@/components/date-picker";
import { CompanySelect } from "@/components/company-select";

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-2 border-primary rounded-xl shadow-md">
      <CardContent className="text-center pt-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-5xl font-bold text-chart-2 mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

function UpcomingCard({ title }: { title: string }) {
  return (
    <Card className="bg-primary text-primary-foreground rounded-xl shadow-md">
      <CardContent className="flex items-center justify-center h-full pt-6 min-h-[140px]">
        <p className="font-semibold text-lg uppercase tracking-wider">{title}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="bg-background min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-screen-xl mx-auto">
        <SiteHeader />

        <main>
          <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
            <div className="bg-primary rounded-2xl p-2 flex-grow w-full flex flex-col sm:flex-row items-center gap-3 shadow-lg">
              <div className="bg-primary text-primary-foreground font-bold text-center text-base px-3 h-14 flex items-center justify-center rounded-lg shadow-md w-full sm:w-auto">
                <span className="leading-tight">
                  Filtros
                  <br />
                  de busqueda
                </span>
              </div>
              <DatePicker placeholder="Fecha de inicio" />
              <DatePicker placeholder="Fecha de Fin" />
              <CompanySelect />
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold px-8 h-12 rounded-full text-base shadow-md">
                Filtrar
              </Button>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-12 rounded-full text-base shadow-md">
                Limpiar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="Etiquetas del mes" value="14,000" />
            <StatCard title="Etiquetas (HOY)" value="340" />
            <StatCard title="Empresa Lider" value="MTM" />
            <UpcomingCard title="PROXIMAMENTE" />
            <UpcomingCard title="PROXIMAMENTE" />
          </div>
        </main>
      </div>
    </div>
  );
}
