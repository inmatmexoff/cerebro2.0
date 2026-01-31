'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutGrid,
  Settings,
  Star,
  Barcode,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function AppLogo() {
    const { toggleSidebar } = useSidebar();
    return (
        <button onClick={toggleSidebar} className="flex items-center gap-3 w-full text-left">
            <div className="bg-foreground text-background size-8 flex items-center justify-center rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                   <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
            </div>
            <div className={cn("duration-200", "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden")}>
                <h2 className="font-bold text-lg">Inmatmex</h2>
                <div className="text-xs text-sidebar-foreground/70 flex items-center">
                    21 members
                </div>
            </div>
        </button>
    )
}

export function AppSidebar() {
  const pathname = usePathname();
  const [corteDeCajaOpen, setCorteDeCajaOpen] = useState(false);
  const [configuracionOpen, setConfiguracionOpen] = useState(false);

  useEffect(() => {
    const isConfig = pathname.startsWith('/configuracion');
    setCorteDeCajaOpen(pathname.startsWith('/corte-de-caja') || isConfig);
    setConfiguracionOpen(isConfig);
  }, [pathname]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/'}>
              <Link href="/">
                <LayoutGrid />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Producto Estrella" isActive={pathname === '/producto-estrella'}>
              <Link href="/producto-estrella">
                <Star />
                <span>Producto Estrella</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Análisis por SKU" isActive={pathname === '/analisis-sku'}>
              <Link href="/analisis-sku">
                <Barcode />
                <span>Análisis por SKU</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <Collapsible open={corteDeCajaOpen} onOpenChange={setCorteDeCajaOpen} className="w-full">
              <CollapsibleTrigger asChild>
                <div
                  data-active={pathname.startsWith('/corte-de-caja') || pathname.startsWith('/configuracion')}
                  className={cn(
                    "flex h-8 items-center w-full justify-between gap-2 rounded-md p-2 text-left text-sm text-sidebar-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 cursor-pointer",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium",
                    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Receipt />
                    <span className="group-data-[collapsible=icon]:hidden">Corte de Caja</span>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden", corteDeCajaOpen && "rotate-90")} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/corte-de-caja'}>
                      <Link href="/corte-de-caja">Resumen</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/corte-de-caja/nuevo-corte'}>
                      <Link href="/corte-de-caja/nuevo-corte">Nuevo Corte</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/corte-de-caja/historial'}>
                      <Link href="/corte-de-caja/historial">Historial</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/corte-de-caja/publicaciones'}>
                      <Link href="/corte-de-caja/publicaciones">Publicaciones</Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  
                  <SidebarMenuSubItem>
                    <Collapsible open={configuracionOpen} onOpenChange={setConfiguracionOpen} className="w-full">
                      <CollapsibleTrigger asChild>
                        <div
                          data-sidebar="menu-sub-button"
                          data-active={pathname.startsWith('/configuracion')}
                           className={cn(
                            "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
                            "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                            "text-sm",
                            "group-data-[collapsible=icon]:hidden",
                            "w-full justify-between cursor-pointer"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Settings />
                            <span>Configuración</span>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 transition-transform", configuracionOpen && "rotate-90")} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                           <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname === '/configuracion/categorias'}>
                              <Link href="/configuracion/categorias">Categorías</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={pathname === '/configuracion/proveedores'}>
                              <Link href="/configuracion/proveedores">Proveedores</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
