import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

const parseNumeric = (value: any, isInt: boolean = false): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const valueStr = String(value).trim();
    if (!valueStr) return null;

    const num = isInt ? parseInt(valueStr, 10) : parseFloat(valueStr);
    return isNaN(num) ? null : num;
};


export async function POST(request: Request) {
    const supabase = supabasePROD;

    try {
        const body = await request.json();
        const {
            sku,
            sku_mdr,
            cat_mdr,
            esti_time,
            piezas_por_sku,
            landed_cost,
            proveedor,
            piezas_xcontenedor
        } = body;
        
        if (!sku || !sku_mdr) {
            return NextResponse.json({ message: 'SKU y SKU MDR son requeridos.' }, { status: 400 });
        }

        const errors = [];

        // 1. Upsert sku_m
        const { error: skuMError } = await supabase.from('sku_m').upsert({
            sku_mdr,
            cat_mdr: cat_mdr || null,
            esti_time: parseNumeric(esti_time, true),
            piezas_por_sku: parseNumeric(piezas_por_sku, true),
        }, { onConflict: 'sku_mdr' });

        if (skuMError) errors.push(`Error en sku_m: ${skuMError.message}`);

        // 2. Upsert sku_alterno
        const { error: skuAlternoError } = await supabase.from('sku_alterno').upsert({
            sku,
            sku_mdr,
        }, { onConflict: 'sku' });

        if (skuAlternoError) errors.push(`Error en sku_alterno: ${skuAlternoError.message}`);

        // 3. Insert into sku_costos if landed_cost is provided.
        // This creates a new historical record for the cost.
        if (landed_cost !== null && landed_cost !== undefined) {
             const { error: skuCostosError } = await supabase.from('sku_costos').insert({
                sku_mdr,
                landed_cost: parseNumeric(landed_cost),
                proveedor: proveedor || null,
                piezas_xcontenedor: parseNumeric(piezas_xcontenedor, true),
            });
            if (skuCostosError) errors.push(`Error en sku_costos: ${skuCostosError.message}`);
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }

        return NextResponse.json({ message: `SKU ${sku} actualizado correctamente.` });

    } catch (e: any) {
        console.error('API Error updating SKU:', e.message);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
