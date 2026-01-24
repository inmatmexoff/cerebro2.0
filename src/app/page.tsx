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
            <div
              className="rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center"
              style={{ borderColor: "#137547", height: 215 }}
            >
              <h3 className="text-xl font-semibold text-gray-700">ETIQUETAS DEL MES</h3>
              <p className="text-5xl font-bold text-primary mt-2">1,234</p>
            </div>
            <div
              className="rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center"
              style={{ borderColor: "#137547", height: 215 }}
            >
              <h3 className="text-xl font-semibold text-gray-700">ETIQUETAS (HOY)</h3>
              <p className="text-5xl font-bold text-primary mt-2">56</p>
            </div>
            <div
              className="rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center"
              style={{ borderColor: "#137547", height: 215 }}
            >
               <h3 className="text-2xl font-bold text-primary">EMPRESA LIDER</h3>
            </div>
            <div
              className="rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center text-white"
              style={{ borderColor: "#137547", backgroundColor: "#137547", height: 215 }}
            >
              <h3 className="text-2xl font-bold">PRÓXIMAMENTE</h3>
            </div>
            <div
              className="rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center text-white"
              style={{ borderColor: "#137547", backgroundColor: "#137547", height: 215 }}
            >
              <h3 className="text-2xl font-bold">PRÓXIMAMENTE</h3>
            </div>
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
