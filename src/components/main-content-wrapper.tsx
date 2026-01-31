'use client';

import { useSidebar } from '@/context/sidebar-provider';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';

export function MainContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();
  return (
    <div
      className={cn(
        'flex flex-col transition-[padding] duration-300 ease-in-out',
        isCollapsed ? 'md:pl-20' : 'md:pl-64'
      )}
    >
      <MobileNav />
      <main className="flex-1 bg-muted/40">{children}</main>
    </div>
  );
}
