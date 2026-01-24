import { SiteHeader } from "@/components/site-header";
import { DatePicker } from "@/components/date-picker";
import { CompanySelect } from "@/components/company-select";

export default function DashboardPage() {
  return (
    <div className="bg-background min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-screen-xl mx-auto">
        <SiteHeader />

        <main>
          <div className="flex items-stretch gap-4">
            <div className="bg-primary rounded-2xl p-4 flex items-center justify-center text-primary-foreground font-bold text-center shadow-lg w-[200px]">
              <span className="leading-tight text-lg">
                Filtros
                <br />
                de busqueda
              </span>
            </div>

            <div className="bg-primary rounded-2xl p-4 flex-grow flex items-center shadow-lg">
              <div className="grid grid-cols-3 gap-x-6 w-full items-end">
                <div className="space-y-2">
                  <label className="text-primary-foreground text-sm font-medium px-2">Fecha de inicio</label>
                  <DatePicker />
                </div>
                <div className="space-y-2">
                  <label className="text-primary-foreground text-sm font-medium px-2">Fecha de Fin</label>
                  <DatePicker />
                </div>
                <div className="space-y-2">
                  <label className="text-primary-foreground text-sm font-medium px-2">Empresa</label>
                  <CompanySelect />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div
              className="rounded-2xl shadow-lg border"
              style={{ borderColor: "#137547", height: 215 }}
            ></div>
            <div
              className="rounded-2xl shadow-lg border"
              style={{ borderColor: "#137547", height: 215 }}
            ></div>
            <div
              className="rounded-2xl shadow-lg border"
              style={{ borderColor: "#137547", height: 215 }}
            ></div>
            <div
              className="rounded-2xl shadow-lg border"
              style={{ borderColor: "#137547", height: 215 }}
            ></div>
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
