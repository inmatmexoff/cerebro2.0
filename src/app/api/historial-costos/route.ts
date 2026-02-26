import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sku_mdr = searchParams.get('sku_mdr');

    try {
        let query = supabasePROD
            .from('sku_costos')
            .select('id, sku_mdr, landed_cost, proveedor, created_at')
            .order('created_at', { ascending: false });

        if (sku_mdr) {
            query = query.ilike('sku_mdr', `%${sku_mdr}%`);
        }

        const { data, error } = await query.limit(200); // Limit results for performance

        if (error) {
            throw new Error(`Error buscando el historial de costos: ${error.message}`);
        }

        return NextResponse.json(data);

    } catch (e: any) {
        console.error('API Error fetching cost history:', e.message);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
