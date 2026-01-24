import { SiteHeader } from "@/components/site-header";
import { DatePicker } from "@/components/date-picker";
import { CompanySelect } from "@/components/company-select";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="bg-white min-h-screen p-4 sm:p-6 md:p-8">
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
              <div className="flex items-end gap-x-6 w-full">
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
                <div className="flex flex-shrink-0 gap-x-4">
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
