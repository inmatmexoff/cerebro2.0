'use client';

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Menu,
  Receipt,
  Settings,
  Star,
  Barcode,
  ChevronRight,
  Cable,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import React from 'react';

function AppLogo() {
    return (
      <Link href="/" className="flex items-center gap-3">
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
        <h2 className="font-bold text-lg">Inmatmex</h2>
      </Link>
    );
}

function MobileNavMenu() {
    const pathname = usePathname();
    const [corteDeCajaOpen, setCorteDeCajaOpen] = React.useState(pathname.startsWith('/corte-de-caja') || pathname.startsWith('/configuracion'));
    const [configuracionOpen, setConfiguracionOpen] = React.useState(pathname.startsWith('/configuracion'));

    return (
      <nav className="flex flex-col gap-1 mt-6 text-lg font-medium">
        <SheetClose asChild>
          <Link href="/" className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/' && "bg-muted text-primary")}>
            <LayoutGrid className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link href="/producto-estrella" className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/producto-estrella' && "bg-muted text-primary")}>
            <Star className="w-5 h-5" />
            <span>Producto Estrella</span>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link href="/analisis-sku" className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/analisis-sku' && "bg-muted text-primary")}>
            <Barcode className="w-5 h-5" />
            <span>Análisis por SKU</span>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link href="/mercadolibre" className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/mercadolibre' && "bg-muted text-primary")}>
            <Cable className="w-5 h-5" />
            <span>Mercado Libre</span>
          </Link>
        </SheetClose>
        <Collapsible open={corteDeCajaOpen} onOpenChange={setCorteDeCajaOpen} className="w-full">
          <CollapsibleTrigger className='w-full'>
            <div className={cn("flex items-center justify-between w-full rounded-lg px-3 py-3", pathname.startsWith('/corte-de-caja') && 'text-primary')}>
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5" />
                <span>Corte de Caja</span>
              </div>
              <ChevronRight className={cn('h-5 w-5 shrink-0 transition-transform', corteDeCajaOpen && 'rotate-90')} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-8 mt-1 space-y-1 text-base">
            <SheetClose asChild><Link href="/corte-de-caja" className={cn("block rounded-md p-2", pathname === '/corte-de-caja' && "bg-muted text-primary")}>Resumen</Link></SheetClose>
            <SheetClose asChild><Link href="/corte-de-caja/nuevo-corte" className={cn("block rounded-md p-2", pathname === '/corte-de-caja/nuevo-corte' && "bg-muted text-primary")}>Nuevo Corte</Link></SheetClose>
            <SheetClose asChild><Link href="/corte-de-caja/historial" className={cn("block rounded-md p-2", pathname === '/corte-de-caja/historial' && "bg-muted text-primary")}>Historial</Link></SheetClose>
            <SheetClose asChild><Link href="/corte-de-caja/publicaciones" className={cn("block rounded-md p-2", pathname === '/corte-de-caja/publicaciones' && "bg-muted text-primary")}>Publicaciones</Link></SheetClose>
            <SheetClose asChild><Link href="/corte-de-caja/excel-ventas" className={cn("block rounded-md p-2", pathname === '/corte-de-caja/excel-ventas' && "bg-muted text-primary")}>Excel de Ventas</Link></SheetClose>

            <Collapsible open={configuracionOpen} onOpenChange={setConfiguracionOpen} className="w-full pt-1">
              <CollapsibleTrigger className='w-full'>
                <div className={cn("flex items-center justify-between w-full rounded-md p-2 text-base", pathname.startsWith('/configuracion') && 'text-primary')}>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5"/>
                    <span>Configuración</span>
                  </div>
                  <ChevronRight className={cn('h-5 w-5 shrink-0 transition-transform', configuracionOpen && 'rotate-90')} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 mt-1 space-y-1">
                <SheetClose asChild><Link href="/configuracion/categorias" className={cn("block rounded-md p-2", pathname === '/configuracion/categorias' && "bg-muted text-primary")}>Categorías</Link></SheetClose>
                <SheetClose asChild><Link href="/configuracion/proveedores" className={cn("block rounded-md p-2", pathname === '/configuracion/proveedores' && "bg-muted text-primary")}>Proveedores</Link></SheetClose>
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>
      </nav>
    )
}


export function MobileNav() {
  return (
    <header className="md:hidden flex items-center h-14 px-4 border-b bg-background sticky top-0 z-50">
      <div className='flex-1'>
        <AppLogo />
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-3/4 sm:w-1/2 p-4">
          <AppLogo />
          <MobileNavMenu />
        </SheetContent>
      </Sheet>
    </header>
  );
}
