import React, { Suspense } from 'react';
import MercadoLibreClient from './mercadolibre-client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

function MercadoLibrePageSkeleton() {
    return (
        <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <header>
                    <Link
                        href="/"
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Dashboard
                    </Link>
                    <div>
                        <Skeleton className="h-10 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </header>
                <main>
                    <Card className="max-w-md mx-auto">
                        <CardHeader className="text-center">
                            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
                            <Skeleton className="h-4 w-full mx-auto" />
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center p-6">
                             <Skeleton className="h-16 w-16 rounded-full mb-4" />
                             <Skeleton className="h-10 w-full" />
                        </CardContent>
                         <CardFooter className="flex-col items-start text-xs text-muted-foreground p-4 border-t">
                            <Skeleton className="h-4 w-1/3 mb-2" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                </main>
            </div>
        </div>
    );
}

export default function MercadoLibrePage() {
  return (
    <Suspense fallback={<MercadoLibrePageSkeleton />}>
      <MercadoLibreClient />
    </Suspense>
  );
}
