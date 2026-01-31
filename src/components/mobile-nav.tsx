'use client';

import {
  Sheet,
  SheetContent,
  SheetTrigger,
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
      <Link href="/" className="flex items-center gap-3" onClick={() => (document.querySelector('[data-radix-collection-item]') as HTMLElement)?.click()}>
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
    
    const closeSheet = () => {
        const closeButton = document.querySelector('[data-radix-dialog-close]') as HTMLElement;
        closeButton?.click();
    }

    return (
        <nav className="flex flex-col gap-1 mt-6 text-lg font-medium">
             <Link href="/" onClick={closeSheet} className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/' && "bg-muted text-primary")}>
                <LayoutGrid className="w-5 h-5" />
                <span>Dashboard</span>
            </Link>
            <Link href="/producto-estrella" onClick={closeSheet} className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/producto-estrella' && "bg-muted text-primary")}>
                <Star className="w-5 h-5" />
                <span>Producto Estrella</span>
            </Link>
            <Link href="/analisis-sku" onClick={closeSheet} className={cn("flex items-center gap-3 rounded-lg px-3 py-3", pathname === '/analisis-sku' && "bg-muted text-primary")}>
                <Barcode className="w-5 h-5" />
                <span>Análisis por SKU</span>
            </Link>
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
                     <Link href="/corte-de-caja" onClick={closeSheet} className={cn("block rounded-md p-2", pathname === '/corte-de-caja' && "bg-muted text-primary")}>Resumen</Link>
                     <Link href="/corte-de-caja/nuevo-corte" onClick={closeSheet} className={cn("block rounded-md p-2", pathname === '/corte-de-caja/nuevo-corte' && "bg-muted text-primary")}>Nuevo Corte</Link>
                     <Link href="/corte-de-caja/historial" onClick={closeSheet} className={cn("block rounded-md p-2", pathname === '/corte-de-caja/historial' && "bg-muted text-primary")}>Historial</Link>
                     <Link href="/corte-de-caja/publicaciones" onClick={closeSheet} className={cn("block rounded-md p-2", pathname === '/corte-de-caja/publicaciones' && "bg-muted text-primary")}>Publicaciones</Link>

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
                            <Link href="/configuracion/categorias" onClick={closeSheet} className={cn("block rounded-md p-2", pathname === '/configuracion/categorias' && "bg-muted text-primary")}>Categorías</Link>
                            <Link href="/configuracion/proveedores" onClick={closeSheet} className={cn("block rounded-md p-2", pathname === '/configuracion/proveedores' && "bg-muted text-primary")}>Proveedores</Link>
                        </CollapsibleContent>
                     </Collapsible>
                </CollapsibleContent>
            </Collapsible>
        </nav>
    )
}

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  
  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-50">
      <AppLogo />
      <Sheet open={open} onOpenChange={setOpen}>
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
