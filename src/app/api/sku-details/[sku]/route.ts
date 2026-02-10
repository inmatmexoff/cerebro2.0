import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: { sku: string } }) {
    const { sku } = params;

    if (!sku) {
        return NextResponse.json({ message: 'SKU es requerido.' }, { status: 400 });
    }

    try {
        // 1. Get sku_mdr from sku_alterno
        const { data: alternoData, error: alternoError } = await supabasePROD
            .from('sku_alterno')
            .select('sku_mdr')
            .eq('sku', sku)
            .single();

        if (alternoError || !alternoData) {
            // It's a valid case if the SKU exists but has no alterno yet, let's not throw.
            // Let's create a response with nulls.
            if (alternoError && alternoError.code !== 'PGRST116') {
                 throw new Error(`Error buscando SKU alterno para ${sku}: ${alternoError.message}`);
            }
        }
        
        const sku_mdr = alternoData?.sku_mdr;
        let mData = null;
        let costosData = null;

        if (sku_mdr) {
            // 2. Get details from sku_m using sku_mdr
            const { data: mResult, error: mError } = await supabasePROD
                .from('sku_m')
                .select('cat_mdr, esti_time, piezas_por_sku')
                .eq('sku_mdr', sku_mdr)
                .single();
            
            if (mError && mError.code !== 'PGRST116') {
                 throw new Error(`Error buscando detalles en sku_m para ${sku_mdr}: ${mError.message}`);
            }
            mData = mResult;

            // 3. Get latest cost details from sku_costos using sku_mdr
            // NOTE: This fetches the most recently created cost record based on the auto-incrementing `id`.
            // If the table doesn't have a reliable auto-incrementing ID or a timestamp, "latest" is not guaranteed.
            const { data: costosResult, error: costosError } = await supabasePROD
                .from('sku_costos')
                .select('landed_cost, proveedor, piezas_xcontenedor')
                .eq('sku_mdr', sku_mdr)
                .order('id', { ascending: false })
                .limit(1);

            if (costosError) {
                 throw new Error(`Error buscando costos para ${sku_mdr}: ${costosError.message}`);
            }
            costosData = costosResult?.[0];
        }


        const responseData = {
            sku,
            sku_mdr: sku_mdr || null,
            cat_mdr: mData?.cat_mdr || null,
            esti_time: mData?.esti_time || null,
            piezas_por_sku: mData?.piezas_por_sku || null,
            landed_cost: costosData?.landed_cost || null,
            proveedor: costosData?.proveedor || null,
            piezas_xcontenedor: costosData?.piezas_xcontenedor || null,
        };

        return NextResponse.json(responseData);

    } catch (e: any) {
        console.error('API Error fetching SKU details:', e.message);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
