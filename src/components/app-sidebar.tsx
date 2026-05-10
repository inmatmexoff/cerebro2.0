'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutGrid,
  Settings,
  Star,
  Barcode,
  Receipt,
  ChevronRight,
  PanelLeft,
  Cable,
  ArchiveRestore,
  History,
  FolderTree,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSidebar } from '@/context/sidebar-provider';
import { Button } from './ui/button';

function AppLogo() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  return (
    <div
      onClick={toggleSidebar}
      className={cn(
        'flex h-16 items-center gap-3 w-full text-left px-4 border-b cursor-pointer transition-all duration-300',
        isCollapsed && 'justify-center px-0'
      )}
    >
      <div className="bg-primary text-primary-foreground size-10 flex items-center justify-center rounded-xl shadow-md shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      </div>
      <div className={cn('whitespace-nowrap transition-all duration-300', isCollapsed ? 'opacity-0 w-0' : 'opacity-100')}>
        <h2 className="font-bold text-xl tracking-tight text-primary">Inmatmex</h2>
      </div>
    </div>
  );
}


export function AppSidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  
  const [corteDeCajaOpen, setCorteDeCajaOpen] = React.useState(
    pathname.startsWith('/corte-de-caja')
  );
  const [configuracionOpen, setConfiguracionOpen] = React.useState(
    pathname.startsWith('/configuracion')
  );
  const [devolucionesOpen, setDevolucionesOpen] = React.useState(
    pathname.startsWith('/devoluciones')
  );

  React.useEffect(() => {
    if (isCollapsed) {
        setCorteDeCajaOpen(false);
        setConfiguracionOpen(false);
        setDevolucionesOpen(false);
    }
  }, [isCollapsed]);

  return (
    <aside className={cn(
      "hidden md:flex flex-col fixed inset-y-0 z-10 border-r bg-background transition-[width] duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <AppLogo />
      <nav className="flex-1 p-3 space-y-2">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group',
            pathname === '/' && 'bg-primary/10 text-primary shadow-sm',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <LayoutGrid className={cn("h-5 w-5 shrink-0", pathname === '/' ? "text-primary" : "group-hover:text-primary")} />
          <span className={cn(isCollapsed && 'hidden')}>Dashboard</span>
        </Link>
        <Link
          href="/producto-estrella"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group',
            pathname === '/producto-estrella' && 'bg-primary/10 text-primary shadow-sm',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <Star className={cn("h-5 w-5 shrink-0", pathname === '/producto-estrella' ? "text-primary" : "group-hover:text-primary")} />
          <span className={cn(isCollapsed && 'hidden')}>Producto Estrella</span>
        </Link>
        <Link
          href="/analisis-sku"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group',
            pathname === '/analisis-sku' && 'bg-primary/10 text-primary shadow-sm',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <Barcode className={cn("h-5 w-5 shrink-0", pathname === '/analisis-sku' ? "text-primary" : "group-hover:text-primary")} />
           <span className={cn(isCollapsed && 'hidden')}>Análisis por SKU</span>
        </Link>
        
        <div className="h-px bg-border/60 my-2 mx-2" />

        <Collapsible open={devolucionesOpen} onOpenChange={setDevolucionesOpen}>
            <CollapsibleTrigger disabled={isCollapsed} className='w-full'>
                <div className={cn(
                  "flex items-center w-full rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group", 
                  pathname.startsWith('/devoluciones') && 'text-primary bg-primary/5', 
                  isCollapsed ? 'justify-center px-0' : 'justify-between'
                )}>
                    <div className="flex items-center gap-3">
                       <ArchiveRestore className={cn("h-5 w-5 shrink-0", pathname.startsWith('/devoluciones') ? "text-primary" : "group-hover:text-primary")} />
                       <span className={cn(isCollapsed && 'hidden')}>Devoluciones</span>
                    </div>
                   <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', (isCollapsed || !devolucionesOpen) ? '' : 'rotate-90', isCollapsed && 'hidden')} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-11 mt-1 space-y-1">
                 <Link href="/devoluciones" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/devoluciones' && "text-primary font-semibold")}>Listado</Link>
                 <Link href="/devoluciones/calendario" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/devoluciones/calendario' && "text-primary font-semibold")}>Calendario</Link>
                 <Link href="/devoluciones/historial" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/devoluciones/historial' && "text-primary font-semibold")}>Historial ML</Link>
                 <Link href="/devoluciones/nueva" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/devoluciones/nueva' && "text-primary font-semibold")}>Estado de Devolución</Link>
                 <Link href="/devoluciones/import-excel" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/devoluciones/import-excel' && "text-primary font-semibold")}>Importar Excel</Link>
            </CollapsibleContent>
        </Collapsible>

        <Link
          href="/mercadolibre"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group',
            pathname === '/mercadolibre' && 'bg-primary/10 text-primary shadow-sm',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <Cable className={cn("h-5 w-5 shrink-0", pathname === '/mercadolibre' ? "text-primary" : "group-hover:text-primary")} />
          <span className={cn(isCollapsed && 'hidden')}>Mercado Libre</span>
        </Link>
        
        <Collapsible open={corteDeCajaOpen} onOpenChange={setCorteDeCajaOpen}>
            <CollapsibleTrigger disabled={isCollapsed} className='w-full'>
                <div className={cn(
                  "flex items-center w-full rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group", 
                  pathname.startsWith('/corte-de-caja') && 'text-primary bg-primary/5', 
                  isCollapsed ? 'justify-center px-0' : 'justify-between'
                )}>
                    <div className="flex items-center gap-3">
                       <Receipt className={cn("h-5 w-5 shrink-0", pathname.startsWith('/corte-de-caja') ? "text-primary" : "group-hover:text-primary")} />
                       <span className={cn(isCollapsed && 'hidden')}>Corte de Caja</span>
                    </div>
                   <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', (isCollapsed || !corteDeCajaOpen) ? '' : 'rotate-90', isCollapsed && 'hidden')} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-11 mt-1 space-y-1">
                 <Link href="/corte-de-caja" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/corte-de-caja' && "text-primary font-semibold")}>Resumen</Link>
                 <Link href="/corte-de-caja/nuevo-corte" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/corte-de-caja/nuevo-corte' && "text-primary font-semibold")}>Nuevo Corte</Link>
                 <Link href="/corte-de-caja/historial" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/corte-de-caja/historial' && "text-primary font-semibold")}>Historial</Link>
                 <Link href="/corte-de-caja/excel-ventas" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/corte-de-caja/excel-ventas' && "text-primary font-semibold")}>Excel de Ventas</Link>
            </CollapsibleContent>
        </Collapsible>
        
        <div className="h-px bg-border/60 my-2 mx-2" />

        <Collapsible open={configuracionOpen} onOpenChange={setConfiguracionOpen} className="w-full">
            <CollapsibleTrigger className='w-full' disabled={isCollapsed}>
                <div className={cn(
                  "flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-primary font-medium group", 
                  pathname.startsWith('/configuracion') && 'text-primary bg-primary/5', 
                  isCollapsed ? 'justify-center px-0' : 'justify-between'
                )}>
                   <div className="flex items-center gap-3">
                      <Settings className={cn("h-5 w-5 shrink-0", pathname.startsWith('/configuracion') ? "text-primary" : "group-hover:text-primary")}/>
                       <span className={cn(isCollapsed && 'hidden')}>Configuración</span>
                   </div>
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', (isCollapsed || !configuracionOpen) ? '' : 'rotate-90', isCollapsed && 'hidden')} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-11 mt-1 space-y-1">
                <Link href="/configuracion/categorias" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/categorias' && "text-primary font-semibold")}>Categorías</Link>
                <Link href="/configuracion/proveedores" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/proveedores' && "text-primary font-semibold")}>Proveedores</Link>
                <Link href="/configuracion/carga-sku" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/carga-sku' && "text-primary font-semibold")}>Carga de SKUs</Link>
                <Link href="/configuracion/actualizar-sku" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/actualizar-sku' && "text-primary font-semibold")}>Actualizar SKU</Link>
                <Link href="/configuracion/repositorio" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/repositorio' && "text-primary font-semibold")}>Repositorio</Link>
                <Link href="/configuracion/historial-costos" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/historial-costos' && "text-primary font-semibold")}>Historial de Costos</Link>
                <Link href="/configuracion/directorio-skus" className={cn("block text-sm text-muted-foreground hover:text-primary py-1.5 transition-colors", pathname === '/configuracion/directorio-skus' && "text-primary font-semibold")}>Directorio de SKUs</Link>
            </CollapsibleContent>
         </Collapsible>
      </nav>
      <div className="mt-auto p-4 border-t bg-muted/20">
        <Button variant="ghost" className="w-full h-12 rounded-xl hover:bg-muted" onClick={toggleSidebar}>
            <PanelLeft className={cn("h-6 w-6 shrink-0 transition-transform duration-300 text-muted-foreground group-hover:text-primary", isCollapsed && "rotate-180")} />
        </Button>
      </div>
    </aside>
  );
}
