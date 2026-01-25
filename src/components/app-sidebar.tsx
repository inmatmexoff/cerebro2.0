'use client';

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
  SidebarInput,
} from '@/components/ui/sidebar';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
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
  Search,
  MoreHorizontal,
  Workflow,
  KeyRound,
  BarChartBig,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function AppLogo() {
    const { state } = useSidebar();
    return (
        <div className="flex items-center gap-3">
            <div className="bg-foreground text-background size-8 flex items-center justify-center rounded-lg">
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
        </div>
    )
}

export function AppSidebar() {
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="group/sidebar">
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
       <div className="relative p-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <SidebarInput placeholder="Search" className="pl-8" />
      </div>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Dashboard" isActive>
              <LayoutGrid />
              <span>Dashboard</span>
            </SidebarMenuButton>
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
