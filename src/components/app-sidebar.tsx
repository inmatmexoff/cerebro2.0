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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function AppLogo() {
  return (
    <div
      className="flex items-center gap-3 w-full text-left p-4 border-b"
    >
      <div className="bg-foreground text-background size-8 flex items-center justify-center rounded-lg shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      </div>
      <div>
        <h2 className="font-bold text-lg">Inmatmex</h2>
        <div className="text-xs text-muted-foreground flex items-center">
          21 members
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [corteDeCajaOpen, setCorteDeCajaOpen] = React.useState(
    pathname.startsWith('/corte-de-caja') || pathname.startsWith('/configuracion')
  );
  const [configuracionOpen, setConfiguracionOpen] = React.useState(
    pathname.startsWith('/configuracion')
  );

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 border-r bg-background flex-col">
      <AppLogo />
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-medium',
            pathname === '/' && 'bg-muted text-primary'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/producto-estrella"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-medium',
            pathname === '/producto-estrella' && 'bg-muted text-primary'
          )}
        >
          <Star className="h-4 w-4" />
          Producto Estrella
        </Link>
        <Link
          href="/analisis-sku"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-medium',
            pathname === '/analisis-sku' && 'bg-muted text-primary'
          )}
        >
          <Barcode className="h-4 w-4" />
          Análisis por SKU
        </Link>
        
        <Collapsible open={corteDeCajaOpen} onOpenChange={setCorteDeCajaOpen} className="w-full">
            <CollapsibleTrigger className='w-full'>
                <div className={cn("flex items-center justify-between w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-medium", pathname.startsWith('/corte-de-caja') && 'text-primary')}>
                    <div className="flex items-center gap-3">
                       <Receipt className="h-4 w-4" />
                       <span>Corte de Caja</span>
                    </div>
                   <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', corteDeCajaOpen && 'rotate-90')} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-10 mt-1 space-y-1">
                 <Link href="/corte-de-caja" className={cn("block text-sm text-muted-foreground hover:text-primary py-1", pathname === '/corte-de-caja' && "text-primary")}>Resumen</Link>
                 <Link href="/corte-de-caja/nuevo-corte" className={cn("block text-sm text-muted-foreground hover:text-primary py-1", pathname === '/corte-de-caja/nuevo-corte' && "text-primary")}>Nuevo Corte</Link>
                 <Link href="/corte-de-caja/historial" className={cn("block text-sm text-muted-foreground hover:text-primary py-1", pathname === '/corte-de-caja/historial' && "text-primary")}>Historial</Link>
                 <Link href="/corte-de-caja/publicaciones" className={cn("block text-sm text-muted-foreground hover:text-primary py-1", pathname === '/corte-de-caja/publicaciones' && "text-primary")}>Publicaciones</Link>

                 <Collapsible open={configuracionOpen} onOpenChange={setConfiguracionOpen} className="w-full pt-1">
                    <CollapsibleTrigger className='w-full'>
                        <div className={cn("flex items-center justify-between w-full text-sm text-muted-foreground transition-all hover:text-primary", pathname.startsWith('/configuracion') && 'text-primary')}>
                           <div className="flex items-center gap-2">
                              <Settings className="w-4 h-4"/>
                               <span>Configuración</span>
                           </div>
                            <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', configuracionOpen && 'rotate-90')} />
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-6 mt-1 space-y-1">
                        <Link href="/configuracion/categorias" className={cn("block text-sm text-muted-foreground hover:text-primary py-1", pathname === '/configuracion/categorias' && "text-primary")}>Categorías</Link>
                        <Link href="/configuracion/proveedores" className={cn("block text-sm text-muted-foreground hover:text-primary py-1", pathname === '/configuracion/proveedores' && "text-primary")}>Proveedores</Link>
                    </CollapsibleContent>
                 </Collapsible>
            </CollapsibleContent>
        </Collapsible>
      </nav>
    </aside>
  );
}
