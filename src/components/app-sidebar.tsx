'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutGrid,
  MessageSquare,
  CheckSquare,
  StickyNote,
  Mail,
  Flag,
  Settings,
  Star,
  Building,
  Users,
  MoreHorizontal,
  Workflow,
  KeyRound,
  BarChartBig,
  Barcode,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function AppLogo() {
    const { state, toggleSidebar } = useSidebar();
    return (
        <button onClick={toggleSidebar} className="flex items-center gap-3 w-full text-left">
            <div className="bg-foreground text-background size-8 flex items-center justify-center rounded-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                   <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
            </div>
            <div className={cn("duration-200", state === 'collapsed' && 'opacity-0 hidden')}>
                <h2 className="font-bold text-lg">Inmatmex</h2>
                <div className="text-xs text-sidebar-foreground/70 flex items-center">
                    21 members
                </div>
            </div>
        </button>
    )
}

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const [corteDeCajaOpen, setCorteDeCajaOpen] = useState(false);

  useEffect(() => {
    setCorteDeCajaOpen(pathname.startsWith('/corte-de-caja'));
  }, [pathname]);

  return (
    <Sidebar collapsible="icon" className="group/sidebar">
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
              <CollapsibleTrigger className="w-full">
                <SidebarMenuButton tooltip="Corte de Caja" className="w-full justify-between" isActive={pathname.startsWith('/corte-de-caja')}>
                  <div className="flex items-center gap-2">
                    <Receipt />
                    <span>Corte de Caja</span>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", corteDeCajaOpen && "rotate-90")} />
                </SidebarMenuButton>
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
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Messages">
              <MessageSquare />
              <span>Messages</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Tasks">
              <CheckSquare />
              <span>Tasks</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Notes">
              <StickyNote />
              <span>Notes</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Emails">
              <Mail />
              <span>Emails</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Reports">
              <Flag />
              <span>Reports</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Automations">
              <Settings />
              <span>Automations</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Workflows">
                <Workflow />
                <span>Workflows</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel>Favorites</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Key Accounts">
                    <KeyRound />
                    <span>Key Accounts</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Strategic Initiatives">
                    <BarChartBig />
                    <span>Strategic Initiatives</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton tooltip="Focus Areas">
                    <Star />
                    <span>Focus Areas</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Starred Items">
                    <Star />
                    <span>Starred Items</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Records</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Companies">
                    <Building />
                    <span>Companies</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="People">
                    <Users />
                    <span>People</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3">
            <Avatar className="size-8">
                <AvatarImage src="https://picsum.photos/seed/liam/40/40" data-ai-hint="man face" />
                <AvatarFallback>LS</AvatarFallback>
            </Avatar>
            <div className={cn("duration-200", state === 'collapsed' && 'opacity-0 hidden')}>
                <p className="font-semibold text-sm">Liam Smith</p>
                <p className="text-xs text-sidebar-foreground/70">smith@example.com</p>
            </div>
            <MoreHorizontal className={cn("ml-auto duration-200", state === 'collapsed' && 'opacity-0 hidden')} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
